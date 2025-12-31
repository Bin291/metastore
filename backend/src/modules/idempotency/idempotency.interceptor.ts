import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';
import { Request, Response } from 'express';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Only apply to POST, PUT, PATCH, DELETE
    const method = request.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Get idempotency key from header
    const idempotencyKey = request.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      return next.handle();
    }

    // Generate request hash
    const requestHash = this.idempotencyService.generateRequestHash(
      request.body,
      request.headers as Record<string, string>,
    );

    // Check for duplicate
    const duplicate = await this.idempotencyService.checkDuplicate(
      idempotencyKey,
      requestHash,
    );

    if (duplicate.isDuplicate && duplicate.response) {
      // Return cached response
      response.status(duplicate.response.status);
      return of(duplicate.response.body);
    }

    // Execute request and cache response
    let responseBody: any;
    let responseStatus = HttpStatus.OK;

    return next.handle().pipe(
      tap({
        next: (data) => {
          responseBody = data;
          responseStatus = response.statusCode || HttpStatus.OK;
        },
        complete: async () => {
          // Store response for idempotency
          if (responseStatus < 400) {
            // Only cache successful responses
            await this.idempotencyService.storeResponse(
              idempotencyKey,
              requestHash,
              responseStatus,
              responseBody,
            );
          }
        },
      }),
    );
  }
}

