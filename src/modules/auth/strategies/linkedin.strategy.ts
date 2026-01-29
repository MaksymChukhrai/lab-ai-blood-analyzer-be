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

    // Логируем конфигурацию
    console.log('🔑 LinkedIn Strategy Config:', {
      clientID: clientID ? `${clientID.slice(0, 5)}...` : 'MISSING',
      clientSecret: clientSecret ? 'SET' : 'MISSING',
      callbackURL,
      callbackURLLength: callbackURL?.length,
    });

    super({
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientID: clientID || '',
      clientSecret: clientSecret || '',
      callbackURL: callbackURL || '',
      scope: ['openid', 'profile', 'email'],
      state: true,
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    _profile: unknown,
    done: VerifyCallback,
  ): Promise<void> {
    this.logger.log('🔍 LinkedIn validate called');
    this.logger.log(
      `🔍 Access token: ${accessToken ? accessToken.slice(0, 10) + '...' : 'MISSING'}`,
    );

    try {
      // Запрашиваем профиль LinkedIn
      this.logger.log('🔍 Fetching LinkedIn profile...');

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
          body: errorText,
        });
        throw new Error(
          `LinkedIn API error: ${response.status} - ${errorText}`,
        );
      }

      const profile = (await response.json()) as LinkedInProfile;
      this.logger.log('✅ LinkedIn profile fetched:', {
        sub: profile.sub,
        email: profile.email,
      });

      const user: OAuthProfile = {
        provider: 'linkedin' as const,
        providerId: profile.sub,
        email: profile.email || `${profile.sub}@linkedin.com`,
        firstName: profile.given_name || '',
        lastName: profile.family_name || '',
        picture: profile.picture || null,
      };

      done(null, user);
    } catch (error: unknown) {
      this.logger.error('❌ LinkedIn profile fetch failed');

      if (error instanceof Error) {
        this.logger.error('Error message:', error.message);
        this.logger.error('Error stack:', error.stack);
      } else {
        this.logger.error('Unknown error type:', typeof error);
      }

      if (error instanceof Error) {
        done(error, undefined);
      } else {
        done(
          new Error('Unknown error during LinkedIn authentication'),
          undefined,
        );
      }
    }
  }
}
