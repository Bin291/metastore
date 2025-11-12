import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AccessShareLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}

