import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
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
    // Delay để đợi MinIO khởi động hoàn tất
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.ensureBuckets();
  }

  private async ensureBuckets(): Promise<void> {
    this.logger.log('Checking and creating MinIO buckets...');
    
    for (const bucketType of Object.values(BucketType)) {
      const bucketName = this.getBucketName(bucketType as BucketType);
      try {
        await this.s3Client.send(
          new HeadBucketCommand({ Bucket: bucketName }),
        );
        this.logger.log(`✅ Bucket "${bucketName}" already exists.`);
      } catch (error: unknown) {
        this.logger.warn(
          `Bucket "${bucketName}" not found, attempting to create.`,
        );
        try {
          await this.s3Client.send(
            new CreateBucketCommand({ Bucket: bucketName }),
          );
          this.logger.log(`✅ Created bucket "${bucketName}".`);
        } catch (creationError) {
          this.logger.error(
            `❌ Failed to create bucket "${bucketName}": ${(creationError as Error).message}`,
          );
          // Không throw error để không dừng ứng dụng
        }
      }
    }
    
    this.logger.log('✅ MinIO bucket initialization completed.');
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

  async downloadFile(params: {
    bucketType: BucketType;
    key: string;
  }): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
    const bucket = this.getBucketName(params.bucketType);
    
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: params.key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new NotFoundException('File not found');
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error) {
      this.logger.error(`Failed to download file: ${(error as Error).message}`);
      throw new NotFoundException('File not found');
    }
  }

  /**
   * Upload file directly to storage
   */
  async uploadFile(params: {
    bucketType: BucketType;
    key: string;
    content: Buffer | Readable;
    contentType?: string;
  }): Promise<void> {
    const bucket = this.getBucketName(params.bucketType);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: params.key,
          Body: params.content,
          ContentType: params.contentType,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to upload file: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Initiate multipart upload
   */
  async initiateMultipartUpload(params: {
    bucketType: BucketType;
    key: string;
    contentType?: string;
  }): Promise<string> {
    const bucket = this.getBucketName(params.bucketType);

    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: params.key,
        ContentType: params.contentType,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.UploadId) {
        throw new Error('Failed to initiate multipart upload');
      }

      this.logger.log(`Initiated multipart upload: ${response.UploadId}`);
      return response.UploadId;
    } catch (error) {
      this.logger.error(`Failed to initiate multipart upload: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get presigned URL for uploading a part
   */
  async getPresignedUploadPartUrl(params: {
    bucketType: BucketType;
    key: string;
    uploadId: string;
    partNumber: number;
    expiresIn?: number;
  }): Promise<string> {
    const bucket = this.getBucketName(params.bucketType);

    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: params.key,
      UploadId: params.uploadId,
      PartNumber: params.partNumber,
    });

    const expiresIn = params.expiresIn ?? 3600; // 1 hour default

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(params: {
    bucketType: BucketType;
    key: string;
    uploadId: string;
    parts: { PartNumber: number; ETag: string }[];
  }): Promise<void> {
    const bucket = this.getBucketName(params.bucketType);

    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: params.key,
        UploadId: params.uploadId,
        MultipartUpload: {
          Parts: params.parts,
        },
      });

      await this.s3Client.send(command);
      this.logger.log(`Completed multipart upload: ${params.uploadId}`);
    } catch (error) {
      this.logger.error(`Failed to complete multipart upload: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(params: {
    bucketType: BucketType;
    key: string;
    uploadId: string;
  }): Promise<void> {
    const bucket = this.getBucketName(params.bucketType);

    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: params.key,
        UploadId: params.uploadId,
      });

      await this.s3Client.send(command);
      this.logger.log(`Aborted multipart upload: ${params.uploadId}`);
    } catch (error) {
      this.logger.error(`Failed to abort multipart upload: ${(error as Error).message}`);
      throw error;
    }
  }
}

