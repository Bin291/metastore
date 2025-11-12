import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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
}

