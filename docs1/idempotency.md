# 🔑 Idempotency Implementation

## 🎯 Mục Đích

Idempotency đảm bảo **duplicate requests** không gây side effects bằng cách:
- Track requests bằng idempotency keys
- Cache responses cho duplicate requests
- Return same response cho identical requests
- Prevent duplicate processing

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Client Request                         │
│  Headers: Idempotency-Key: abc123      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Idempotency Interceptor                │
│  - Extract idempotency key             │
│  - Generate request hash               │
│  - Check for duplicate                 │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    Duplicate?    New Request
        │             │
        ▼             ▼
┌──────────┐   ┌──────────┐
│Return    │   │Execute   │
│Cached    │   │Request   │
│Response  │   │          │
└──────────┘   └────┬─────┘
                    │
                    ▼
            ┌──────────┐
            │Cache     │
            │Response  │
            └──────────┘
```

---

## 📁 File Structure

```
backend/src/
├── entities/
│   └── idempotency-key.entity.ts        # Idempotency key entity
├── modules/
│   └── idempotency/
│       ├── idempotency.module.ts         # Module definition
│       ├── idempotency.service.ts        # Core service
│       └── idempotency.interceptor.ts    # HTTP interceptor
```

---

## 🔧 Implementation Details

### 1. Entity (`idempotency-key.entity.ts`)

```typescript
@Entity({ name: 'idempotency_keys' })
@Unique(['key'])
export class IdempotencyKey extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ name: 'request_hash' })
  requestHash: string; // Hash of request body + headers

  @Column({ name: 'response_status' })
  responseStatus: number;

  @Column({ name: 'response_body', type: 'text' })
  responseBody: string; // JSON string

  @Column({ name: 'expires_at' })
  expiresAt: Date;
}
```

### 2. Service (`idempotency.service.ts`)

**Key Methods:**

- `generateKey()` - Generate idempotency key
- `generateRequestHash()` - Hash request for comparison
- `checkDuplicate()` - Check if request is duplicate
- `storeResponse()` - Cache response
- `cleanupExpired()` - Remove expired keys

### 3. Interceptor (`idempotency.interceptor.ts`)

- Intercepts HTTP requests
- Checks for `Idempotency-Key` header
- Returns cached response if duplicate
- Caches successful responses

---

## 📊 Database Schema

```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  request_hash VARCHAR(255) NOT NULL,
  response_status INT NOT NULL,
  response_body TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
```

---

## 🔄 Workflow

### Step 1: Client Sends Request

```http
POST /api/v1/files
Idempotency-Key: abc123-def456-ghi789
Content-Type: application/json

{
  "name": "video.mp4",
  "size": 1000000
}
```

### Step 2: Interceptor Checks

```typescript
// Automatic check
const idempotencyKey = request.headers['idempotency-key'];
const requestHash = generateRequestHash(request.body, request.headers);
const duplicate = await idempotencyService.checkDuplicate(key, requestHash);
```

### Step 3: Handle Request

```typescript
if (duplicate.isDuplicate) {
  // Return cached response
  return duplicate.response;
} else {
  // Execute request
  const response = await executeRequest();
  // Cache response
  await idempotencyService.storeResponse(key, requestHash, status, response);
  return response;
}
```

---

## 🎨 Usage Examples

### Client-Side (JavaScript)

```typescript
// Generate idempotency key (client-side)
const idempotencyKey = crypto.randomUUID();

// Make request with idempotency key
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

### Server-Side (Automatic)

```typescript
// No code changes needed!
// Interceptor handles everything automatically

@Post('/files')
async uploadFile(@Body() dto: RegisterFileDto) {
  // This will be idempotent automatically
  return this.filesService.registerFile(dto);
}
```

---

## ⚙️ Configuration

### TTL Configuration

```typescript
// Default TTL: 1 hour (3600 seconds)
await idempotencyService.storeResponse(
  key,
  requestHash,
  status,
  body,
  3600, // TTL in seconds
);
```

### Cleanup Job

```typescript
// Run cleanup periodically (e.g., daily)
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async cleanupExpiredKeys() {
  const deleted = await idempotencyService.cleanupExpired();
  console.log(`Cleaned up ${deleted} expired idempotency keys`);
}
```

---

## 🔍 Request Hash Generation

### What's Included

```typescript
const requestHash = generateRequestHash(
  request.body,        // Request body
  {
    'content-type': headers['content-type'],
    // Other relevant headers
  },
);
```

### Why Request Hash?

- Detects if same idempotency key is used with different request
- Warns about potential misuse
- Still returns cached response for idempotency

---

## 📈 Best Practices

### 1. Generate Keys Client-Side

```typescript
// ✅ Good: Generate on client
const key = crypto.randomUUID();

// ❌ Bad: Don't rely on server-generated keys
```

### 2. Use Same Key for Retries

```typescript
// ✅ Good: Retry with same key
const key = 'abc123';
await fetch('/api/files', { headers: { 'Idempotency-Key': key } });
await fetch('/api/files', { headers: { 'Idempotency-Key': key } }); // Retry

// ❌ Bad: New key for retry
await fetch('/api/files', { headers: { 'Idempotency-Key': 'key1' } });
await fetch('/api/files', { headers: { 'Idempotency-Key': 'key2' } }); // Wrong!
```

### 3. Appropriate TTL

```typescript
// ✅ Good: Match business requirements
// File upload: 1 hour
// Payment: 24 hours
// Simple CRUD: 5 minutes
```

---

## 🧪 Testing

### Unit Test Example

```typescript
describe('IdempotencyInterceptor', () => {
  it('should return cached response for duplicate request', async () => {
    const key = 'test-key-123';
    
    // First request
    const response1 = await request(app)
      .post('/api/files')
      .set('Idempotency-Key', key)
      .send({ name: 'test.mp4' });

    // Duplicate request
    const response2 = await request(app)
      .post('/api/files')
      .set('Idempotency-Key', key)
      .send({ name: 'test.mp4' });

    expect(response2.status).toBe(response1.status);
    expect(response2.body).toEqual(response1.body);
  });
});
```

---

## 🔍 Troubleshooting

### Keys Not Working

1. Check if `Idempotency-Key` header is sent
2. Verify key format (should be string)
3. Check if key expired (default: 1 hour)
4. Review logs for errors

### Different Responses for Same Key

1. Check request hash generation
2. Verify request body/headers are identical
3. Review idempotency service logs
4. Check for race conditions

---

## 🚀 Future Enhancements

- [ ] Support for Redis-based idempotency (faster)
- [ ] Configurable TTL per endpoint
- [ ] Idempotency key validation
- [ ] Metrics and monitoring
- [ ] Key rotation strategy

---

## 📚 References

- [Idempotency Keys - Stripe](https://stripe.com/docs/api/idempotent_requests)
- [HTTP Idempotency](https://tools.ietf.org/html/draft-ietf-httpapi-idempotency-key-header-00)

---

**Last Updated**: 2024-12-XX

