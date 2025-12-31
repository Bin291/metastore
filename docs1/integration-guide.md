# 🔗 Integration Guide

Hướng dẫn tích hợp các patterns vào existing services trong MetaStore.

---

## 📋 Table of Contents

1. [Outbox Pattern Integration](#outbox-pattern-integration)
2. [Saga Pattern Integration](#saga-pattern-integration)
3. [Idempotency Integration](#idempotency-integration)
4. [Caching Integration](#caching-integration)
5. [Combined Usage](#combined-usage)

---

## 📦 Outbox Pattern Integration

### Step 1: Import OutboxService

```typescript
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly outboxService: OutboxService,
    // ... other services
  ) {}
}
```

### Step 2: Use in Transaction

```typescript
async registerFile(userId: string, dto: RegisterFileDto) {
  return this.outboxService.createEventInTransaction(
    {
      eventType: 'file.uploaded',
      payload: {
        userId,
        fileName: dto.name,
        fileSize: dto.size,
      },
    },
    async (manager) => {
      // Your existing file registration logic
      const file = manager.create(FileObject, {
        name: dto.name,
        ownerId: userId,
        // ... other fields
      });
      return manager.save(file);
    },
  );
}
```

### Step 3: Verify Events

```typescript
// Check outbox events
const events = await outboxService.getPendingEvents();
console.log(`Pending events: ${events.length}`);
```

---

## 🔄 Saga Pattern Integration

### Step 1: Create Saga Definition

```typescript
// file-upload.saga.ts
@Injectable()
export class FileUploadSaga {
  constructor(
    private readonly filesService: FilesService,
    private readonly mediaService: MediaProcessingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getSagaDefinition() {
    return {
      sagaType: 'file.upload',
      steps: [
        {
          stepNumber: 1,
          name: 'register_file',
          execute: async (data) => {
            const file = await this.filesService.registerFile(data.userId, data.dto);
            return { fileId: file.id };
          },
          compensate: async (data) => {
            if (data.fileId) {
              await this.filesService.deleteFile(data.fileId);
            }
          },
        },
        // ... more steps
      ],
    };
  }
}
```

### Step 2: Register Saga

```typescript
// In module initialization
constructor(
  private readonly sagaOrchestrator: SagaOrchestratorService,
  private readonly fileUploadSaga: FileUploadSaga,
) {
  this.sagaOrchestrator.registerSaga(
    this.fileUploadSaga.getSagaDefinition(),
  );
}
```

### Step 3: Start Saga

```typescript
async uploadFile(userId: string, dto: RegisterFileDto) {
  const sagaInstance = await this.sagaOrchestrator.startSaga(
    'file.upload',
    {
      userId,
      dto,
    },
  );

  return sagaInstance;
}
```

---

## 🔑 Idempotency Integration

### Automatic (No Code Changes)

Idempotency interceptor is **automatically applied** to all POST, PUT, PATCH, DELETE requests.

### Client-Side Usage

```typescript
// Generate idempotency key
const idempotencyKey = crypto.randomUUID();

// Make request
const response = await fetch('/api/v1/files', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify({
    name: 'video.mp4',
    size: 1000000,
  }),
});

// Retry with same key (will return cached response)
const retryResponse = await fetch('/api/v1/files', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey, // Same key
  },
  body: JSON.stringify({
    name: 'video.mp4',
    size: 1000000,
  }),
});
```

---

## ⚡ Caching Integration

### Automatic Caching (GET Requests)

```typescript
@Get('/files')
@CacheTTL(60) // Cache for 60 seconds
async listFiles(@Query() query: FileQueryDto) {
  // Response automatically cached
  return this.filesService.listFiles(query);
}
```

### Manual Caching

```typescript
@Injectable()
export class FilesService {
  constructor(private readonly cacheService: CacheService) {}

  async getFile(fileId: string) {
    const cacheKey = this.cacheService.generateKey('file', fileId);
    
    // Check cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from DB
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    // Cache result
    await this.cacheService.set(cacheKey, file, 300);

    return file;
  }

  async updateFile(fileId: string, dto: UpdateFileDto) {
    // Update
    const file = await this.fileRepository.update(fileId, dto);

    // Invalidate cache
    const cacheKey = this.cacheService.generateKey('file', fileId);
    await this.cacheService.delete(cacheKey);
    await this.cacheService.deletePattern('cache:api:/files:*');

    return file;
  }
}
```

---

## 🔗 Combined Usage

### Example: File Upload with All Patterns

```typescript
@Injectable()
export class FilesService {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly cacheService: CacheService,
  ) {}

  async uploadFile(userId: string, dto: RegisterFileDto) {
    // 1. Start Saga (multi-step transaction)
    const sagaInstance = await this.sagaOrchestrator.startSaga(
      'file.upload',
      { userId, dto },
    );

    // 2. Create Outbox Event (reliable publishing)
    await this.outboxService.createEvent({
      eventType: 'saga.started',
      payload: {
        sagaId: sagaInstance.id,
        sagaType: 'file.upload',
        userId,
      },
    });

    // 3. Cache saga status
    const cacheKey = this.cacheService.generateKey('saga', sagaInstance.id);
    await this.cacheService.set(cacheKey, sagaInstance, 300);

    return sagaInstance;
  }

  // Idempotency is automatic via interceptor
  // Just send Idempotency-Key header from client
}
```

---

## 📝 Complete Example: FilesService

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FileObject } from '../../entities';
import { OutboxService } from '../outbox/outbox.service';
import { SagaOrchestratorService } from '../saga/saga-orchestrator.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileObject)
    private readonly fileRepository: Repository<FileObject>,
    private readonly outboxService: OutboxService,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  // With Outbox Pattern
  async registerFileWithOutbox(userId: string, dto: RegisterFileDto) {
    return this.outboxService.createEventInTransaction(
      {
        eventType: 'file.uploaded',
        payload: { userId, fileName: dto.name },
      },
      async (manager) => {
        const file = manager.create(FileObject, {
          name: dto.name,
          ownerId: userId,
        });
        return manager.save(file);
      },
    );
  }

  // With Saga Pattern
  async uploadFileWithSaga(userId: string, dto: RegisterFileDto) {
    return this.sagaOrchestrator.startSaga('file.upload', {
      userId,
      dto,
    });
  }

  // With Caching
  async getFile(fileId: string) {
    const cacheKey = this.cacheService.generateKey('file', fileId);
    
    const cached = await this.cacheService.get<FileObject>(cacheKey);
    if (cached) {
      return cached;
    }

    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (file) {
      await this.cacheService.set(cacheKey, file, 300);
    }

    return file;
  }

  // Idempotency is automatic - no code needed!
}
```

---

## ✅ Checklist

### Outbox Pattern
- [ ] Import `OutboxService`
- [ ] Use `createEventInTransaction()` for events
- [ ] Verify events are created
- [ ] Check poller is running

### Saga Pattern
- [ ] Create saga definition
- [ ] Register saga in module
- [ ] Implement step execute functions
- [ ] Implement compensation functions
- [ ] Test saga execution

### Idempotency
- [ ] Send `Idempotency-Key` header from client
- [ ] Verify duplicate requests return cached response
- [ ] Test with different request bodies

### Caching
- [ ] Add `@CacheTTL()` decorator for GET endpoints
- [ ] Implement cache invalidation on updates
- [ ] Test cache hit/miss scenarios
- [ ] Monitor cache performance

---

## 🚀 Next Steps

1. **Test Integration**: Test each pattern individually
2. **Monitor**: Set up monitoring for patterns
3. **Optimize**: Adjust TTLs and cache strategies
4. **Document**: Document your specific use cases

---

**Last Updated**: 2024-12-XX

