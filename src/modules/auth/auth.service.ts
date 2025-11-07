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
        where: [
          { email: profile.email, provider: profile.provider },
          { providerId: profile.providerId, provider: profile.provider },
        ],
      });

      if (!user) {
        user = queryRunner.manager.create(UserEntity, {
          ...profile,
        });
      } else {
        user.firstName = profile.firstName || user.firstName;
        user.lastName = profile.lastName || user.lastName;
        user.picture = profile.picture || user.picture;
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
      const emailFrom = this.configService.getOrThrow<string>('EMAIL_FROM');

      await this.emailService.sendMagicLink({
        to: email,
        from: emailFrom,
        link: magicLink,
        expiresInSeconds: expirySeconds,
      });
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.refreshToken = null;
    await this.userRepository.save(user);

    return { message: 'Logged out successfully' };
  }

  private generateTokens(user: UserEntity): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JwtPayload = {
      sub: user.id,
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
