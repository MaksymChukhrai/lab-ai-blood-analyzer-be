import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Root endpoint - API info' })
  getRoot() {
    return {
      status: 'ok',
      message: 'Blood Test Analyzer API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        swagger: '/api',
        health: '/health',
        auth: {
          refresh: 'POST /auth/refresh',
          logout: 'POST /auth/logout',
        },
      },
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'mock',
    };
  }
}
