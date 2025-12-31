import { BucketType } from '../common/enums/bucket-type.enum';

export const configuration = () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3001', 10),
    globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  auth: {
    accessTokenSecret:
      process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessTokenTtl: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshTokenSecret:
      process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshTokenTtl: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN,
    cookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
    cookieSameSite: (process.env.AUTH_COOKIE_SAME_SITE ??
      'lax') as 'lax' | 'strict' | 'none',
    accessTokenCookieName:
      process.env.AUTH_ACCESS_TOKEN_COOKIE ?? 'metastore_access_token',
    refreshTokenCookieName:
      process.env.AUTH_REFRESH_TOKEN_COOKIE ?? 'metastore_refresh_token',
  },
  database: {
    type: (process.env.DATABASE_TYPE ?? 'sqlite') as 'sqlite' | 'postgres',
    url: process.env.DATABASE_URL,
    sqlitePath: process.env.SQLITE_PATH ?? 'data/metastore.db',
    logging: process.env.TYPEORM_LOGGING === 'true',
  },
  storage: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    region: process.env.MINIO_REGION ?? 'us-east-1',
    buckets: {
      [BucketType.PRIVATE]:
        process.env.MINIO_BUCKET_PRIVATE ?? 'metastore-private',
      [BucketType.PUBLIC]:
        process.env.MINIO_BUCKET_PUBLIC ?? 'metastore-public',
      [BucketType.PENDING]:
        process.env.MINIO_BUCKET_PENDING ?? 'metastore-pending',
      [BucketType.REJECTED]:
        process.env.MINIO_BUCKET_REJECTED ?? 'metastore-rejected',
      [BucketType.SANDBOX]:
        process.env.MINIO_BUCKET_SANDBOX ?? 'metastore-sandbox',
    },
    presign: {
      uploadExpiresIn:
        parseInt(process.env.STORAGE_UPLOAD_EXPIRES_IN ?? '7200', 10) || 7200, // 2 hours for large files
      downloadExpiresIn:
        parseInt(process.env.STORAGE_DOWNLOAD_EXPIRES_IN ?? '3600', 10) || 3600, // 1 hour
    },
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    enabled: process.env.REDIS_ENABLED === 'true', // Only enable if explicitly set to 'true'
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE,
  },
  frontend: {
    url: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
  admin: {
    defaultUsername: process.env.DEFAULT_ADMIN_USERNAME ?? 'admin',
    defaultPassword: process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123',
    defaultEmail: process.env.DEFAULT_ADMIN_EMAIL ?? undefined,
  },
  payment: {
    bankName: process.env.PAYMENT_BANK_NAME ?? 'Techcombank',
    accountNumber: process.env.PAYMENT_BANK_ACCOUNT ?? '',
    accountName: process.env.PAYMENT_BANK_ACCOUNT_NAME ?? '',
    branchName: process.env.PAYMENT_BANK_BRANCH ?? '',
    qrCodeEnabled: process.env.PAYMENT_QR_ENABLED !== 'false',
  },
});

