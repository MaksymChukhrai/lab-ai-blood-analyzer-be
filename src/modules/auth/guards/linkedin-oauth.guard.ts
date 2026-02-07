import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

interface SessionData {
  oauth2?: {
    state?: string;
  };
}

interface RequestWithSession extends Request {
  session: Request['session'] & SessionData;
}

@Injectable()
export class LinkedInOAuthGuard extends AuthGuard('linkedin') {
  private readonly logger = new Logger(LinkedInOAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();

    this.logger.log('🔍 LinkedIn Guard activated');
    this.logger.debug(`URL: ${request.url}`);
    this.logger.debug(`Method: ${request.method}`);
    this.logger.debug(`Session ID: ${request.sessionID || 'MISSING'}`);

    if (request.session) {
      const sessionState = request.session.oauth2?.state;
      const queryState = this.extractQueryState(request.query.state as unknown);

      if (queryState && sessionState) {
        if (queryState === sessionState) {
          this.logger.debug('✅ State verification: MATCH');
        } else {
          this.logger.error('❌ State verification: MISMATCH');
          this.logger.error(
            `Expected: ${sessionState}, Received: ${queryState}`,
          );
        }
      }
    } else {
      this.logger.error('❌ No session object found');
    }

    try {
      const result = (await super.canActivate(context)) as boolean;
      this.logger.log('✅ Guard activation SUCCESS');
      return result;
    } catch (err) {
      this.logger.error('❌ LinkedIn Guard FAILED');

      if (err instanceof Error) {
        this.logger.error(`Error: ${err.message}`);

        if (err.message.includes('verify authorization request state')) {
          this.logger.error('CSRF State Mismatch Details:');
          this.logger.error(
            `Session state: ${request.session?.oauth2?.state || 'MISSING'}`,
          );
          const queryState = this.extractQueryState(
            request.query.state as unknown,
          );
          this.logger.error(`Query state: ${queryState || 'MISSING'}`);
        }
      }

      throw err;
    }
  }

  private extractQueryState(stateParam: unknown): string | null {
    if (!stateParam) return null;

    if (typeof stateParam === 'string') {
      return stateParam;
    }

    if (Array.isArray(stateParam)) {
      const firstItem: unknown = stateParam.length > 0 ? stateParam[0] : null;
      if (!firstItem) return null;
      if (typeof firstItem === 'string') return firstItem;
      return this.extractQueryState(firstItem);
    }

    if (typeof stateParam === 'object' && stateParam !== null) {
      const obj = stateParam as Record<string, unknown>;

      if ('state' in obj && obj.state !== undefined) {
        return this.extractQueryState(obj.state);
      }

      const values = Object.values(obj);
      for (const value of values) {
        const extracted = this.extractQueryState(value);
        if (extracted) return extracted;
      }
    }

    return null;
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();

    this.logger.debug('handleRequest called');
    this.logger.debug(`URL: ${request.url}`);

    if (err) {
      this.logger.error(`❌ Authentication error: ${err.message}`);
      throw err;
    }

    if (!user) {
      const errorMessage = info?.message || 'LinkedIn authentication failed';
      this.logger.error('❌ No user returned from strategy');
      throw new UnauthorizedException(errorMessage);
    }

    this.logger.log('✅ User authenticated');
    return user;
  }
}
