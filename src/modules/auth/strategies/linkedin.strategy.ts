/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OpenIDStrategy } from 'passport-openidconnect';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '@app-types/oauth-profile.interface';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(
  OpenIDStrategy,
  'linkedin',
) {
  private readonly logger = new Logger(LinkedInStrategy.name);

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackURL = configService.get<string>('LINKEDIN_CALLBACK_URL');

    // 🔍 DEBUG: Логируем конфиг (ВРЕМЕННО!)
    console.log('🔑 LinkedIn Config:', {
      clientID: clientID ? `${clientID.slice(0, 5)}...` : 'MISSING',
      clientSecret: clientSecret ? 'SET' : 'MISSING',
      callbackURL,
    });

    super({
      issuer: 'https://www.linkedin.com/oauth',
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoURL: 'https://api.linkedin.com/v2/userinfo',
      clientID: clientID || '',
      clientSecret: clientSecret || '',
      callbackURL: callbackURL || '',
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: false,
      store: false,
      state: false, // ← ИЗМЕНИЛИ: Временно отключили state verification
    } as Record<string, unknown>);
  }

  async validate(
    _issuer: string,
    profile: Record<string, unknown>,
  ): Promise<OAuthProfile> {
    // 🔍 DEBUG: Логируем полученный профиль
    this.logger.debug(
      'LinkedIn profile received:',
      JSON.stringify(profile, null, 2),
    );

    await Promise.resolve();

    const id = (profile.id || profile.sub) as string;
    const emails = profile.emails as Array<{ value: string }> | undefined;
    const name = profile.name as
      | { givenName?: string; familyName?: string }
      | undefined;

    // 🔍 DEBUG: Логируем извлеченные данные
    this.logger.debug('Extracted data:', {
      id,
      email: emails?.[0]?.value,
      name,
    });

    if (!id) {
      this.logger.error('LinkedIn profile missing id!');
      throw new Error('LinkedIn profile missing id');
    }

    const result: OAuthProfile = {
      provider: 'linkedin' as const,
      providerId: id,
      email: emails?.[0]?.value || `${id}@linkedin.com`,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      picture: (profile.picture as string) || null,
    };

    this.logger.debug('Returning OAuthProfile:', result);
    return result;
  }
}
