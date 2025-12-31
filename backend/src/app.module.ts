import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration } from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { InvitesModule } from './modules/invites/invites.module';
import { FilesModule } from './modules/files/files.module';
import { ShareLinksModule } from './modules/share-links/share-links.module';
import { StorageModule } from './modules/storage/storage.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { SagaModule } from './modules/saga/saga.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { CacheModule } from './modules/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseType = configService.get<'sqlite' | 'postgres'>(
          'database.type',
        );

        if (databaseType === 'postgres') {
          return {
            type: 'postgres',
            url: configService.get<string>('database.url'),
            autoLoadEntities: true,
            synchronize: true,
            logging: configService.get<boolean>('database.logging'),
          };
        }

        return {
          type: 'sqlite',
          database: configService.get<string>('database.sqlitePath'),
          autoLoadEntities: true,
          synchronize: true,
          logging: configService.get<boolean>('database.logging'),
        };
      },
    }),
    CacheModule,
    OutboxModule,
    SagaModule,
    IdempotencyModule,
    StorageModule,
    MediaModule,
    UsersModule,
    InvitesModule,
    AuthModule,
    FilesModule,
    ShareLinksModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
