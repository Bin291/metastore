# Events & Messaging

## Broker
- RabbitMQ (topic or direct exchange).
- Durable queues, manual ack, retry with dead-letter (DLX) + delay or limited requeue attempts.

## Event Contracts (examples)
- `file.uploaded`
  - payload: `{ id, ownerId, name, path, size, mimeType, visibility, createdAt }`
  - triggered after file register/upload completes.
- `file.deleted`
  - payload: `{ id, ownerId, path, visibility, deletedAt }`
- `sharelink.created`
  - payload: `{ id, token, resourceId, permission, expiresAt, createdBy }`

## Message Format
```json
{
  "id": "uuid",
  "type": "file.uploaded",
  "timestamp": "iso8601",
  "data": { ...payload },
  "meta": {
    "traceId": "uuid",
    "retries": 0
  }
}
```

## Retry/Backoff
- Consumer acks only on success.
- On failure: reject with requeue=false, message routed to DLQ with `x-death` header.
- Backoff strategy: DLQ with per-queue delay (e.g., 5s, 30s) and max attempts (e.g., 5). After max, park in dead-letter parking lot for manual review.

## Minimal Flow
- Publisher service (Nest): inject AmqpConnection, `publish('file.uploaded', payload)`.
- Subscriber: `@RabbitSubscribe` on queue `file.uploaded.worker`, auto-ack disabled; try/catch and ack/nack accordingly.

