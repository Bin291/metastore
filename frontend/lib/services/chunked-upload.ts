import { api } from '../api-client';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_UPLOADS = 3; // Upload 3 chunks at a time
const MAX_RETRIES = 3;

export interface UploadProgress {
  fileId: string;
  fileName: string;
  totalSize: number;
  uploadedSize: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
  status: 'initializing' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  processingMessage?: string; // For HLS processing status
}

export interface ChunkUploadResult {
  partNumber: number;
  etag: string;
}

class ChunkedUploadService {
  private activeUploads = new Map<string, AbortController>();
  private progressCallbacks = new Map<string, (progress: UploadProgress) => void>();

  /**
   * Upload file with chunking
   */
  async uploadFile(
    file: File,
    options: {
      path?: string;
      visibility?: 'private' | 'public';
      parentId?: string;
      onProgress?: (progress: UploadProgress) => void;
    } = {}
  ): Promise<string> {
    const abortController = new AbortController();
    const uploadKey = `${file.name}-${Date.now()}`;
    this.activeUploads.set(uploadKey, abortController);

    if (options.onProgress) {
      this.progressCallbacks.set(uploadKey, options.onProgress);
    }

    try {
      // Step 1: Initiate upload
      this.updateProgress(uploadKey, {
        fileId: '',
        fileName: file.name,
        totalSize: file.size,
        uploadedSize: 0,
        percentage: 0,
        speed: 0,
        eta: 0,
        status: 'initializing',
      });

      const { fileId, uploadId, uploadUrls } = await this.initiateUpload(file, options);

      this.updateProgress(uploadKey, {
        fileId,
        fileName: file.name,
        totalSize: file.size,
        uploadedSize: 0,
        percentage: 0,
        speed: 0,
        eta: 0,
        status: 'uploading',
      });

      // Step 2: Upload chunks
      const chunks = this.createChunks(file);
      const uploadedParts = await this.uploadChunks(
        chunks,
        uploadUrls,
        fileId,
        uploadId,
        uploadKey,
        abortController.signal
      );

      // Step 3: Complete upload
      this.updateProgress(uploadKey, {
        fileId,
        fileName: file.name,
        totalSize: file.size,
        uploadedSize: file.size,
        percentage: 100,
        speed: 0,
        eta: 0,
        status: 'processing',
        processingMessage: file.type.startsWith('video/') || file.type.startsWith('audio/')
          ? 'Uploading to server...'
          : undefined,
      });

      // Complete upload and wait for response
      await this.completeUpload(fileId, uploadId, uploadedParts);

      // For video/audio files, poll for processing completion
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        this.updateProgress(uploadKey, {
          fileId,
          fileName: file.name,
          totalSize: file.size,
          uploadedSize: file.size,
          percentage: 100,
          speed: 0,
          eta: 0,
          status: 'processing',
          processingMessage: 'Starting media processing...',
        });

        // Wait a bit before starting to poll (let backend start processing)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Poll processing status
        await this.pollProcessingStatus(fileId, uploadKey, file.name, file.size);
      } else {
        // Non-media files complete immediately
        this.updateProgress(uploadKey, {
          fileId,
          fileName: file.name,
          totalSize: file.size,
          uploadedSize: file.size,
          percentage: 100,
          speed: 0,
          eta: 0,
          status: 'completed',
        });
      }

      return fileId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      this.updateProgress(uploadKey, {
        fileId: '',
        fileName: file.name,
        totalSize: file.size,
        uploadedSize: 0,
        percentage: 0,
        speed: 0,
        eta: 0,
        status: 'failed',
        error: errorMessage,
      });

      throw error;
    } finally {
      this.activeUploads.delete(uploadKey);
      this.progressCallbacks.delete(uploadKey);
    }
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadKey: string): void {
    const controller = this.activeUploads.get(uploadKey);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadKey);
    }
  }

  /**
   * Initiate chunked upload
   */
  private async initiateUpload(
    file: File,
    options: {
      path?: string;
      visibility?: 'private' | 'public';
      parentId?: string;
    }
  ): Promise<{ fileId: string; uploadId: string; uploadUrls: string[] }> {
    const response = await api.post<
      { fileId: string; uploadId: string; uploadUrls: string[] },
      {
        fileName: string;
        mimeType: string;
        fileSize: number;
        path: string;
        visibility: string;
        parentId?: string;
      }
    >('/files/chunked-upload/initiate', {
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      path: options.path || file.name,
      visibility: options.visibility || 'private',
      parentId: options.parentId,
    });

    return response;
  }

  /**
   * Create file chunks
   */
  private createChunks(file: File): Blob[] {
    const chunks: Blob[] = [];
    let offset = 0;

    while (offset < file.size) {
      const end = Math.min(offset + CHUNK_SIZE, file.size);
      chunks.push(file.slice(offset, end));
      offset = end;
    }

    return chunks;
  }

  /**
   * Upload chunks with parallel execution and retry logic
   */
  private async uploadChunks(
    chunks: Blob[],
    initialUrls: string[],
    fileId: string,
    uploadId: string,
    uploadKey: string,
    signal: AbortSignal
  ): Promise<ChunkUploadResult[]> {
    const results: ChunkUploadResult[] = [];
    let uploadedSize = 0;
    const startTime = Date.now();
    let uploadUrls = [...initialUrls];

    // Request more URLs if needed
    if (chunks.length > uploadUrls.length) {
      const moreUrls = await this.getMoreUploadUrls(
        fileId,
        uploadUrls.length + 1,
        chunks.length
      );
      uploadUrls = [...uploadUrls, ...moreUrls];
    }

    // Upload chunks in parallel batches
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_UPLOADS) {
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      const batch = chunks.slice(i, i + MAX_CONCURRENT_UPLOADS);
      const batchUrls = uploadUrls.slice(i, i + MAX_CONCURRENT_UPLOADS);
      const batchNumbers = Array.from(
        { length: batch.length },
        (_, idx) => i + idx + 1
      );

      const batchPromises = batch.map((chunk, idx) =>
        this.uploadChunkWithRetry(
          chunk,
          batchUrls[idx],
          batchNumbers[idx],
          signal
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update progress
      uploadedSize += batch.reduce((sum, chunk) => sum + chunk.size, 0);
      const elapsedTime = (Date.now() - startTime) / 1000; // seconds
      const speed = uploadedSize / elapsedTime;
      const remainingSize = chunks.reduce((sum, c) => sum + c.size, 0) - uploadedSize;
      const eta = speed > 0 ? remainingSize / speed : 0;

      const callback = this.progressCallbacks.get(uploadKey);
      if (callback) {
        callback({
          fileId,
          fileName: '', // Will be set by caller
          totalSize: chunks.reduce((sum, c) => sum + c.size, 0),
          uploadedSize,
          percentage: (uploadedSize / chunks.reduce((sum, c) => sum + c.size, 0)) * 100,
          speed,
          eta,
          status: 'uploading',
        });
      }
    }

    return results;
  }

  /**
   * Upload single chunk with retry logic
   */
  private async uploadChunkWithRetry(
    chunk: Blob,
    url: string,
    partNumber: number,
    signal: AbortSignal,
    retryCount = 0
  ): Promise<ChunkUploadResult> {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const etag = response.headers.get('ETag')?.replace(/"/g, '') || '';
      
      return { partNumber, etag };
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      if (retryCount < MAX_RETRIES) {
        console.warn(`Retrying chunk ${partNumber}, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.uploadChunkWithRetry(chunk, url, partNumber, signal, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Get additional upload URLs
   */
  private async getMoreUploadUrls(
    fileId: string,
    start: number,
    end: number
  ): Promise<string[]> {
    const response = await api.get<{ urls: string[] }>(
      `/files/chunked-upload/${fileId}/parts?start=${start}&end=${end}`
    );
    return response.urls;
  }

  /**
   * Complete upload
   */
  private async completeUpload(
    fileId: string,
    uploadId: string,
    parts: ChunkUploadResult[]
  ): Promise<void> {
    await api.post('/files/chunked-upload/complete', {
      fileId,
      uploadId,
      parts: parts.map(p => ({
        partNumber: p.partNumber,
        etag: p.etag,
      })),
    });
  }

  /**
   * Poll file processing status
   */
  private async pollProcessingStatus(
    fileId: string,
    uploadKey: string,
    fileName: string,
    fileSize: number,
  ): Promise<void> {
    const maxAttempts = 120; // 10 minutes max (120 * 5s)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // Get all files and find the uploaded one
        const response = await api.get<{ 
          data: Array<{ 
            id: string; 
            metadata?: Record<string, unknown>;
            mimeType?: string;
          }> 
        }>('/files');
        
        const files = response?.data || [];
        const file = files.find((f) => f.id === fileId);

        if (!file) {
          // File not found yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
          continue;
        }

        // Check if this is a media file that needs processing
        const isMediaFile = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/');

        // If not media file, complete immediately
        if (!isMediaFile) {
          this.updateProgress(uploadKey, {
            fileId,
            fileName,
            totalSize: fileSize,
            uploadedSize: fileSize,
            percentage: 100,
            speed: 0,
            eta: 0,
            status: 'completed',
          });
          return;
        }

        const metadata = file.metadata || {};
        const hlsMetadata = (metadata as Record<string, unknown>).hls as Record<string, unknown> || {};

        // Check if processing is done
        if ((hlsMetadata as Record<string, unknown>).processed === true) {
          // Processing completed successfully
          this.updateProgress(uploadKey, {
            fileId,
            fileName,
            totalSize: fileSize,
            uploadedSize: fileSize,
            percentage: 100,
            speed: 0,
            eta: 0,
            status: 'completed',
          });
          return;
        }

        // Check if processing failed
        if ((metadata as Record<string, unknown>).processingError) {
          this.updateProgress(uploadKey, {
            fileId,
            fileName,
            totalSize: fileSize,
            uploadedSize: fileSize,
            percentage: 100,
            speed: 0,
            eta: 0,
            status: 'completed', // Still mark as completed, but file uploaded
            processingMessage: 'Upload completed (processing failed)',
          });
          return;
        }

        // Still processing
        const processingTime = attempts * 5;
        this.updateProgress(uploadKey, {
          fileId,
          fileName,
          totalSize: fileSize,
          uploadedSize: fileSize,
          percentage: 100,
          speed: 0,
          eta: 0,
          status: 'processing',
          processingMessage: `Processing media (${processingTime}s)...`,
        });

        // If not video/audio, don't wait for processing
        if ((metadata as Record<string, unknown>).processing === false && !(hlsMetadata as Record<string, unknown>).processed) {
          // No media processing needed
          this.updateProgress(uploadKey, {
            fileId,
            fileName,
            totalSize: fileSize,
            uploadedSize: fileSize,
            percentage: 100,
            speed: 0,
            eta: 0,
            status: 'completed',
          });
          return;
        }

      } catch (error) {
        console.error('Error polling processing status:', error);
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    // Timeout - mark as completed anyway
    this.updateProgress(uploadKey, {
      fileId,
      fileName,
      totalSize: fileSize,
      uploadedSize: fileSize,
      percentage: 100,
      speed: 0,
      eta: 0,
      status: 'completed',
      processingMessage: 'Upload completed (processing timeout)',
    });
  }

  /**
   * Update progress
   */
  private updateProgress(uploadKey: string, progress: UploadProgress): void {
    const callback = this.progressCallbacks.get(uploadKey);
    if (callback) {
      callback(progress);
    }
  }
}

export const chunkedUploadService = new ChunkedUploadService();
