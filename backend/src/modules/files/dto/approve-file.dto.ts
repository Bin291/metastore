import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';

export class ApproveFileDto {
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  destinationPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  moderationNotes?: string;
}

