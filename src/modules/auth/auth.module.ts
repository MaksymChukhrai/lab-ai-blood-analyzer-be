import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from '@modules/auth/auth.service';
import { AuthController } from '@modules/auth/auth.controller';
import { UserEntity } from '@modules/auth/entities/user.entity';
import { MagicLinkTokenEntity } from '@modules/auth/entities/magic-link-token.entity';
import { GoogleStrategy } from '@modules/auth/strategies/google.strategy';
import { LinkedInStrategy } from '@modules/auth/strategies/linkedin.strategy';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@modules/auth/strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { EmailService } from '@common/services/email.service';

/**
 * Authentication Module
 * Provides JWT-based authentication infrastructure for the application
 *
 * Features:
 * - JWT access and refresh token management
 * - Magic Link passwordless authentication
 * - OAuth (Google, LinkedIn)
 * - Global authentication guard with @Public() decorator support
 * - Passport strategies for token validation
 * - User entity and TypeORM integration
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, MagicLinkTokenEntity]),
    PassportModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    GoogleStrategy,
    LinkedInStrategy,
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
