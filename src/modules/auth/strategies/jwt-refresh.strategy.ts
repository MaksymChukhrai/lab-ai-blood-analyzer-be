import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import type { JwtPayload } from '@app-types/jwt-payload.interface';
import { UserEntity } from '../entities/user.entity';

/**
 * Request body for refresh token endpoint
 */
interface RefreshTokenRequest extends Request {
  body: {
    refreshToken: string;
  };
}

/**
 * JWT Refresh Token Strategy
 * Validates refresh tokens for token renewal
 * Used by /auth/refresh endpoint
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Validate JWT refresh token payload
   * Called automatically by Passport after token verification
   *
   * @param req - Express request object
   * @param payload - Decoded JWT payload
   * @returns User entity from database
   */
  async validate(
    req: RefreshTokenRequest,
    payload: JwtPayload,
  ): Promise<UserEntity> {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return user;
  }
}
