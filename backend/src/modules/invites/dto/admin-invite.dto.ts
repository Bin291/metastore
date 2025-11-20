import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AdminApproveInviteDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class AdminRejectInviteDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

