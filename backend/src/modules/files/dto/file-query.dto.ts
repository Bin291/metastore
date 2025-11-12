import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { FileStatus } from '../../../common/enums/file-status.enum';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';

export class FileQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => String)
  @IsEnum(FileStatus)
  status?: FileStatus;

  @IsOptional()
  @Type(() => String)
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

