// src/modules/auth/strategies/linkedin.strategy.ts

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '@app-types/oauth-profile.interface';

interface LinkedInProfile {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale?: { country: string; language: string };
  email: string;
  email_verified: boolean;
}

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  private readonly logger = new Logger(LinkedInStrategy.name);

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackURL = configService.get<string>('LINKEDIN_CALLBACK_URL');

    // 📊 Логируем конфигурацию
    console.log('🔑 LinkedIn Strategy Config:', {
      clientID: clientID ? `${clientID.slice(0, 5)}...` : 'MISSING',
      clientSecret: clientSecret ? 'SET' : 'MISSING',
      callbackURL,
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      scope: ['openid', 'profile', 'email'],
    });

    super({
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientID: clientID || '',
      clientSecret: clientSecret || '',
      callbackURL: callbackURL || '',
      scope: ['openid', 'profile', 'email'],
      state: true,
      // 🔍 КРИТИЧЕСКИ ВАЖНО: customHeaders для LinkedIn OpenID
      customHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * 🔍 ЛОГИРОВАНИЕ TOKEN EXCHANGE
   * Этот метод вызывается passport-oauth2 ПОСЛЕ получения access_token
   * Если он не вызывается - значит token exchange провалился
   */
  userProfile(
    accessToken: string,
    done: (err?: Error | null, profile?: any) => void,
  ): void {
    console.log('🔍 userProfile() called - Token exchange SUCCESS!');
    console.log('🔍 Access token received:', accessToken ? 'YES' : 'NO');
    console.log('🔍 Token length:', accessToken ? accessToken.length : 'N/A');

    // Вызываем callback сразу - validate() сделает реальный запрос
    done(null, { accessToken });
  }

  /**
   * 🎯 ОСНОВНОЙ МЕТОД АУТЕНТИФИКАЦИИ
   * Вызывается Passport после userProfile()
   */
  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    this.logger.log('🔍 LinkedIn validate() called');
    this.logger.log(
      `🔍 Access token: ${accessToken ? accessToken.slice(0, 10) + '...' : 'MISSING'}`,
    );
    this.logger.log(`🔍 Profile from userProfile():`, profile);

    try {
      // 📡 Запрашиваем профиль LinkedIn
      this.logger.log('🔍 Fetching LinkedIn profile from API...');

      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`🔍 LinkedIn API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('❌ LinkedIn API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `LinkedIn API error: ${response.status} - ${errorText}`,
        );
      }

      const linkedInProfile = (await response.json()) as LinkedInProfile;
      this.logger.log('✅ LinkedIn profile fetched:', {
        sub: linkedInProfile.sub,
        email: linkedInProfile.email,
        name: linkedInProfile.name,
      });

      // 🎭 Преобразуем в наш формат OAuthProfile
      const user: OAuthProfile = {
        provider: 'linkedin' as const,
        providerId: linkedInProfile.sub,
        email: linkedInProfile.email || `${linkedInProfile.sub}@linkedin.com`,
        firstName: linkedInProfile.given_name || '',
        lastName: linkedInProfile.family_name || '',
        picture: linkedInProfile.picture || null,
      };

      this.logger.log('✅ User object created:', {
        provider: user.provider,
        email: user.email,
      });

      done(null, user);
    } catch (error: unknown) {
      this.logger.error('❌ LinkedIn profile fetch failed');

      if (error instanceof Error) {
        this.logger.error('Error message:', error.message);
        this.logger.error('Error stack:', error.stack);
        done(error, undefined);
      } else {
        this.logger.error('Unknown error type:', typeof error);
        done(
          new Error('Unknown error during LinkedIn authentication'),
          undefined,
        );
      }
    }
  }
}
