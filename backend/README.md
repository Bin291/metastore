<h1 align="center">MetaStore Backend</h1>

MetaStore is a NestJS-based API for managing secure file storage, approval workflows, and shareable access links.  
It integrates with MinIO for S3-compatible object storage, PostgreSQL (or SQLite) for metadata, Redis for real-time messaging, and optional Supabase services.

---

## ✨ Features

- **Authentication & Authorization**
  - Username/password with hashed credentials (Argon2)
  - JWT access + refresh tokens stored in HTTP-only cookies
  - Role-based guards (`admin`, `user`)
  - Invite-driven user onboarding

- **File Pipeline**
  - Presigned uploads directly to MinIO
  - Metadata registration & moderation queue
  - Approval / rejection workflow with audit logs & notifications
  - Public/private buckets + automatic path prefixes per user

- **Sharing & Collaboration**
  - Tokenized share links with optional password and expiry
  - Toggleable access states and permission levels (view / full)
  - Access analytics (usage counters, last accessed timestamp)

- **Observability**
  - Audit logging for critical actions
  - WebSocket gateway for real-time notifications
  - Modular architecture for future AI moderation and search indexing

---

## 🧱 Project Structure

```
src/
  common/         # decorators, enums, guards, shared DTOs
  config/         # configuration & environment validation
  entities/       # TypeORM entities
  modules/
    auth/         # auth controller, service, JWT strategies
    users/        # user management & profile updates
    invites/      # invite tokens lifecycle
    files/        # file CRUD, moderation, presigned URLs
    share-links/  # share link creation & toggling
    storage/      # MinIO (S3) integration
    notifications/# websocket gateway + DB notifications
    audit/        # audit log service
```

---

## 🔐 Environment Variables

Create a `.env.development` (dev) or `.env` (prod) file alongside the repository.  
Below is a minimal configuration; adjust to match your environment.

```env
NODE_ENV=development
PORT=3001

DATABASE_TYPE=postgres          # "postgres" or "sqlite"
DATABASE_URL=postgres://metastore:metastore@localhost:5432/metastore
SQLITE_PATH=./data/metastore.db # used when DATABASE_TYPE=sqlite

JWT_ACCESS_SECRET=change-me-access
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-refresh
JWT_REFRESH_EXPIRES_IN=7d
AUTH_ACCESS_TOKEN_COOKIE=metastore_access_token
AUTH_REFRESH_TOKEN_COOKIE=metastore_refresh_token
AUTH_COOKIE_SAME_SITE=lax       # lax | strict | none
AUTH_COOKIE_SECURE=false

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=ChangeMe123!
DEFAULT_ADMIN_EMAIL=admin@example.com

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_PRIVATE=metastore-private
MINIO_BUCKET_PUBLIC=metastore-public
MINIO_BUCKET_PENDING=metastore-pending
MINIO_BUCKET_REJECTED=metastore-rejected
MINIO_BUCKET_SANDBOX=metastore-sandbox

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=true

SUPABASE_URL=
SUPABASE_SERVICE_ROLE=

FRONTEND_URL=http://localhost:3000
```

> ℹ️ The workspace blocks writing `.env` files directly—copy the snippet above manually.

---

## 🚀 Running Locally

```bash
# 1. install deps
npm install

# 2. start the API (watch mode)
npm run start:dev

# 3. run tests (optional)
npm test
```

### With Docker Compose (production build)

```bash
docker compose up --build
```

Services started:
- `backend` on port `3001`
- `frontend` on port `3000`
- `postgres` on port `5432`
- `minio` on ports `9000/9001`
- `redis` on port `6379`

### Hot-reload Development Stack

```bash
docker compose -f docker-compose.dev.yml up
```

This mounts the local source folders for rapid iteration.

---

## 🔌 API Highlights

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/accept-invite`
- `GET /users/me`, `PATCH /users/me`
- `POST /invites`, `PATCH /invites/:id/revoke`
- `POST /files/upload-url`, `POST /files`, `PATCH /files/:id/(approve|reject)`
- `POST /share-links`, `PATCH /share-links/:id/toggle`, `POST /share-links/token/:token/access`

Full Swagger/OpenAPI documentation can be added by enabling `SwaggerModule` (not included by default to keep the bootstrap lean).

---

## 🧪 Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage report
npm run test:cov
```

---

## 📦 Deployment Notes

- The provided `Dockerfile` builds a production bundle (`npm run build`) and runs `node dist/main.js`.
- Ensure environment secrets are injected using your orchestrator of choice (Docker secrets, Kubernetes secrets, etc.).
- For SQLite deployments, mount a persistent volume to retain the `.db` file.
- Configure MinIO with TLS or point to an S3-compatible provider for production environments.

---

## 📚 Further Improvements

- Integrate AI moderation providers via the `ModerationTask` entity.
- Add RLS-aware queries and Supabase integration.
- Expand notification gateway with Redis Pub/Sub or message queues.
- Harden share-link access by issuing presigned downloads scoped to link tokens.

---

Made with ❤️ using NestJS 11.
