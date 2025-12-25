import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { QrCodeService } from './qr-code.service';
import { Subscription } from '../../entities/subscription.entity';
import { User } from '../../entities/user.entity';
import { FileObject } from '../../entities/file-object.entity';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, User, FileObject]),
    StorageModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, QrCodeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

