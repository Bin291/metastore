import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';

export class InitiateUploadDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  @IsOptional()
  path?: string;

  @IsEnum(FileVisibility)
  @IsOptional()
  visibility?: FileVisibility;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  checksum?: string;
}
