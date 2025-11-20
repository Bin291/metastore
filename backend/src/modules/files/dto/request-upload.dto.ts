import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';

export class RequestUploadDto {
  @IsString()
  @MaxLength(512)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @IsBoolean()
  isFolder: boolean;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;
}

