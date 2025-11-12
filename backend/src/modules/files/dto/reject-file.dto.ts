import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectFileDto {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  reason?: string;
}

