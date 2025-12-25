import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { StorageQuotaService } from './storage-quota.service';
import { User } from '../../entities/user.entity';
import { FileObject } from '../../entities/file-object.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, FileObject])],
  providers: [StorageService, StorageQuotaService],
  exports: [StorageService, StorageQuotaService],
})
export class StorageModule {}

