# 🔄 Saga Pattern Implementation

## 🎯 Mục Đích

Saga Pattern xử lý **multi-step distributed transactions** với:
- Step-by-step execution
- Automatic compensation (rollback) on failure
- State tracking và recovery
- Idempotent steps

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Saga Orchestrator                      │
│  - Register saga definitions            │
│  - Execute steps sequentially           │
│  - Handle compensation on failure      │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Step 1 │ │Step 2 │ │Step 3 │
│Execute│ │Execute│ │Execute│
└───┬───┘ └───┬───┘ └───┬───┘
    │          │          │
    └──────────┼──────────┘
               │
        ❌ Failure
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Step 3 │ │Step 2 │ │Step 1 │
│Compens│ │Compens│ │Compens│
└───────┘ └───────┘ └───────┘
```

---

## 📁 File Structure

```
backend/src/
├── entities/
│   └── saga-instance.entity.ts          # Saga instance entity
├── common/enums/
│   └── saga-status.enum.ts              # Saga status enum
├── modules/
│   └── saga/
│       ├── saga.module.ts                # Module definition
│       ├── saga-orchestrator.service.ts # Orchestrator service
│       └── saga-step.interface.ts        # Step interface
```

---

## 🔧 Implementation Details

### 1. Entity (`saga-instance.entity.ts`)

```typescript
@Entity({ name: 'saga_instances' })
export class SagaInstance extends BaseEntity {
  @Column({ name: 'saga_type' })
  sagaType: string;

  @Column({ default: SagaStatus.PENDING })
  status: SagaStatus;

  @Column({ type: 'text' })
  payload: string; // JSON - initial data

  @Column({ name: 'current_step', default: 0 })
  currentStep: number;

  @Column({ name: 'completed_steps', nullable: true })
  completedSteps?: string; // JSON array

  @Column({ name: 'compensation_data', nullable: true })
  compensationData?: string; // JSON
}
```

### 2. Saga Definition

```typescript
interface SagaStep {
  stepNumber: number;
  name: string;
  execute: (data: any) => Promise<any>;
  compensate?: (data: any, compensationData: any) => Promise<void>;
}

