import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from '../../entities/outbox-event.entity';
import { OutboxService } from './outbox.service';
import { OutboxPollerService } from './outbox-poller.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent]),
  ],
  providers: [OutboxService, OutboxPollerService],
  exports: [OutboxService],
})
export class OutboxModule {}

