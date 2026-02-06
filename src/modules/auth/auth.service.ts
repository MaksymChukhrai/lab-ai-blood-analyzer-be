import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from './entities/user.entity';
import { MagicLinkTokenEntity } from './entities/magic-link-token.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { OAuthProfile } from '@app-types/oauth-profile.interface';
import { JwtPayload } from '@app-types/jwt-payload.interface';
import { EmailService } from '@common/services/email.service';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(MagicLinkTokenEntity)
    private readonly tokenRepository: Repository<MagicLinkTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async handleOAuthLogin(profile: OAuthProfile): Promise<AuthResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let user = await queryRunner.manager.findOne(UserEntity, {
        where: { email: profile.email },
      });

      if (!user) {
        user = queryRunner.manager.create(UserEntity, {
          ...profile,
        });
        this.logger.log(
          `New user created via ${profile.provider}: ${profile.email}`,
        );
      } else {
        user.provider = profile.provider;
        user.providerId = profile.providerId;
        user.firstName = profile.firstName || user.firstName;
        user.lastName = profile.lastName || user.lastName;
        user.picture = profile.picture || user.picture;

        this.logger.log(
          `Existing user logged in via ${profile.provider}: ${profile.email} (previous provider: ${user.provider})`,
        );
      }

      const tokens = this.generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.configService.getOrThrow<number>(
          'JWT_EXPIRES_IN_SECONDS',
        ),
        user: new UserResponseDto(user),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `OAuth login failed for ${profile.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async requestMagicLink(email: string): Promise<void> {
    try {
      const token = uuidv4();
      const expirySeconds = this.configService.get<number>(
        'MAGIC_LINK_EXPIRY_SECONDS',
        900,
      );
      const expiresAt = Date.now() + expirySeconds * 1000;

      let user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        user = this.userRepository.create({
          email,
          provider: 'magic_link',
        });
        await this.userRepository.save(user);
      }

      await this.tokenRepository.delete({
        user: { id: user.id },
        expiresAt: LessThan(Date.now()),
      });

      const magicLinkToken = this.tokenRepository.create({
        token,
        user,
        expiresAt,
      });

      await this.tokenRepository.save(magicLinkToken);

      const backendUrl = this.configService.getOrThrow<string>('BACKEND_URL');
      const magicLink = `${backendUrl}/auth/magic-link/consume?token=${token}`;
      const emailFrom =
        this.configService.get<string>('RESEND_FROM') ||
        'onboarding@resend.dev';

      await this.emailService.sendMagicLink({
        to: email,
        from: emailFrom,
        link: magicLink,
        expiresInSeconds: expirySeconds,
      });

      this.logger.log(`Magic link sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send magic link: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to send magic link');
    }
  }

  async consumeMagicLink(token: string): Promise<AuthResponseDto> {
    const magicLinkToken = await this.tokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!magicLinkToken) {
      throw new UnauthorizedException('Invalid magic link token');
    }

    if (magicLinkToken.expiresAt < Date.now()) {
      throw new UnauthorizedException('Magic link token expired');
    }

    const user = magicLinkToken.user;
    const tokens = this.generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    await this.tokenRepository.delete({ id: magicLinkToken.id });

    const expiresIn = this.configService.getOrThrow<number>(
      'JWT_EXPIRES_IN_SECONDS',
    );

    this.logger.log(`User ${user.email} logged in via magic link`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn,
      user: new UserResponseDto(user),
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = this.generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      await this.userRepository.save(user);

      this.logger.log(`Tokens refreshed for user ${user.email}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      this.logger.error(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(UserEntity, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.refreshToken = null;
      await queryRunner.manager.save(user);

      const deleteResult = await queryRunner.manager.delete(
        MagicLinkTokenEntity,
        {
          user: { id: userId },
        },
      );

      await queryRunner.commitTransaction();

      const tokensDeleted =
        typeof deleteResult.affected === 'number' ? deleteResult.affected : 0;

      this.logger.log(
        `User ${userId} (${user.email}) logged out successfully. Deleted ${tokensDeleted} magic link token(s).`,
      );

      return { message: 'Logged out successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Logout failed for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private generateTokens(user: UserEntity): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<number>(
        'JWT_EXPIRES_IN_SECONDS',
      ),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow<number>(
        'JWT_REFRESH_EXPIRES_IN_SECONDS',
      ),
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
