import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileObject, ShareLink, ModerationTask } from '../../entities';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageModule } from '../storage/storage.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileObject, ShareLink, ModerationTask]),
    StorageModule,
    AuditLogModule,
    NotificationsModule,
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}

