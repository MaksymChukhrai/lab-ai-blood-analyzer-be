import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
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

  // Redis client для session store
  let sessionStore: session.Store | undefined;
  const redisUrl = config.get<string>('REDIS_URL');

  logger.log(`🔍 Checking Redis configuration...`);
  logger.log(`🔍 REDIS_URL exists: ${!!redisUrl}`);

  if (redisUrl) {
    logger.log(`🔍 Attempting to connect to Redis...`);
    const redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis Client Error:', err.message);
    });

    try {
      await redisClient.connect();

      sessionStore = new RedisStore({ client: redisClient });
      logger.log('✅ Redis session store connected');
    } catch (err: unknown) {
      logger.warn('⚠️ Redis connection failed, falling back to memory store');
      if (err instanceof Error) {
        logger.warn(`Error details: ${err.message}`);
      }
    }
  } else {
    logger.warn(
      '⚠️ REDIS_URL not set, using memory store (not production-ready)',
    );
  }

  app.use(
    session({
      store: sessionStore,
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
    .addServer('/api', 'API Base Path')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const allowedOriginsEnv = config.getOrThrow<string>('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

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
