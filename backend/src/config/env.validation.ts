import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'production', 'test', 'staging'])
  NODE_ENV?: string;

  @IsOptional()
  @IsInt()
  PORT?: number;

  @IsOptional()
  @IsIn(['sqlite', 'postgres'])
  DATABASE_TYPE?: string;

  @ValidateIf((env) => env.DATABASE_TYPE === 'postgres')
  @IsString()
  DATABASE_URL?: string;

  @ValidateIf((env) => env.DATABASE_TYPE === 'sqlite' || !env.DATABASE_TYPE)
  @IsOptional()
  @IsString()
  SQLITE_PATH?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_SECRET?: string;

  @IsOptional()
  @IsString()
  MINIO_ENDPOINT?: string;

  @IsOptional()
  @IsInt()
  MINIO_PORT?: number;

  @IsOptional()
  @IsBooleanString()
  MINIO_USE_SSL?: string;

  @IsOptional()
  @IsString()
  MINIO_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  MINIO_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  SUPABASE_URL?: string;

  @IsOptional()
  @IsString()
  SUPABASE_SERVICE_ROLE?: string;

  @IsOptional()
  @IsBooleanString()
  AUTH_COOKIE_SECURE?: string;

  @IsOptional()
  @IsString()
  AUTH_COOKIE_DOMAIN?: string;

  @IsOptional()
  @IsString()
  AUTH_COOKIE_SAME_SITE?: string;

  @IsOptional()
  @IsString()
  AUTH_ACCESS_TOKEN_COOKIE?: string;

  @IsOptional()
  @IsString()
  AUTH_REFRESH_TOKEN_COOKIE?: string;

  @IsOptional()
  @IsString()
  PAYMENT_BANK_NAME?: string;

  @IsOptional()
  @IsString()
  PAYMENT_BANK_ACCOUNT?: string;

  @IsOptional()
  @IsString()
  PAYMENT_BANK_ACCOUNT_NAME?: string;

  @IsOptional()
  @IsString()
  PAYMENT_BANK_BRANCH?: string;

  @IsOptional()
  @IsBooleanString()
  PAYMENT_QR_ENABLED?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return config;
}

