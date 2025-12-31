/**
 * Example: How to integrate Outbox Pattern and Saga Pattern
 * This is a reference implementation showing how to use the patterns
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxService } from '../outbox/outbox.service';
import { SagaOrchestratorService } from '../saga/saga-orchestrator.service';
import { FileUploadSaga } from './file-upload.saga';

@Injectable()
export class FilesServiceExample {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly fileUploadSaga: FileUploadSaga,
    private readonly dataSource: DataSource,
  ) {
    // Register saga definition on module init
    this.sagaOrchestrator.registerSaga(this.fileUploadSaga.getSagaDefinition());
  }

  /**
   * Example: Register file with Outbox Pattern
   */
  async registerFileWithOutbox(userId: string, dto: any) {
    return this.outboxService.createEventInTransaction(
      {
        eventType: 'file.uploaded',
        payload: {
          userId,
          fileName: dto.name,
          fileSize: dto.size,
        },
      },
      async (manager) => {
        // Your existing file registration logic here
        // This runs in the same transaction as the outbox event creation
        const file = manager.create('FileObject', {
          // ... file data
        });
        return manager.save(file);
      },
    );
  }

  /**
   * Example: Upload file with Saga Pattern
   */
  async uploadFileWithSaga(userId: string, dto: any) {
    const sagaInstance = await this.sagaOrchestrator.startSaga(
      'file.upload',
      {
        userId,
        dto,
        // ... other initial data
      },
    );

    return sagaInstance;
  }

  /**
   * Example: Combined approach - Saga with Outbox events
   */
  async uploadFileComplete(userId: string, dto: any) {
    // Start saga
    const sagaInstance = await this.sagaOrchestrator.startSaga(
      'file.upload',
      { userId, dto },
    );

    // Create outbox event for saga completion
    await this.outboxService.createEvent({
      eventType: 'saga.started',
      payload: {
        sagaId: (sagaInstance as any).id,
        sagaType: 'file.upload',
        userId,
      },
    });

    return sagaInstance;
  }
}

