import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SharePermission } from '../../../common/enums/share-permission.enum';

export class CreateShareLinkDto {
  @IsString()
  resourceId: string;

  @IsEnum(SharePermission)
  permission: SharePermission;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}