interface SagaDefinition {
  sagaType: string;
  steps: SagaStep[];
}
```

### 3. Orchestrator Service

**Key Methods:**

- `registerSaga()` - Register saga definition
- `startSaga()` - Start new saga instance
- `executeSaga()` - Execute saga steps
- `compensateSaga()` - Compensate (rollback) on failure

---

## 📊 Database Schema

```sql
CREATE TABLE saga_instances (
  id UUID PRIMARY KEY,
  saga_type VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payload TEXT NOT NULL,
  current_step INT DEFAULT 0,
  completed_steps TEXT NULL,
  compensation_data TEXT NULL,
  error_message TEXT NULL,
  trace_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_saga_instances_status ON saga_instances(status);
CREATE INDEX idx_saga_instances_type ON saga_instances(saga_type);
```

---

## 🔄 Workflow

### Step 1: Register Saga

```typescript
// In module initialization
constructor() {
  this.sagaOrchestrator.registerSaga({
    sagaType: 'file.upload',
    steps: [
      {
        stepNumber: 1,
        name: 'register_file',
        execute: async (data) => { /* ... */ },
        compensate: async (data) => { /* ... */ },
      },
      // ... more steps
    ],
  });
}
```

### Step 2: Start Saga

```typescript
const sagaInstance = await sagaOrchestrator.startSaga(
  'file.upload',
  {
    userId: '123',
    fileName: 'video.mp4',
    // ... initial data
  },
);
```

### Step 3: Execute Steps

```typescript
// Automatic execution
for (const step of definition.steps) {
  const result = await step.execute(data);
  // Update data with result
  // Mark step as completed
}
```

### Step 4: Compensation (on failure)

```typescript
// If any step fails
for (let i = completedSteps.length - 1; i >= 0; i--) {
  const step = definition.steps[completedSteps[i]];
  if (step.compensate) {
    await step.compensate(data, compensationData);
  }
}
```

---

## 🎨 Example: File Upload Saga

### Saga Definition

```typescript
@Injectable()
export class FileUploadSaga {
  getSagaDefinition() {
    return {
      sagaType: 'file.upload',
      steps: [
        {
          stepNumber: 1,
          name: 'register_file',
          execute: async (data) => {
            // File registration
            const file = await filesService.registerFile(data.userId, data.dto);
            return { fileId: file.id };
          },
          compensate: async (data) => {
            // Delete file record
            if (data.fileId) {
              await filesService.deleteFile(data.fileId);
            }
          },
        },
        {
          stepNumber: 2,
          name: 'process_media',
          execute: async (data) => {
            // Process video for HLS
            if (data.mimeType?.startsWith('video/')) {
              await mediaService.processVideoForHLS(data.fileId, data.storageKey);
            }
            return data;
          },
          compensate: async (data) => {
            // Delete processed media
            await mediaService.deleteProcessedMedia(data.storageKey);
          },
        },
        {
          stepNumber: 3,
          name: 'send_notification',
          execute: async (data) => {
            // Send notification
            await notificationsService.createAndDispatch({
              userId: data.userId,
              type: 'file.uploaded',
              message: 'File uploaded successfully',
            });
            return data;
          },
          // No compensation needed for notifications
        },
      ],
    };
  }
}
```

### Usage

```typescript
// Start saga
const sagaInstance = await sagaOrchestrator.startSaga('file.upload', {
  userId: '123',
  dto: { name: 'video.mp4', size: 1000000 },
});

// Saga executes automatically
// If any step fails, compensation runs automatically
```

---

## 📈 Saga Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Saga created but not started |
| `IN_PROGRESS` | Saga is executing steps |
| `COMPLETED` | All steps completed successfully |
| `COMPENSATING` | Compensation is running |
| `COMPENSATED` | Compensation completed |
| `FAILED` | Saga failed and cannot be compensated |

---

## 🔍 Monitoring

### Track Saga Progress

```typescript
const sagaInstance = await sagaOrchestrator.getSagaInstance(sagaId);
console.log({
  status: sagaInstance.status,
  currentStep: sagaInstance.currentStep,
  completedSteps: JSON.parse(sagaInstance.completedSteps || '[]'),
});
```

### Metrics

- **Saga Success Rate**: Percentage of completed sagas
- **Average Steps**: Average number of steps per saga
- **Compensation Rate**: Percentage of sagas requiring compensation
- **Average Duration**: Time to complete a saga

---

## 🧪 Testing

### Unit Test Example

```typescript
describe('FileUploadSaga', () => {
  it('should execute all steps successfully', async () => {
    const sagaInstance = await sagaOrchestrator.startSaga('file.upload', {
      userId: '123',
      dto: { name: 'test.mp4', size: 1000 },
    });

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updated = await sagaOrchestrator.getSagaInstance(sagaInstance.id);
    expect(updated.status).toBe(SagaStatus.COMPLETED);
  });

  it('should compensate on failure', async () => {
    // Mock a step to fail
    // Verify compensation runs
  });
});
```

---

## 🔍 Troubleshooting

### Saga Stuck in IN_PROGRESS

1. Check logs for errors
2. Verify step execution logic
3. Check database for saga state
4. Manually trigger compensation if needed

### Compensation Not Running

1. Verify compensate functions are defined
2. Check error handling in steps
3. Review compensation logic
4. Check logs for compensation errors

---

## 🚀 Best Practices

1. **Idempotent Steps**: Make steps idempotent to allow retries
2. **Compensation Logic**: Always implement compensation for critical steps
3. **Error Handling**: Handle errors gracefully in each step
4. **State Management**: Keep saga state in database for recovery
5. **Monitoring**: Track saga progress and failures

---

## 📚 References

- [Saga Pattern - Microservices.io](https://microservices.io/patterns/data/saga.html)
- [Distributed Transactions](https://www.enterpriseintegrationpatterns.com/patterns/conversation/Saga.html)

---

**Last Updated**: 2024-12-XX

