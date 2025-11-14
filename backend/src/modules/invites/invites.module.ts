import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invite } from '../../entities/invite.entity';
import { User } from '../../entities/user.entity';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invite, User]),
    AuditLogModule,
    NotificationsModule,
  ],
  providers: [InvitesService],
  controllers: [InvitesController],
  exports: [InvitesService],
})
export class InvitesModule {}

