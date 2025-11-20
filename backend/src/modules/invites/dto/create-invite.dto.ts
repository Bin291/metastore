import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class CreateInviteDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUses?: number;
}

