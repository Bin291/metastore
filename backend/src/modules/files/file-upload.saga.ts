import { Injectable } from '@nestjs/common';
import { FilesService } from './files.service';
import { StorageService } from '../storage/storage.service';
import { MediaProcessingService } from '../media/media-processing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SagaStep } from '../saga/saga-step.interface';
import { FileObject } from '../../entities';

/**
 * File Upload Saga Definition
 * Handles multi-step file upload process with compensation
 */
@Injectable()
export class FileUploadSaga {
  constructor(
    private readonly filesService: FilesService,
    private readonly storageService: StorageService,
    private readonly mediaProcessingService: MediaProcessingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getSagaDefinition() {
    return {
      sagaType: 'file.upload',
      steps: [
        {
          stepNumber: 1,
          name: 'register_file',
          execute: async (data: { fileId: string; userId: string; dto: any }) => {
            // File registration is already done, just return data
            return data;
          },
          compensate: async (data: any) => {
            // Delete file record if exists
            if (data.fileId) {
              // Compensation logic would be handled by FilesService
              // This is just a placeholder
            }
          },
        },
        {
          stepNumber: 2,
          name: 'process_media',
          execute: async (data: {
            fileId: string;
            mimeType?: string;
            storageKey: string;
          }) => {
            // Process media if it's a video
            if (data.mimeType?.startsWith('video/')) {
              // Note: Media processing would be handled separately
              // This is a placeholder for saga step
              // await this.mediaProcessingService.processVideo(...);
            }
            return data;
          },
          compensate: async (data: any) => {
            // Delete processed media files
            if (data.storageKey) {
              // Cleanup HLS segments
              // This would be handled by MediaProcessingService
            }
          },
        },
        {
          stepNumber: 3,
          name: 'send_notification',
          execute: async (data: { fileId: string; userId: string }) => {
            // Send notification
            await this.notificationsService.createAndDispatch({
              userId: data.userId,
              type: 'file.uploaded',
              message: 'File uploaded successfully',
              payload: { fileId: data.fileId },
            });
            return data;
          },
          compensate: async (data: any) => {
            // No compensation needed for notifications
            // They are idempotent
          },
        },
      ],
    };
  }
}

