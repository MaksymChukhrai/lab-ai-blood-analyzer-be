import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Get,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ResponseMagicLinkDto } from './dto/response-magic-link.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserResponseDto } from './dto/user-response.dto';

import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('magic-link/request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a magic link' })
  @ApiOkResponse({
    description: 'Magic link was successfully sent',
    type: ResponseMagicLinkDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid email' })
  public async requestMagicLink(
    @Body() dto: RequestMagicLinkDto,
  ): Promise<ResponseMagicLinkDto> {
    // TODO: Fix after resolving AuthService conflicts
    await this.authService.requestMagicLink(dto.email);
    return { success: true };
  }

  @Public()
  @Get('magic-link/consume')
  @ApiOperation({ summary: 'Consume magic link token and get JWT' })
  @ApiOkResponse({
    description: 'Auth response (token + user)',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  public async consumeMagicLink(
    @Query('token') token: string,
  ): Promise<AuthResponseDto> {
    // TODO: Fix after resolving AuthService conflicts
    return await this.authService.consumeMagicLink(token);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  async logout(@CurrentUser() user: UserEntity): Promise<{ message: string }> {
    return this.authService.logout(user.id);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: UserEntity): UserResponseDto {
    return new UserResponseDto(user);
  }
}
