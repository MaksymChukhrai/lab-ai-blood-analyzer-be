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
import { EmailService } from '@common/services/email.service';

/**
 * 🧪 Результат теста connectivity
 */
interface ConnectivityTestResult {
  name: string;
  status: 'OK' | 'FAIL' | 'ERROR';
  code?: number;
  error?: string;
  duration?: number;
}

/**
 * 🧪 Полный результат connectivity проверки
 */
interface ConnectivityResponse {
  timestamp: string;
  region: string;
  railway_service: string;
  tests: ConnectivityTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  public constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================ Magic Link ============================================

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
  @ApiOperation({
    summary: 'Consume magic link token and redirect to frontend',
  })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to frontend with tokens',
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  public async consumeMagicLink(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const authResponse = await this.authService.consumeMagicLink(token);

      // Редирект на фронтенд (как в Google/LinkedIn)
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const redirectUrl = `${frontendUrl}/auth/callback?access_token=${authResponse.accessToken}&refresh_token=${authResponse.refreshToken}`;

      this.logger.log(
        `Magic link consumed for ${authResponse.user.email}, redirecting to frontend`,
      );
      res.redirect(redirectUrl);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Magic link consumption failed: ${err.message}`);

      // Редирект на страницу ошибки
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const errorRedirectUrl = `${frontendUrl}/auth/error?message=${encodeURIComponent(err.message)}`;

      res.redirect(errorRedirectUrl);
    }
  }

  // ============================================ Google OAuth ============================================

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

  // ============================================ LinkedIn OAuth ============================================

  @Public()
  @Get('linkedin')
  @UseGuards(LinkedInOAuthGuard)
  @ApiOperation({ summary: 'Initiate LinkedIn OAuth flow' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to LinkedIn authorization page',
  })
  public async linkedinAuth(): Promise<void> {
    // Passport автоматически обрабатывает редирект на LinkedIn
  }

  @Public()
  @Get('linkedin/callback')
  @UseGuards(LinkedInOAuthGuard)
  @ApiOperation({ summary: 'LinkedIn OAuth callback' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to frontend with tokens',
  })
  public async linkedinAuthCallback(
    @Req() req: Request,
    @CurrentUser() profile: OAuthProfile,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.logger.debug('LinkedIn callback - query params:');
      this.logger.debug(JSON.stringify(req.query));
      this.logger.debug('LinkedIn callback - received profile:');
      this.logger.debug(JSON.stringify(profile));

      const authResponse = await this.authService.handleOAuthLogin(profile);

      this.logger.debug('LinkedIn callback - tokens generated successfully');

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const redirectUrl = `${frontendUrl}/auth/callback?access_token=${authResponse.accessToken}&refresh_token=${authResponse.refreshToken}`;

      this.logger.debug('LinkedIn callback - redirecting to:');
      this.logger.debug(frontendUrl);
      res.redirect(redirectUrl);
    } catch (err: unknown) {
      this.logger.error('LinkedIn callback error occurred');

      if (err instanceof Error) {
        this.logger.error('Error message:');
        this.logger.error(err.message);
        if (err.stack) {
          this.logger.error('Error stack:');
          this.logger.error(err.stack);
        }
      } else {
        this.logger.error('Unknown error - type:');
        this.logger.error(typeof err);
      }

      this.logger.error('Request query:');
      this.logger.error(JSON.stringify(req.query));

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorRedirectUrl = `${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`;

      res.redirect(errorRedirectUrl);
    }
  }

  // ============================================ 🧪 Diagnostics ============================================

  @Public()
  @Get('test-linkedin-connectivity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🌐 Test LinkedIn API connectivity from Railway',
    description:
      'Checks if Railway server can reach LinkedIn OAuth and API endpoints. Used for debugging 401 errors.',
  })
  @ApiOkResponse({
    description: 'Connectivity test results',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', example: '2026-01-29T12:00:00.000Z' },
        region: { type: 'string', example: 'europe-west4' },
        railway_service: {
          type: 'string',
          example: 'lab-ai-blood-analyzer-be',
        },
        tests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['OK', 'FAIL', 'ERROR'] },
              code: { type: 'number' },
              error: { type: 'string' },
              duration: { type: 'number' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            passed: { type: 'number' },
            failed: { type: 'number' },
            errors: { type: 'number' },
          },
        },
      },
    },
  })
  public async testLinkedInConnectivity(): Promise<ConnectivityResponse> {
    const results: ConnectivityTestResult[] = [];
    const startTime = Date.now();

    this.logger.log('🧪 Starting LinkedIn connectivity tests...');

    // 1️⃣ Тест DNS резолва
    await this.testEndpoint(
      results,
      'LinkedIn DNS (robots.txt)',
      'https://www.linkedin.com/robots.txt',
      'GET',
      [200],
    );

    // 2️⃣ Тест OAuth Authorization Endpoint
    await this.testEndpoint(
      results,
      'OAuth Authorization Endpoint',
      'https://www.linkedin.com/oauth/v2/authorization',
      'GET',
      [400, 302], // 400 = missing params (expected), 302 = redirect
    );

    // 3️⃣ Тест OAuth Token Endpoint
    await this.testEndpoint(
      results,
      'OAuth Token Endpoint',
      'https://www.linkedin.com/oauth/v2/accessToken',
      'POST',
      [400], // 400 = missing params (expected)
      { 'Content-Type': 'application/x-www-form-urlencoded' },
    );

    // 4️⃣ Тест UserInfo API Endpoint
    await this.testEndpoint(
      results,
      'UserInfo API Endpoint',
      'https://api.linkedin.com/v2/userinfo',
      'GET',
      [401], // 401 = missing auth (expected)
    );

    // 5️⃣ Тест LinkedIn CDN (для проверки общей доступности)
    await this.testEndpoint(
      results,
      'LinkedIn CDN',
      'https://static.licdn.com/aero-v1/sc/h/cyolgscd0imw2ldqppkrb84vo',
      'GET',
      [200, 304], // 200 или 304 Not Modified
    );

    const totalTime = Date.now() - startTime;

    // 📊 Формируем summary
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.status === 'OK').length,
      failed: results.filter((r) => r.status === 'FAIL').length,
      errors: results.filter((r) => r.status === 'ERROR').length,
    };

    this.logger.log(
      `🧪 Connectivity tests completed in ${totalTime}ms: ${summary.passed}/${summary.total} passed`,
    );

    return {
      timestamp: new Date().toISOString(),
      region: process.env.RAILWAY_REGION || 'unknown',
      railway_service: process.env.RAILWAY_SERVICE_NAME || 'local',
      tests: results,
      summary,
    };
  }

  @Public()
  @Get('test-smtp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔧 Test email service',
    description: 'Diagnostic endpoint to test Resend email configuration',
  })
  @ApiOkResponse({
    description: 'Email service test result',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['OK', 'ERROR'] },
        message: { type: 'string' },
        config: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'Resend' },
            from: { type: 'string' },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  public async testSmtp(): Promise<{
    status: string;
    message: string;
    config: {
      service: string;
      from: string | undefined;
    };
    stack?: string;
  }> {
    try {
      const from =
        this.configService.get<string>('RESEND_FROM') ||
        'onboarding@resend.dev';
      const apiKey = this.configService.get<string>('RESEND_API_KEY');

      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'RESEND_API_KEY not configured',
          config: { service: 'Resend', from },
        };
      }

      this.logger.log(`🧪 Testing Resend email service:`);
      this.logger.log(`   From: ${from}`);
      this.logger.log(`   API Key: ${apiKey.substring(0, 10)}...`);

      // Отправляем тестовое письмо
      await this.emailService.sendMagicLink({
        to: 'm.chukhrai@gmail.com', // твой email для теста
        from,
        link: 'https://example.com/test-link',
        expiresInSeconds: 900,
      });

      return {
        status: 'OK',
        message: `✅ Test email sent successfully to m.chukhrai@gmail.com`,
        config: { service: 'Resend', from },
      };
    } catch (err) {
      const error = err as Error;
      this.logger.error(`❌ Email service test failed: ${error.message}`);

      return {
        status: 'ERROR',
        message: error.message,
        config: {
          service: 'Resend',
          from:
            this.configService.get<string>('RESEND_FROM') ||
            'onboarding@resend.dev',
        },
        stack: error.stack,
      };
    }
  }

  /**
   * 🔍 Тестирование отдельного endpoint
   */
  private async testEndpoint(
    results: ConnectivityTestResult[],
    name: string,
    url: string,
    method: 'GET' | 'POST',
    expectedStatuses: number[],
    headers?: Record<string, string>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug(`🔍 Testing: ${name} (${url})`);

      const response = await fetch(url, {
        method,
        headers: headers || {},
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const duration = Date.now() - startTime;
      const isExpected = expectedStatuses.includes(response.status);

      results.push({
        name,
        status: isExpected ? 'OK' : 'FAIL',
        code: response.status,
        duration,
      });

      this.logger.debug(
        `${isExpected ? '✅' : '❌'} ${name}: ${response.status} (${duration}ms)`,
      );
    } catch (err) {
      const duration = Date.now() - startTime;
      const error = err as Error;

      results.push({
        name,
        status: 'ERROR',
        error: error.message,
        duration,
      });

      this.logger.error(`❌ ${name}: ${error.message} (${duration}ms)`);
    }
  }

  // ============================================ Token Management ============================================

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

  // ============================================ User Profile ============================================

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
