/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
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
  constructor(configService: ConfigService) {
    super({
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientID: configService.get<string>('LINKEDIN_CLIENT_ID'),
      clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET'),
      callbackURL: configService.get<string>('LINKEDIN_CALLBACK_URL'),
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
    try {
      // 🔍 Запрашиваем профиль LinkedIn через fetch
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      const profile = (await response.json()) as LinkedInProfile;
      console.log('✅ LinkedIn profile fetched:', profile);

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
      console.error('❌ LinkedIn profile fetch failed:', error);

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
