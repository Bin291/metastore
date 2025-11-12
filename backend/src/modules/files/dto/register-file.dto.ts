import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';
import { IsEnum } from 'class-validator';

export class RegisterFileDto {
  @IsString()
  @MaxLength(512)
  name: string;

  @IsString()
  @MaxLength(1024)
  path: string;

  @IsBoolean()
  isFolder: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;
}

