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

/**
 * Типизация для OAuth2 клиента из passport-oauth2
 */
interface OAuth2Client {
  getOAuthAccessToken: GetOAuthAccessTokenFunction;
}

/**
 * Типизация для функции получения access token
 */
type GetOAuthAccessTokenFunction = (
  code: string,
  params: Record<string, unknown>,
  callback: OAuth2Callback,
) => void;

/**
 * Типизация для callback OAuth2
 */
type OAuth2Callback = (
  err: OAuth2Error | null,
  accessToken?: string,
  refreshToken?: string,
  results?: unknown,
) => void;

/**
 * Типизация для ошибок OAuth2
 */
interface OAuth2Error {
  message: string;
  data?: string;
  statusCode?: number;
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
      customHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // 🔍 ДИАГНОСТИКА: Monkey-patch для логирования OAuth2 token exchange
    this.setupTokenExchangeLogging();
  }

  /**
   * Настройка логирования token exchange
   */
  private setupTokenExchangeLogging(): void {
    try {
      // Используем Reflect для безопасного доступа к protected полю
      const oauth2Client = Reflect.get(this, '_oauth2') as
        | OAuth2Client
        | undefined;

      if (!oauth2Client?.getOAuthAccessToken) {
        console.warn(
          '⚠️ Cannot enable token exchange logging - _oauth2 not found',
        );
        return;
      }

      // Сохраняем оригинальную функцию с правильной типизацией
      const originalFunction: GetOAuthAccessTokenFunction =
        oauth2Client.getOAuthAccessToken;

      // Создаём wrapper функцию
      const wrappedFunction: GetOAuthAccessTokenFunction = (
        code: string,
        params: Record<string, unknown>,
        callback: OAuth2Callback,
      ): void => {
        console.log('🔍 ========== TOKEN EXCHANGE STARTED ==========');
        console.log(
          '🔍 Authorization code:',
          code ? `${code.slice(0, 15)}...` : 'MISSING',
        );
        console.log('🔍 Exchange params:', JSON.stringify(params, null, 2));
        console.log(
          '🔍 Token URL:',
          'https://www.linkedin.com/oauth/v2/accessToken',
        );

        // Вызываем оригинальную функцию с правильным контекстом
        originalFunction.call(
          oauth2Client,
          code,
          params,
          (
            err: OAuth2Error | null,
            accessToken?: string,
            refreshToken?: string,
            results?: unknown,
          ) => {
            if (err) {
              console.error('❌ ========== TOKEN EXCHANGE FAILED ==========');
              console.error('❌ Error object:', err);
              console.error('❌ Error message:', err.message || 'Unknown');
              console.error('❌ Error data:', err.data || 'None');
              console.error('❌ Status code:', err.statusCode || 'None');
            } else {
              console.log('✅ ========== TOKEN EXCHANGE SUCCESS ==========');
              console.log(
                '✅ Access token received:',
                accessToken ? 'YES' : 'NO',
              );
              console.log('✅ Token length:', accessToken?.length || 0);
              console.log('✅ Refresh token:', refreshToken ? 'YES' : 'NO');
              console.log('✅ Results:', results);
            }

            callback(err, accessToken, refreshToken, results);
          },
        );
      };

      // Заменяем метод на wrapper
      oauth2Client.getOAuthAccessToken = wrappedFunction;

      console.log('✅ Token exchange logging enabled');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to setup token exchange logging:', errorMessage);
    }
  }

  /**
   * 🔍 ЛОГИРОВАНИЕ TOKEN EXCHANGE
   * Этот метод вызывается passport-oauth2 ПОСЛЕ получения access_token
   */
  userProfile(
    accessToken: string,
    done: (err?: Error | null, profile?: unknown) => void,
  ): void {
    console.log('🔍 ========== userProfile() CALLED ==========');
    console.log('🔍 Access token received:', accessToken ? 'YES' : 'NO');
    console.log('🔍 Token length:', accessToken ? accessToken.length : 'N/A');
    console.log(
      '🔍 Token preview:',
      accessToken ? `${accessToken.slice(0, 20)}...` : 'N/A',
    );

    // Вызываем callback - validate() сделает реальный запрос
    done(null, { accessToken });
  }

  /**
   * 🎯 ОСНОВНОЙ МЕТОД АУТЕНТИФИКАЦИИ
   */
  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: unknown,
    done: VerifyCallback,
  ): Promise<void> {
    this.logger.log('🔍 ========== LinkedIn validate() CALLED ==========');
    this.logger.log(
      `🔍 Access token: ${accessToken ? accessToken.slice(0, 10) + '...' : 'MISSING'}`,
    );
    this.logger.log(`🔍 Profile from userProfile():`, profile);

    try {
      // 📡 Запрашиваем профиль LinkedIn
      this.logger.log('🔍 Fetching LinkedIn profile from API...');
      this.logger.log('🔍 API URL: https://api.linkedin.com/v2/userinfo');

      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`🔍 LinkedIn API response status: ${response.status}`);
      this.logger.log(
        `🔍 LinkedIn API response headers:`,
        Object.fromEntries(response.headers.entries()),
      );

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

      // 🎭 Преобразуем в наш формат
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
      this.logger.error(
        '❌ ========== LinkedIn profile fetch FAILED ==========',
      );

      if (error instanceof Error) {
        this.logger.error('❌ Error message:', error.message);
        this.logger.error('❌ Error stack:', error.stack);
        done(error, undefined);
      } else {
        this.logger.error('❌ Unknown error type:', typeof error);
        done(
          new Error('Unknown error during LinkedIn authentication'),
          undefined,
        );
      }
    }
  }
}
