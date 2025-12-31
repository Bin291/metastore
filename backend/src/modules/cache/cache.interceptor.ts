import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const CACHE_TTL_KEY = 'cache:ttl';
export const CACHE_KEY_PREFIX = 'cache:key:prefix';

/**
 * Decorator to set cache TTL
 */
export const CacheTTL = (ttl: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_TTL_KEY, ttl, descriptor.value);
  };
};

/**
 * Decorator to set custom cache key prefix
 */
export const CacheKeyPrefix = (prefix: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_PREFIX, prefix, descriptor.value);
  };
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Get cache TTL from metadata (default 60 seconds)
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, handler) || 60;

    // Get custom cache key prefix
    const keyPrefix =
      this.reflector.get<string>(CACHE_KEY_PREFIX, handler) || 'api';

    // Generate cache key
    const cacheKey = this.generateCacheKey(keyPrefix, request);

    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    // Execute and cache response
    return next.handle().pipe(
      tap(async (data) => {
        // Only cache successful responses
        if (data) {
          await this.cacheService.set(cacheKey, data, ttl);
        }
      }),
    );
  }

  private generateCacheKey(prefix: string, request: Request): string {
    const userId = (request.user as any)?.id || 'anonymous';
    const parts: (string | number)[] = [
      request.path,
      JSON.stringify(request.query),
      userId,
    ];
    return this.cacheService.generateKey(prefix, ...parts);
  }
}

