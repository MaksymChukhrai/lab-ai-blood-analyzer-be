/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OpenIDStrategy } from 'passport-openidconnect';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '@app-types/oauth-profile.interface';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(
  OpenIDStrategy,
  'linkedin',
) {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackURL = configService.get<string>('LINKEDIN_CALLBACK_URL');

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
      state: true,
    } as Record<string, unknown>);
  }

  validate(_issuer: string, profile: Record<string, unknown>): OAuthProfile {
    const id = (profile.id || profile.sub) as string;
    const emails = profile.emails as Array<{ value: string }> | undefined;
    const name = profile.name as
      | { givenName?: string; familyName?: string }
      | undefined;

    if (!id) {
      throw new Error('LinkedIn profile missing id');
    }

    return {
      provider: 'linkedin',
      providerId: id,
      email: emails?.[0]?.value || `${id}@linkedin.com`,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      picture: (profile.picture as string) || null,
    };
  }
}
