# 🗄️ MetaStore - File Storage & Management System

A full-stack file storage and management application similar to OmniSearch, built with Next.js and NestJS.

## ✨ Features

- **File Management**: Upload, download, organize files and folders
- **User Roles**: Admin, User, and Guest (via share links)
- **Moderation Workflow**: Pending → Approve/Reject system
- **Share Links**: Create secure share links with password protection and expiry
- **Search**: Full-text search across files and folders
- **Real-time Notifications**: WebSocket-based notifications
- **Audit Logging**: Track all system actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Setup

```bash
# Clone repository
git clone <repo-url>
cd metastore

# Setup all services
make setup

# Start development servers
make start-all
```

### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **MinIO Console**: http://localhost:9001
- **Postgres**: localhost:5432

### Default Credentials
- **Admin**: `admin` / `ChangeMe123!`
- **MinIO**: `minioadmin` / `minioadmin`
- **Postgres**: `postgres` / `postgres`

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide
- **[TEST_GUIDE.md](./TEST_GUIDE.md)** - Comprehensive testing guide
- **[COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md)** - Feature completion summary

## 🛠️ Development

### Makefile Commands

```bash
# Services
make start-all          # Start backend + frontend
make start-dev-be       # Start backend only
make start-dev-fe       # Start frontend only
make minio-up           # Start MinIO
make db-up              # Start Postgres

# Testing
make test-api           # Run API tests
make health-check       # Check all services

# Cleanup
make clean              # Clean build artifacts
make clean-all          # Clean everything

# Build
make build-all          # Build both frontend & backend
```

### Manual Start

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
export NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm install
npm run dev
```

## 🧪 Testing

```bash
# Run API tests
./test-api.sh

# Or use make
make test-api
```

See [TEST_GUIDE.md](./TEST_GUIDE.md) for detailed test cases.

## 📦 Tech Stack

### Frontend
- Next.js 16 (App Router)
- React Query
- Zustand
- Tailwind CSS v4
- TypeScript

### Backend
- NestJS 11
- TypeORM
- PostgreSQL / SQLite
- JWT Authentication
- WebSocket (Notifications)
- MinIO (S3-compatible storage)

## 🏗️ Architecture

```
metastore/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   ├── entities/ # Database entities
│   │   └── common/   # Shared utilities
│   └── dist/         # Compiled output
├── frontend/         # Next.js App
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   └── lib/          # Utilities & services
├── minio/            # MinIO data volume
└── docker-compose.yml
```

## 🔐 Security

- JWT tokens in HTTP-only cookies
- Role-based access control (RBAC)
- Presigned URLs (time-limited)
- Password hashing (Argon2)
- CORS configuration
- Input validation
- Audit logging

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/metastore
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 🎯 Features Status

✅ **Completed**
- Authentication & Authorization
- File/Folder Management
- Share Links System
- Admin Moderation
- User Management
- Invite System
- Search Functionality
- File Preview
- Pagination
- Error Handling

📋 **Optional Enhancements**
- Advanced Search Filters
- PDF Preview
- Notifications UI
- Drag & Drop
- Bulk Operations

## 📄 License

MIT

---

**Made with ❤️ - MetaStore v1.0**

