import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const frontendUrl = config.get<string>('FRONTEND_URL');
  const isProduction = nodeEnv === 'production';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 3600000,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lab AI Blood Test Analyzer API')
    .setDescription('API documentation for Lab AI healthcare platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const allowedOrigins = [
    'http://localhost:5173',
    'https://green-frontend-bbac1a42fc92.herokuapp.com',
  ];

  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 3000);

  await app.listen(port);

  logger.log(`🚀 Application is running in ${nodeEnv} mode`);
  logger.log(`📍 Server: http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`💚 Health check: http://localhost:${port}/api/health`);
  logger.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
}

void bootstrap();
