import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '@app-types/jwt-payload.interface';
import { UserEntity } from '../entities/user.entity';

/**
 * JWT Access Token Strategy
 * Validates access tokens and attaches user info to request
 * Used by ALL authenticated routes
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validate JWT payload and return user object
   * This user object will be attached to request as req.user
   *
   * @param payload - Decoded JWT payload
   * @returns User entity from database
   */
  async validate(payload: JwtPayload): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
