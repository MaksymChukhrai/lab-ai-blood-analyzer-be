import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EmailService } from '@common/services/email.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from './entities/user.entity';
import { MagicLinkTokenEntity } from './entities/magic-link-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Authentication Module
 * Provides JWT-based authentication infrastructure for the application
 *
 * Features:
 * - JWT access and refresh token management
 * - Magic Link passwordless authentication
 * - Global authentication guard with @Public() decorator support
 * - Passport strategies for token validation
 * - User entity and TypeORM integration
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, MagicLinkTokenEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN_SECONDS'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    JwtStrategy,
    JwtRefreshStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
