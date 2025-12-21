# Caching Plan

## Layers
- **Redis cache** for read-heavy API responses (metadata):
  - `files:list` per user/filters
  - `share-links:token:<token>` (access check result)
  - TTL suggestion: 60s–120s; keep small to avoid stale ACL changes.
- **HTTP caching**:
  - `Cache-Control: private, max-age=60` for list/detail metadata endpoints (when user-authenticated).
  - ETag for file metadata (id, updatedAt, visibility, status). Respond 304 if unchanged.

## Keys
- Files list: `files:list:user:<userId>:page:<p>:limit:<l>:search:<s>:parent:<pid>:status:<st>`
- Share link access: `share:token:<token>`

## Invalidation
- On file mutate (upload/register/update/delete/visibility change): delete `files:list:user:*` keys for owner and global lists.
- On share link toggle/delete: delete `share:token:<token>`.

## TTL
- Default 60s for lists/access results.
- Avoid caching download presigned URLs (they already have short expiry).

## Implementation Notes
- Use Nest CacheModule with Redis store; apply `CacheInterceptor` on read controllers (`files.controller` list, `share-links.controller` token access).
- Add ETag middleware/interceptor computing hash of response body (e.g., hash of DTO); compare `If-None-Match`.

