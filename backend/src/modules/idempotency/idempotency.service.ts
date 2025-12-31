import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { IdempotencyKey } from '../../entities/idempotency-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepository: Repository<IdempotencyKey>,
  ) {}

  /**
   * Generate idempotency key from request
   */
  generateKey(method: string, path: string, userId?: string): string {
    const components = [method, path];
    if (userId) {
      components.push(userId);
    }
    const base = components.join(':');
    return crypto.createHash('sha256').update(base).digest('hex');
  }

  /**
   * Generate request hash for idempotency check
   */
  generateRequestHash(body: any, headers: Record<string, string>): string {
    const relevantHeaders = {
      'content-type': headers['content-type'],
      // Add other relevant headers if needed
    };
    const data = JSON.stringify({ body, headers: relevantHeaders });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if request is duplicate
   */
  async checkDuplicate(
    key: string,
    requestHash: string,
  ): Promise<{ isDuplicate: boolean; response?: any }> {
    const existing = await this.idempotencyRepository.findOne({
      where: { key },
    });

    if (!existing) {
      return { isDuplicate: false };
    }

    // Check if expired
    if (existing.expiresAt < new Date()) {
      await this.idempotencyRepository.remove(existing);
      return { isDuplicate: false };
    }

    // Check if request is identical
    if (existing.requestHash !== requestHash) {
      this.logger.warn(
        `Idempotency key ${key} exists but request hash differs. This might indicate a different request with same key.`,
      );
      // Still return existing response for idempotency
    }

    return {
      isDuplicate: true,
      response: {
        status: existing.responseStatus,
        body: JSON.parse(existing.responseBody),
      },
    };
  }

  /**
   * Store idempotency key and response
   */
  async storeResponse(
    key: string,
    requestHash: string,
    status: number,
    body: any,
    ttlSeconds = 3600, // Default 1 hour
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);

    const idempotencyKey = this.idempotencyRepository.create({
      key,
      requestHash,
      responseStatus: status,
      responseBody: JSON.stringify(body),
      expiresAt,
    });

    await this.idempotencyRepository.save(idempotencyKey);
  }

  /**
   * Clean up expired idempotency keys
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.idempotencyRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }
}

