import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class PartDto {
  @IsNumber()
  partNumber!: number;

  @IsString()
  etag!: string;
}

export class CompleteUploadDto {
  @IsString()
  uploadId: string;

  @IsString()
  fileId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartDto)
  parts: PartDto[];
}
