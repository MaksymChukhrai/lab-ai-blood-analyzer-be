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
 * Типизация для Session с OAuth2 state
 */
interface SessionData {
  oauth2?: {
    state?: string;
  };
}

/**
 * Расширенный тип Request с типизированной сессией
 */
interface RequestWithSession extends Request {
  session: Request['session'] & SessionData;
}

@Injectable()
export class LinkedInOAuthGuard extends AuthGuard('linkedin') {
  private readonly logger = new Logger(LinkedInOAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();

    this.logger.log('🔍 ========== LinkedIn Guard ACTIVATED ==========');
    this.logger.log(`🔍 URL: ${request.url}`);
    this.logger.log(`🔍 Method: ${request.method}`);
    this.logger.log(`🔍 Query params:`, request.query);
    this.logger.log(`🔍 Session ID: ${request.sessionID || 'MISSING'}`);
    this.logger.log(
      `🔍 Session has oauth2: ${!request.session?.oauth2 ? 'YES' : 'NO'}`,
    );

    // 🔍 Детальное логирование сессии
    if (request.session) {
      this.logger.log('🔍 Session cookie:', request.session.cookie);

      const sessionState = request.session.oauth2?.state;
      this.logger.log(`🔍 Session OAuth2 state: ${sessionState || 'NO STATE'}`);

      // Используем unknown для безопасного извлечения
      const queryState = this.extractQueryState(request.query.state as unknown);
      this.logger.log(`🔍 Query state: ${queryState || 'NO STATE'}`);

      // Проверяем совпадение state
      if (queryState && sessionState) {
        if (queryState === sessionState) {
          this.logger.log('✅ State verification: MATCH');
        } else {
          this.logger.error('❌ State verification: MISMATCH');
          this.logger.error(`Expected: ${sessionState}`);
          this.logger.error(`Received: ${queryState}`);
        }
      } else if (queryState || sessionState) {
        this.logger.warn('⚠️ State verification skipped (missing state)');
      }
    } else {
      this.logger.error('❌ No session object found!');
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

        // 🔍 Специальная обработка ошибки state verification
        if (err.message.includes('verify authorization request state')) {
          this.logger.error('❌ CSRF State Mismatch Details:');
          this.logger.error(
            `Session ID at /linkedin: ${request.sessionID || 'MISSING'}`,
          );
          this.logger.error(
            `Session state: ${request.session?.oauth2?.state || 'MISSING'}`,
          );

          const queryState = this.extractQueryState(
            request.query.state as unknown,
          );
          this.logger.error(`Query state: ${queryState || 'MISSING'}`);
        }
      } else {
        this.logger.error('❌ Unknown error:', err);
      }

      throw err;
    }
  }

  /**
   * Безопасное извлечение state из query параметров
   * Принимает unknown и выполняет runtime проверки типов
   */
  private extractQueryState(stateParam: unknown): string | null {
    // Проверяем что параметр существует
    if (!stateParam) {
      return null;
    }

    // Если это строка - возвращаем её
    if (typeof stateParam === 'string') {
      return stateParam;
    }

    // Если это массив - берём первый элемент
    if (Array.isArray(stateParam)) {
      // Безопасно извлекаем первый элемент
      const firstItem: unknown = stateParam.length > 0 ? stateParam[0] : null;

      if (!firstItem) {
        return null;
      }

      // Если первый элемент - строка
      if (typeof firstItem === 'string') {
        return firstItem;
      }

      // Рекурсивно обрабатываем вложенные структуры (ParsedQs)
      return this.extractQueryState(firstItem);
    }

    // Если это объект (ParsedQs) - пытаемся извлечь значение
    if (typeof stateParam === 'object' && stateParam !== null) {
      // ParsedQs может быть { state: string } или подобным
      const obj = stateParam as Record<string, unknown>;

      // Проверяем наличие свойства 'state'
      if ('state' in obj && obj.state !== undefined) {
        return this.extractQueryState(obj.state);
      }

      // Пытаемся найти первое строковое значение в объекте
      const values = Object.values(obj);
      for (const value of values) {
        const extracted = this.extractQueryState(value);
        if (extracted) {
          return extracted;
        }
      }
    }

    // Не удалось извлечь строку
    return null;
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();

    this.logger.log('🔍 ========== Guard handleRequest CALLED ==========');
    this.logger.log('🔍 Error:', err);
    this.logger.log('🔍 User:', user);
    this.logger.log('🔍 Info:', info);
    this.logger.log('🔍 Request URL:', request.url);

    if (err) {
      this.logger.error('❌ Authentication error:', err.message);
      throw err;
    }

    if (!user) {
      const errorMessage = info?.message || 'LinkedIn authentication failed';
      this.logger.error('❌ No user returned from strategy');
      throw new UnauthorizedException(errorMessage);
    }

    this.logger.log('✅ User authenticated:', user);
    return user;
  }
}
