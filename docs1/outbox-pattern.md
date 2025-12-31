# 📦 Outbox Pattern Implementation

## 🎯 Mục Đích

Outbox Pattern đảm bảo **reliable event publishing** bằng cách:
- Lưu events vào database trong cùng transaction với business logic
- Background worker poll và publish events
- Đảm bảo events không bị mất khi hệ thống crash

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Business Transaction                   │
│  - Save business data                   │
│  - Create outbox event (same transaction)│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Database Transaction                    │
│  - Business data saved                  │
│  - Outbox event saved                   │
│  (Atomic commit)                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Outbox Poller (Background Worker)     │
│  - Poll pending events every 5s        │
│  - Publish to message broker            │
│  - Mark as published                    │
└─────────────────────────────────────────┘
```

---

## 📁 File Structure

```
backend/src/
├── entities/
│   └── outbox-event.entity.ts          # Outbox event entity
├── modules/
│   └── outbox/
│       ├── outbox.module.ts             # Module definition
│       ├── outbox.service.ts            # Core service
│       └── outbox-poller.service.ts     # Background poller
```

---

## 🔧 Implementation Details

### 1. Entity (`outbox-event.entity.ts`)

```typescript
@Entity({ name: 'outbox_events' })
export class OutboxEvent extends BaseEntity {
  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'text' })
  payload: string; // JSON string

  @Column({ default: OutboxEventStatus.PENDING })
  status: OutboxEventStatus;

  @Column({ name: 'published_at', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;
}
```

### 2. Service (`outbox.service.ts`)

**Key Methods:**

- `createEvent()` - Create outbox event
- `createEventInTransaction()` - Create event within transaction
- `getPendingEvents()` - Get pending events for publishing
- `markAsPublished()` - Mark event as published
- `markAsFailed()` - Mark event as failed

**Example Usage:**

```typescript
// Within a transaction
await outboxService.createEventInTransaction(
  {
    eventType: 'file.uploaded',
    payload: { fileId: '123', userId: '456' },
  },
  async (manager) => {
    // Your business logic here
    const file = await manager.save(FileObject, fileData);
    return file;
  },
);
```

### 3. Poller (`outbox-poller.service.ts`)

- Polls every 5 seconds (configurable)
- Processes up to 50 events per poll
- Retries failed events (max 5 retries)
- Marks as failed after max retries

---

## 📊 Database Schema

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  payload TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  published_at DATETIME NULL,
  retry_count INT DEFAULT 0,
  error_message TEXT NULL,
  trace_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_outbox_events_status ON outbox_events(status);
CREATE INDEX idx_outbox_events_created_at ON outbox_events(created_at);
```

---

## 🔄 Workflow

### Step 1: Create Event

```typescript
// In your service
await this.outboxService.createEventInTransaction(
  {
    eventType: 'file.uploaded',
    payload: { fileId, userId, fileName },
  },
  async (manager) => {
    // Business logic
    const file = await manager.save(FileObject, fileData);
    return file;
  },
);
```

### Step 2: Poller Processes Events

```typescript
// Automatic - runs every 5 seconds
@Cron(CronExpression.EVERY_10_SECONDS)
async processPendingEvents() {
  const events = await this.outboxService.getPendingEvents(50);
  for (const event of events) {
    await this.publishEvent(event);
    await this.outboxService.markAsPublished(event.id);
  }
}
```

### Step 3: Event Published

- Event được publish đến message broker (hoặc handled directly)
- Status updated thành `published`
- `publishedAt` timestamp được set

---

## 🎨 Integration Example

### In FilesService

```typescript
@Injectable()
export class FilesService {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

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
        // Existing file registration logic
        const file = manager.create(FileObject, {
          name: dto.name,
          ownerId: userId,
          // ... other fields
        });
        return manager.save(file);
      },
    );
  }
}
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Outbox Poller Configuration
OUTBOX_POLL_INTERVAL=5000  # milliseconds (default: 5000)
OUTBOX_BATCH_SIZE=50       # events per poll (default: 50)
OUTBOX_MAX_RETRIES=5       # max retries before marking as failed
```

### Module Setup

```typescript
// Already imported in app.module.ts
import { OutboxModule } from './modules/outbox/outbox.module';

@Module({
  imports: [
    OutboxModule, // ✅ Already added
    // ... other modules
  ],
})
```

---

## 🧪 Testing

### Unit Test Example

```typescript
describe('OutboxService', () => {
  it('should create event in transaction', async () => {
    const result = await outboxService.createEventInTransaction(
      { eventType: 'test.event', payload: { data: 'test' } },
      async (manager) => {
        return { id: '123' };
      },
    );

    expect(result).toBeDefined();
    
    const events = await outboxService.getPendingEvents();
    expect(events.length).toBeGreaterThan(0);
  });
});
```

---

## 📈 Monitoring

### Metrics to Track

- **Pending Events Count**: Number of events waiting to be published
- **Publish Rate**: Events published per second
- **Failure Rate**: Percentage of failed events
- **Average Processing Time**: Time to publish an event

### Logging

```typescript
// Events are logged at different levels:
// - DEBUG: Event processing details
// - INFO: Successful publishes
// - ERROR: Failed publishes
```

---

## 🔍 Troubleshooting

### Events Not Publishing

1. Check if poller is running: `OutboxPollerService started`
2. Check database for pending events
3. Check logs for errors
4. Verify Redis/Message Broker connection

### High Retry Count

1. Check message broker availability
2. Verify event payload format
3. Check network connectivity
4. Review error messages in `error_message` field

---

## 🚀 Future Enhancements

- [ ] Integrate with RabbitMQ/Kafka
- [ ] Add event versioning
- [ ] Implement event deduplication
- [ ] Add metrics dashboard
- [ ] Support for event replay

---

## 📚 References

- [Outbox Pattern - Microsoft Docs](https://docs.microsoft.com/en-us/azure/architecture/best-practices/transactional-outbox)
- [Reliable Event Publishing](https://microservices.io/patterns/data/transactional-outbox.html)

---

**Last Updated**: 2024-12-XX

