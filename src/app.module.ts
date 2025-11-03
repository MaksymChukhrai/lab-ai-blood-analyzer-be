import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UploadModule } from './modules/upload/upload.module';
import { AnalysisModule } from './modules/analysis/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 5,
      },
    ] as const),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const dbType = config.get<string>('DB_TYPE', 'better-sqlite3');

        // SQLite for development
        if (dbType === 'better-sqlite3') {
          return {
            type: 'better-sqlite3',
            database: config.get<string>('DB_DATABASE', './lab_ai_dev.sqlite'),
            autoLoadEntities: true,
            synchronize: true,
          };
        }

        // MySQL for production
        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASS'),
          database: config.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    AuthModule,
    HealthModule,
    UploadModule,
    AnalysisModule,
  ],
})
export class AppModule {}
