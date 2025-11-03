import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from '../entities/user.entity';

/**
 * Decorator to get current authenticated user from request
 * Used in protected routes to access user data
 *
 * @example
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@CurrentUser() user: UserEntity) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthorizedException('User not found in request');
    }

    return request.user;
  },
);
