import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Get,
  Res,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { AuthService } from './auth.service';
import { OAuthProfile } from '@app-types/oauth-profile.interface';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ResponseMagicLinkDto } from './dto/response-magic-link.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { LinkedInOAuthGuard } from './guards/linkedin-oauth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  public constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
    return await this.authService.consumeMagicLink(token);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to Google authorization page',
  })
  public async googleAuth(): Promise<void> {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to frontend with tokens',
  })
  public async googleAuthCallback(
    @CurrentUser() profile: OAuthProfile,
    @Res() res: Response,
  ): Promise<void> {
    const authResponse = await this.authService.handleOAuthLogin(profile);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?access_token=${authResponse.accessToken}&refresh_token=${authResponse.refreshToken}`;

    res.redirect(redirectUrl);
  }
  // ============================================Linkedin OAuth============================================
  @Public()
  @Get('linkedin/callback')
  @UseGuards(LinkedInOAuthGuard)
  @ApiOperation({ summary: 'LinkedIn OAuth callback' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to frontend with tokens',
  })
  public async linkedinAuthCallback(
    @CurrentUser() profile: OAuthProfile,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // 🔍 DEBUG: Логируем полученный профиль
      this.logger.debug('LinkedIn callback - received profile:', profile);

      const authResponse = await this.authService.handleOAuthLogin(profile);

      // 🔍 DEBUG: Логируем успешную генерацию токенов
      this.logger.debug('LinkedIn callback - tokens generated successfully');

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const redirectUrl = `${frontendUrl}/auth/callback?access_token=${authResponse.accessToken}&refresh_token=${authResponse.refreshToken}`;

      this.logger.debug('LinkedIn callback - redirecting to:', frontendUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      // 🔍 DEBUG: Логируем ошибку
      this.logger.error('LinkedIn callback error:', error);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorRedirectUrl = `${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`;

      res.redirect(errorRedirectUrl);
    }
  }

  // -------------------------------------------------end of LinkedIn OAuth-------------------------------------------------

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({
    description: 'New access and refresh tokens',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiOkResponse({
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: UserEntity,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const result = await this.authService.logout(user.id);

    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          this.logger.error(
            `Session destroy failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        } else {
          this.logger.log('Session destroyed successfully');
        }
      });
    }

    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
    });

    this.logger.log(
      `User ${user.id} (${user.email}) logged out, connect.sid cleared`,
    );

    return result;
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getProfile(@CurrentUser() user: UserEntity): UserResponseDto {
    return new UserResponseDto(user);
  }
}
