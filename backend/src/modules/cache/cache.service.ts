import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly enabled: boolean;
  private redisErrorLogged = false;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('redis.enabled') === true;

    if (this.enabled) {
      this.initializeRedis();
    } else {
      // Redis disabled by default - no logging needed
    }
  }

  private initializeRedis(): void {
    try {
      const host = this.configService.get<string>('redis.host') || 'localhost';
      const port = this.configService.get<number>('redis.port') || 6379;
      const password = this.configService.get<string>('redis.password');
      const db = this.configService.get<number>('redis.db') || 0;

      this.redis = new Redis({
        host,
        port,
        password,
        db,
        retryStrategy: () => {
          // Don't retry - disable Redis immediately on failure
          return null;
        },
        maxRetriesPerRequest: 0, // No retries
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 2000, // 2 second timeout
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected');
        this.redisErrorLogged = false; // Reset error flag on successful connection
      });

      this.redis.on('error', () => {
        // Only log first error
        if (!this.redisErrorLogged) {
          this.logger.warn('Redis not available. Caching disabled. Set REDIS_ENABLED=false to suppress this warning.');
          this.redisErrorLogged = true;
        }
        // Disable Redis on error - don't retry
        if (this.redis) {
          this.redis.disconnect();
          this.redis = null;
        }
      });

      // Don't connect immediately - will connect on first use
    } catch (error) {
      this.logger.warn('Redis initialization failed. Caching disabled.');
      this.redis = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      // On error, disable Redis to prevent further errors
      if (this.redis) {
        try {
          this.redis.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.redis = null;
      }
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      // On error, disable Redis to prevent further errors
      if (this.redis) {
        try {
          this.redis.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.redis = null;
      }
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      // On error, disable Redis
      if (this.redis) {
        try {
          this.redis.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.redis = null;
      }
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      // On error, disable Redis
      if (this.redis) {
        try {
          this.redis.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.redis = null;
      }
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      // On error, disable Redis
      if (this.redis) {
        try {
          this.redis.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.redis = null;
      }
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async getTtl(key: string): Promise<number> {
    if (!this.enabled || !this.redis) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      // On error, disable Redis
      if (this.redis) {
        try {
          this.redis.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.redis = null;
      }
      return -1;
    }
  }

  /**
   * Generate cache key
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

