import { IsString, IsNumber } from 'class-validator';

export class UploadChunkDto {
  @IsString()
  uploadId: string;

  @IsNumber()
  partNumber: number;

  @IsString()
  fileId: string;
}
