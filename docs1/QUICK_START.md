# 🚀 Quick Start Guide

Hướng dẫn nhanh để bắt đầu sử dụng các patterns trong MetaStore.

---

## 📋 Prerequisites

1. **Node.js** >= 18
2. **Redis** (for caching)
3. **PostgreSQL** or **SQLite** (database)

---

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
# Database
DATABASE_TYPE=sqlite
SQLITE_PATH=data/metastore.db

# Redis (for caching)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Other configs...
```

### 3. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
redis-server
```

### 4. Start Application

```bash
npm run start:dev
```

---

## ✅ Verify Installation

### Check Modules Loaded

Look for these logs on startup:

```
[OutboxModule] Outbox module initialized
[SagaModule] Saga module initialized
[IdempotencyModule] Idempotency module initialized
[CacheModule] Cache module initialized
[OutboxPollerService] Starting outbox poller...
[CacheService] Redis connected
```

### Test Idempotency

```bash
# Generate idempotency key
IDEMPOTENCY_KEY=$(uuidgen)

# First request
curl -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"name": "test.mp4", "size": 1000}'

# Second request (should return cached response)
curl -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"name": "test.mp4", "size": 1000}'
```

### Test Caching

```bash
# First request (cache miss)
time curl http://localhost:3001/api/v1/files?page=1&limit=20

# Second request (cache hit - should be faster)
time curl http://localhost:3001/api/v1/files?page=1&limit=20
```

---

## 📚 Next Steps

1. **Read Documentation**
   - [Outbox Pattern](./outbox-pattern.md)
   - [Saga Pattern](./saga-pattern.md)
   - [Idempotency](./idempotency.md)
   - [Caching](./caching.md)

2. **Try Examples**
   - [API Examples](./api-examples.md)
   - [Integration Guide](./integration-guide.md)

3. **Integrate into Your Code**
   - Follow [Integration Guide](./integration-guide.md)
   - Use examples as reference

---

## 🆘 Troubleshooting

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check connection settings
# Verify REDIS_HOST and REDIS_PORT in .env
```

### Outbox Events Not Publishing

```bash
# Check poller is running
# Look for: "Starting outbox poller..."

# Check database for pending events
sqlite3 data/metastore.db "SELECT * FROM outbox_events WHERE status='pending'"
```

### Cache Not Working

```bash
# Check Redis connection
redis-cli ping

# Check cache keys
redis-cli KEYS "cache:*"

# Verify REDIS_ENABLED=true
```

---

## 📖 Documentation Index

- [README](./README.md) - Overview
- [Outbox Pattern](./outbox-pattern.md) - Event publishing
- [Saga Pattern](./saga-pattern.md) - Multi-step transactions
- [Idempotency](./idempotency.md) - Duplicate request handling
- [Caching](./caching.md) - Redis caching
- [Integration Guide](./integration-guide.md) - How to integrate
- [API Examples](./api-examples.md) - API usage examples
- [Implementation Summary](./implementation-summary.md) - Technical details

---

**Ready to go!** 🎉

