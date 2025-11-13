// Helper function to get database-agnostic column type
import { ConfigService } from '@nestjs/config';

export const getDateColumnType = (configService: ConfigService): 'datetime' | 'timestamptz' => {
  const dbType = configService.get<'sqlite' | 'postgres'>('database.type', 'sqlite');
  return dbType === 'postgres' ? 'timestamptz' : 'datetime';
};

// For numeric types
export const getIntColumnType = (configService: ConfigService): 'integer' | 'int' => {
  const dbType = configService.get<'sqlite' | 'postgres'>('database.type', 'sqlite');
  return dbType === 'postgres' ? 'int' : 'integer';
};

// For JSON types
export const getJsonColumnType = (configService: ConfigService): 'jsonb' | 'text' => {
  const dbType = configService.get<'sqlite' | 'postgres'>('database.type', 'sqlite');
  return dbType === 'postgres' ? 'jsonb' : 'text';
};

