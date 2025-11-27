import { Module } from '@nestjs/common';
import { MediaProcessingService } from './media-processing.service';

@Module({
  providers: [MediaProcessingService],
  exports: [MediaProcessingService],
})
export class MediaModule {}
