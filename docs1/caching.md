# ⚡ Caching Implementation

## 🎯 Mục Đích

Caching layer với Redis để:
- Tăng **performance** cho read-heavy operations
- Giảm **database load**
- Improve **response times**
- Support **cache invalidation**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  HTTP Request (GET)                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Cache Interceptor                      │
│  - Generate cache key                   │
│  - Check Redis cache                    │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    Cache Hit?    Cache Miss
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
            │(Redis)   │
            └──────────┘
```

---

## 📁 File Structure

```
backend/src/
├── modules/
│   └── cache/
│       ├── cache.module.ts               # Module definition
│       ├── cache.service.ts              # Redis service
│       └── cache.interceptor.ts          # HTTP interceptor
```

---

## 🔧 Implementation Details

### 1. Service (`cache.service.ts`)

**Key Methods:**

- `get<T>(key)` - Get value from cache
- `set(key, value, ttl)` - Set value in cache
- `delete(key)` - Delete key
- `deletePattern(pattern)` - Delete keys matching pattern
- `exists(key)` - Check if key exists
- `generateKey(prefix, ...parts)` - Generate cache key

### 2. Interceptor (`cache.interceptor.ts`)

- Automatically caches GET requests
- Configurable TTL per endpoint
- Custom cache key prefixes
- Cache invalidation support

---

## 📊 Cache Key Strategy

### Default Key Format

```
cache:{prefix}:{path}:{query}:{userId}
```

### Examples

```
cache:api:/files:{"page":1,"limit":20}:user-123
cache:api:/files/file-456:{}:user-123
cache:share-links:token-abc:{}:anonymous
```

---

## 🎨 Usage Examples

### Automatic Caching (GET Requests)

```typescript
// No code changes needed!
// GET requests are automatically cached

@Get('/files')
@CacheTTL(60) // Cache for 60 seconds
async listFiles(@Query() query: FileQueryDto) {
  // Response will be cached automatically
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
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const file = await this.fileRepository.findOne({ where: { id: fileId } });

    // Cache result
    await this.cacheService.set(cacheKey, file, 300); // 5 minutes

    return file;
  }
}
```

### Cache Invalidation

```typescript
@Injectable()
export class FilesService {
  constructor(private readonly cacheService: CacheService) {}

  async updateFile(fileId: string, dto: UpdateFileDto) {
    // Update file
    const file = await this.fileRepository.update(fileId, dto);

    // Invalidate cache
    const cacheKey = this.cacheService.generateKey('file', fileId);
    await this.cacheService.delete(cacheKey);

    // Invalidate list cache
    await this.cacheService.deletePattern('cache:api:/files:*');

    return file;
  }
}
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Decorators

```typescript
// Set custom TTL
@CacheTTL(300) // 5 minutes
@Get('/files')
async listFiles() { }

// Set custom cache key prefix
@CacheKeyPrefix('files')
@Get('/files')
async listFiles() { }
```

---

## 📈 Cache Strategies

### 1. Cache-Aside (Lazy Loading)

```typescript
// ✅ Used by default
// Check cache → if miss, fetch from DB → cache result
```

### 2. Write-Through

```typescript
// Write to cache and DB simultaneously
async updateFile(id: string, data: any) {
  await this.cacheService.set(key, data);
  await this.fileRepository.update(id, data);
}
```

### 3. Write-Behind (Write-Back)

```typescript
// Write to cache first, DB later (async)
// Not implemented by default
```

---

## 🔍 Cache Invalidation Patterns

### 1. Time-Based (TTL)

```typescript
// Automatic expiration
await cacheService.set(key, value, 60); // Expires in 60 seconds
```

### 2. Event-Based

```typescript
// Invalidate on update
async updateFile(id: string) {
  await this.update(id);
  await cacheService.delete(`file:${id}`);
  await cacheService.deletePattern('files:list:*');
}
```

### 3. Tag-Based

```typescript
// Invalidate by tags (future enhancement)
await cacheService.set(key, value, { tags: ['user:123', 'files'] });
await cacheService.invalidateByTag('user:123');
```

---

## 📊 Cache Key Patterns

### Files

```
cache:api:/files:{"page":1}:user-123          # File list
cache:api:/files/file-456:{}:user-123         # Single file
cache:api:/files/chunked-upload/123:{}:user-123 # Upload status
```

### Share Links

```
cache:share-links:token-abc:{}:anonymous       # Share link access
```

### Users

```
cache:api:/users/me:{}:user-123                # Current user
```

---

## 🧪 Testing

### Unit Test Example

```typescript
describe('CacheService', () => {
  it('should cache and retrieve values', async () => {
    const key = 'test-key';
    const value = { data: 'test' };

    await cacheService.set(key, value, 60);
    const cached = await cacheService.get(key);

    expect(cached).toEqual(value);
  });

  it('should expire cached values', async () => {
    const key = 'test-key';
    await cacheService.set(key, { data: 'test' }, 1); // 1 second

    await new Promise(resolve => setTimeout(resolve, 1100));
    const cached = await cacheService.get(key);

    expect(cached).toBeNull();
  });
});
```

---

## 🔍 Monitoring

### Metrics to Track

- **Cache Hit Rate**: Percentage of requests served from cache
- **Cache Miss Rate**: Percentage of requests requiring DB lookup
- **Average Response Time**: With vs without cache
- **Cache Size**: Memory usage
- **Eviction Rate**: Keys evicted due to memory limits

### Redis Commands

```bash
# Check cache stats
redis-cli INFO stats

# List all cache keys
redis-cli KEYS "cache:*"

# Get cache value
redis-cli GET "cache:api:/files:{}:user-123"

# Clear all cache
redis-cli FLUSHDB
```

---

## 🔍 Troubleshooting

### Cache Not Working

1. Check Redis connection: `redis-cli ping`
2. Verify `REDIS_ENABLED=true`
3. Check logs for Redis errors
4. Verify cache key generation

### Stale Data

1. Check TTL settings
2. Verify cache invalidation on updates
3. Review invalidation patterns
4. Check for race conditions

---

## 🚀 Best Practices

### 1. Appropriate TTL

```typescript
// ✅ Good: Match data freshness requirements
@CacheTTL(60)   // User data: 1 minute
@CacheTTL(300)  // File list: 5 minutes
@CacheTTL(3600) // Static data: 1 hour
```

### 2. Invalidate on Updates

```typescript
// ✅ Good: Invalidate related caches
async updateFile(id: string) {
  await this.update(id);
  await cacheService.delete(`file:${id}`);
  await cacheService.deletePattern('files:list:*');
}
```

### 3. Cache Key Design

```typescript
// ✅ Good: Include relevant parameters
cache:api:/files:{"page":1,"limit":20}:user-123

// ❌ Bad: Missing parameters
cache:api:/files
```

---

## 🚀 Future Enhancements

- [ ] Cache warming strategies
- [ ] Distributed cache invalidation
- [ ] Cache compression
- [ ] Cache analytics dashboard
- [ ] Multi-level caching (L1: memory, L2: Redis)

---

## 📚 References

- [Redis Documentation](https://redis.io/docs/)
- [Caching Strategies](https://aws.amazon.com/caching/best-practices/)

---

**Last Updated**: 2024-12-XX

