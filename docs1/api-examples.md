# 📡 API Examples

Ví dụ sử dụng các patterns qua API requests.

---

## 🔑 Idempotency Examples

### Upload File (Idempotent)

```bash
# First request
curl -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: abc123-def456-ghi789" \
  -d '{
    "name": "video.mp4",
    "path": "videos/video.mp4",
    "size": 1000000,
    "mimeType": "video/mp4",
    "visibility": "private"
  }'

# Retry with same key (returns cached response)
curl -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: abc123-def456-ghi789" \
  -d '{
    "name": "video.mp4",
    "path": "videos/video.mp4",
    "size": 1000000,
    "mimeType": "video/mp4",
    "visibility": "private"
  }'
```

### Payment (Idempotent)

```bash
curl -X POST http://localhost:3001/api/v1/payments/subscriptions \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: payment-123" \
  -d '{
    "plan": "plus",
    "paymentMethod": "bank_transfer"
  }'
```

---

## ⚡ Caching Examples

### List Files (Cached)

```bash
# First request (cache miss)
curl http://localhost:3001/api/v1/files?page=1&limit=20

# Second request (cache hit - faster)
curl http://localhost:3001/api/v1/files?page=1&limit=20
```

### Get File (Cached)

```bash
# Cached automatically
curl http://localhost:3001/api/v1/files/file-id-123
```

---

## 📦 Outbox Pattern Examples

### Check Pending Events

```bash
# Check outbox events (via admin endpoint - if implemented)
curl http://localhost:3001/api/v1/admin/outbox/pending
```

### Event Flow

1. **Create File** → Creates outbox event
2. **Poller** → Processes event every 5 seconds
3. **Event Published** → Status updated to `published`

---

## 🔄 Saga Pattern Examples

### Start File Upload Saga

```bash
# Start saga (if endpoint exposed)
curl -X POST http://localhost:3001/api/v1/files/upload-saga \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "fileName": "video.mp4",
    "size": 1000000
  }'

# Response
{
  "id": "saga-instance-id",
  "sagaType": "file.upload",
  "status": "in_progress",
  "currentStep": 0
}
```

### Check Saga Status

```bash
# Get saga status
curl http://localhost:3001/api/v1/sagas/saga-instance-id

# Response
{
  "id": "saga-instance-id",
  "status": "completed",
  "currentStep": 3,
  "completedSteps": [1, 2, 3]
}
```

---

## 🔗 Combined Example

### Complete File Upload Flow

```bash
# Step 1: Upload file with idempotency
curl -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: upload-123" \
  -d '{
    "name": "video.mp4",
    "path": "videos/video.mp4",
    "size": 1000000,
    "mimeType": "video/mp4"
  }'

# This triggers:
# 1. Idempotency check
# 2. Outbox event creation
# 3. Saga execution (if configured)
# 4. Cache invalidation

# Step 2: Check file (cached)
curl http://localhost:3001/api/v1/files/file-id-123

# Step 3: Update file (invalidates cache)
curl -X PATCH http://localhost:3001/api/v1/files/file-id-123 \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: update-123" \
  -d '{
    "name": "video-updated.mp4"
  }'
```

---

## 📊 Monitoring Examples

### Check Cache Stats

```bash
# Redis CLI
redis-cli INFO stats

# Check cache keys
redis-cli KEYS "cache:*"

# Get cache value
redis-cli GET "cache:api:/files:{\"page\":1}:user-123"
```

### Check Outbox Events

```sql
-- SQL query
SELECT * FROM outbox_events 
WHERE status = 'pending' 
ORDER BY created_at ASC 
LIMIT 10;
```

### Check Saga Instances

```sql
-- SQL query
SELECT * FROM saga_instances 
WHERE status = 'in_progress' 
ORDER BY created_at DESC;
```

---

## 🧪 Testing Examples

### Test Idempotency

```bash
# Script to test idempotency
IDEMPOTENCY_KEY="test-key-$(date +%s)"

# First request
RESPONSE1=$(curl -s -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"name": "test.mp4", "size": 1000}')

# Second request (should return same response)
RESPONSE2=$(curl -s -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"name": "test.mp4", "size": 1000}')

# Compare responses
if [ "$RESPONSE1" == "$RESPONSE2" ]; then
  echo "✅ Idempotency works!"
else
  echo "❌ Idempotency failed"
fi
```

### Test Caching

```bash
# Measure response time
time curl http://localhost:3001/api/v1/files?page=1&limit=20

# First request: ~200ms (cache miss)
# Second request: ~10ms (cache hit)
```

---

## 📝 Postman Collection

### Import into Postman

```json
{
  "info": {
    "name": "MetaStore Patterns API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Upload File (Idempotent)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Idempotency-Key",
            "value": "{{$randomUUID}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"video.mp4\",\n  \"size\": 1000000\n}"
        },
        "url": {
          "raw": "http://localhost:3001/api/v1/files",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3001",
          "path": ["api", "v1", "files"]
        }
      }
    }
  ]
}
```

---

## 🔍 Debugging

### Check Idempotency Keys

```sql
SELECT * FROM idempotency_keys 
WHERE expires_at > datetime('now') 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Cache

```bash
# List all cache keys
redis-cli --scan --pattern "cache:*"

# Get specific cache value
redis-cli GET "cache:api:/files:{}:user-123"

# Check TTL
redis-cli TTL "cache:api:/files:{}:user-123"
```

---

**Last Updated**: 2024-12-XX

