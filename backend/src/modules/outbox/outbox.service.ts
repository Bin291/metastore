import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboxEvent, OutboxEventStatus } from '../../entities/outbox-event.entity';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOutboxEventInput {
  eventType: string;
  payload: Record<string, unknown>;
  traceId?: string;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create an outbox event within a database transaction
   * This ensures the event is created atomically with the business transaction
   */
  async createEvent(
    input: CreateOutboxEventInput,
    transactionManager?: any,
  ): Promise<OutboxEvent> {
    const event = this.outboxRepository.create({
      eventType: input.eventType,
      payload: JSON.stringify(input.payload),
      status: OutboxEventStatus.PENDING,
      traceId: input.traceId || uuidv4(),
    });

    if (transactionManager) {
      return transactionManager.save(OutboxEvent, event);
    }

    return this.outboxRepository.save(event);
  }

  /**
   * Get pending events for publishing
   */
  async getPendingEvents(limit = 100): Promise<OutboxEvent[]> {
    return this.outboxRepository.find({
      where: {
        status: OutboxEventStatus.PENDING,
      },
      order: {
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * Mark event as published
   */
  async markAsPublished(eventId: string): Promise<void> {
    await this.outboxRepository.update(
      { id: eventId },
      {
        status: OutboxEventStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    );
  }

  /**
   * Mark event as failed with error message
   */
  async markAsFailed(
    eventId: string,
    errorMessage: string,
    incrementRetry = true,
  ): Promise<void> {
    const event = await this.outboxRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      return;
    }

    const updateData: Partial<OutboxEvent> = {
      errorMessage,
    };

    if (incrementRetry) {
      updateData.retryCount = event.retryCount + 1;
    }

    // Mark as failed if retry count exceeds threshold
    if (event.retryCount >= 5) {
      updateData.status = OutboxEventStatus.FAILED;
    }

    await this.outboxRepository.update({ id: eventId }, updateData);
  }

  /**
   * Helper to create event within existing transaction
   */
  async createEventInTransaction(
    input: CreateOutboxEventInput,
    callback: (manager: any) => Promise<any>,
  ): Promise<any> {
    return this.dataSource.transaction(async (manager) => {
      // Create outbox event
      await this.createEvent(input, manager);

      // Execute business logic
      return callback(manager);
    });
  }
}

