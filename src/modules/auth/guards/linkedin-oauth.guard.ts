// src/modules/auth/guards/linkedin-oauth.guard.ts

import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

/**
 * 🔐 Расширенный тип сессии для OAuth2 state
 */
interface OAuth2StateData {
  state?: string;
}

interface SessionWithOAuth2 {
  oauth2?: OAuth2StateData;
  [key: string]: unknown;
}

/**
 * 🔐 Типизация для Passport info object
 */
interface PassportInfo {
  message?: string;
  [key: string]: unknown;
}

@Injectable()
export class LinkedInOAuthGuard extends AuthGuard('linkedin') {
  private readonly logger = new Logger(LinkedInOAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    this.logger.log('🔍 ========== LinkedIn Guard ACTIVATED ==========');
    this.logger.log(`🔍 URL: ${request.url}`);
    this.logger.log(`🔍 Method: ${request.method}`);
    this.logger.log(`🔍 Query params:`, request.query);
    this.logger.log(`🔍 Session ID:`, request.sessionID);

    // 🔍 Безопасное получение session data
    const sessionData = request.session as unknown as
      | SessionWithOAuth2
      | undefined;

    this.logger.log(
      `🔍 Session OAuth2 state:`,
      sessionData?.oauth2?.state || 'NO STATE',
    );
    this.logger.log(
      `🔍 Query state:`,
      (request.query.state as string) || 'NO STATE',
    );

    // 🔍 Проверка совпадения state
    if (request.query.state && sessionData?.oauth2?.state) {
      const stateMatch = request.query.state === sessionData.oauth2.state;
      this.logger.log(`🔍 State match: ${stateMatch ? '✅ YES' : '❌ NO'}`);
    } else {
      this.logger.warn('⚠️ State verification skipped (missing state)');
    }

    try {
      const result = (await super.canActivate(context)) as boolean;
      this.logger.log('✅ Guard activation SUCCESS');
      return result;
    } catch (err) {
      this.logger.error('❌ ========== LinkedIn Guard FAILED ==========');

      if (err instanceof Error) {
        this.logger.error('❌ Error name:', err.name);
        this.logger.error('❌ Error message:', err.message);
        this.logger.error('❌ Error stack:', err.stack);
      } else {
        this.logger.error('❌ Unknown error:', err);
      }

      throw err;
    }
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();
    const passportInfo = info as PassportInfo | undefined;

    this.logger.log('🔍 ========== Guard handleRequest CALLED ==========');
    this.logger.log('🔍 Error:', err);
    this.logger.log('🔍 User:', user);
    this.logger.log('🔍 Info:', passportInfo);
    this.logger.log('🔍 Request URL:', request.url);

    if (err) {
      this.logger.error('❌ Authentication error:', err.message);
      throw err;
    }

    if (!user) {
      this.logger.error('❌ No user returned from strategy');
      const errorMessage =
        passportInfo?.message || 'LinkedIn authentication failed';
      throw new UnauthorizedException(errorMessage);
    }

    this.logger.log('✅ User authenticated successfully');
    return user;
  }
}
