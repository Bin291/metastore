import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxEvent, OutboxEventStatus } from '../../entities/outbox-event.entity';

/**
 * Simple in-memory event publisher
 * In production, this would publish to RabbitMQ, Kafka, etc.
 */
export interface EventPublisher {
  publish(eventType: string, payload: Record<string, unknown>): Promise<void>;
}

@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private eventPublisher?: EventPublisher;

  constructor(
    private readonly outboxService: OutboxService,
  ) {}

  onModuleInit() {
    // Start polling immediately
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  /**
   * Start polling for pending events
   */
  private startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.logger.log('Starting outbox poller...');

    // Poll every 5 seconds
    this.pollInterval = setInterval(() => {
      this.processPendingEvents().catch((error) => {
        this.logger.error('Error processing pending events', error);
      });
    }, 5000);
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    this.logger.log('Stopped outbox poller');
  }

  /**
   * Process pending events (called automatically via interval)
   */
  async processPendingEvents(): Promise<void> {
    if (!this.isPolling) {
      return;
    }

    try {
      const pendingEvents = await this.outboxService.getPendingEvents(50);

      if (pendingEvents.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${pendingEvents.length} pending events`);

      for (const event of pendingEvents) {
        try {
          await this.publishEvent(event);
          await this.outboxService.markAsPublished(event.id);
          this.logger.debug(`Published event ${event.id} of type ${event.eventType}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.outboxService.markAsFailed(event.id, errorMessage);
          this.logger.error(
            `Failed to publish event ${event.id}: ${errorMessage}`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error in processPendingEvents', error);
    }
  }

  /**
   * Publish event to message broker or handle directly
   */
  private async publishEvent(event: OutboxEvent): Promise<void> {
    const payload = JSON.parse(event.payload);

    if (this.eventPublisher) {
      // Use external publisher (RabbitMQ, Kafka, etc.)
      await this.eventPublisher.publish(event.eventType, payload);
    } else {
      // Fallback: Log event (in production, use proper message broker)
      this.logger.log(`[Event] ${event.eventType}: ${JSON.stringify(payload)}`);
      
      // In a real implementation, you would emit to event bus here
      // For now, we'll just mark as published
      // TODO: Integrate with actual message broker
    }
  }
}

