import { IsEmail, IsObject, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsObject()
  profileMetadata?: Record<string, unknown>;
}

