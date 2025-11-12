import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareLink, FileObject } from '../../entities';
import { ShareLinksService } from './share-links.service';
import { ShareLinksController } from './share-links.controller';
import { FilesModule } from '../files/files.module';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLink, FileObject]),
    FilesModule,
    AuditLogModule,
  ],
  providers: [ShareLinksService],
  controllers: [ShareLinksController],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}

