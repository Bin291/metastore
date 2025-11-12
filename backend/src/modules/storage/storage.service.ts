import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BucketType } from '../../common/enums/bucket-type.enum';

interface StorageConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
  buckets: Record<BucketType, string>;
  presign: {
    uploadExpiresIn: number;
    downloadExpiresIn: number;
  };
}

export interface PresignedUrlResult {
  url: string;
  bucket: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly config: StorageConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<StorageConfig>('storage')!;

    const protocol = this.config.useSSL ? 'https' : 'http';
    const endpoint = `${protocol}://${this.config.endpoint}:${this.config.port}`;

    this.s3Client = new S3Client({
      region: this.config.region,
      endpoint,
      credentials: {
        accessKeyId: this.config.accessKey,
        secretAccessKey: this.config.secretKey,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBuckets();
  }

  private async ensureBuckets(): Promise<void> {
    await Promise.all(
      Object.values(BucketType).map(async (bucketType) => {
        const bucketName = this.getBucketName(bucketType as BucketType);
        try {
          await this.s3Client.send(
            new HeadBucketCommand({ Bucket: bucketName }),
          );
        } catch (error: unknown) {
          this.logger.warn(
            `Bucket "${bucketName}" not found, attempting to create.`,
          );
          try {
            await this.s3Client.send(
              new CreateBucketCommand({ Bucket: bucketName }),
            );
            this.logger.log(`Created bucket "${bucketName}".`);
          } catch (creationError) {
            this.logger.error(
              `Failed to create bucket "${bucketName}".`,
              (creationError as Error).message,
            );
          }
        }
      }),
    );
  }

  getBucketName(bucketType: BucketType): string {
    return this.config.buckets[bucketType];
  }

  buildObjectKey(
    userId: string,
    relativePath: string,
    bucketType: BucketType = BucketType.PRIVATE,
  ): string {
    const sanitizedPath = relativePath.replace(/^\/+/, '').replace(/\\/g, '/');
    const basePrefix = `users/${userId}`;

    switch (bucketType) {
      case BucketType.PENDING:
        return `pending/${basePrefix}/${sanitizedPath}`;
      case BucketType.PUBLIC:
        return `public/${basePrefix}/${sanitizedPath}`;
      case BucketType.REJECTED:
        return `rejected/${basePrefix}/${sanitizedPath}`;
      case BucketType.SANDBOX:
        return `sandbox/${basePrefix}/${sanitizedPath}`;
      case BucketType.PRIVATE:
      default:
        return `${basePrefix}/${sanitizedPath}`;
    }
  }

  async getPresignedUploadUrl(params: {
    bucketType: BucketType;
    key: string;
    contentType?: string;
    expiresIn?: number;
  }): Promise<PresignedUrlResult> {
    const bucket = this.getBucketName(params.bucketType);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
    });

    const expiresIn =
      params.expiresIn ?? this.config.presign.uploadExpiresIn;

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    return { url, bucket, key: params.key, expiresIn };
  }

  async getPresignedDownloadUrl(params: {
    bucketType: BucketType;
    key: string;
    expiresIn?: number;
  }): Promise<PresignedUrlResult> {
    const bucket = this.getBucketName(params.bucketType);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: params.key,
    });

    const expiresIn =
      params.expiresIn ?? this.config.presign.downloadExpiresIn;

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    return { url, bucket, key: params.key, expiresIn };
  }

  async deleteObject(bucketType: BucketType, key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.getBucketName(bucketType),
        Key: key,
      }),
    );
  }

  async copyObject(
    sourceBucket: BucketType,
    sourceKey: string,
    destinationBucket: BucketType,
    destinationKey: string,
  ): Promise<void> {
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.getBucketName(destinationBucket),
        Key: destinationKey,
        CopySource: `/${this.getBucketName(sourceBucket)}/${sourceKey}`,
      }),
    );
  }

  async moveObject(
    sourceBucket: BucketType,
    sourceKey: string,
    destinationBucket: BucketType,
    destinationKey: string,
  ): Promise<void> {
    await this.copyObject(
      sourceBucket,
      sourceKey,
      destinationBucket,
      destinationKey,
    );
    await this.deleteObject(sourceBucket, sourceKey);
  }
}

