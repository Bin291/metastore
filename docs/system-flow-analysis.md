# 📊 Phân Tích Luồng Hệ Thống MetaStore

## 🎯 Tổng Quan Hệ Thống

**MetaStore** là một nền tảng lưu trữ và chia sẻ file hiện đại với các tính năng:
- Upload file chunked (chia nhỏ) cho file lớn
- Quản lý người dùng với hệ thống mời (invite)
- Chia sẻ file qua share links với bảo mật
- Xử lý media (video HLS streaming)
- Thanh toán và subscription
- Thông báo real-time qua WebSocket
- Audit logging cho tất cả hành động quan trọng

---

## 🔄 Luồng Chính Của Hệ Thống

### 1. **Luồng Xác Thực (Authentication Flow)**

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    { username, password }
       ▼
┌─────────────────────┐
│   Backend API       │
│  (NestJS)           │
└──────┬──────────────┘
       │
       │ 2. Verify credentials (Argon2 hash)
       │    Check user status (active/disabled/pending)
       ▼
┌─────────────────────┐
│   Database          │
│  (PostgreSQL/SQLite)│
└──────┬──────────────┘
       │
       │ 3. Generate JWT tokens
       │    - Access token (15 phút)
       │    - Refresh token (7 ngày)
       ▼
┌─────────────────────┐
│   Response          │
│  - Set httpOnly cookies
│  - Return user info
└─────────────────────┘
       │
       │ 4. Client stores cookies
       │    Auto-include in requests
       ▼
┌─────────────┐
│   Client    │
│  (Authenticated)   │
└─────────────┘
```

**Đặc điểm:**
- JWT tokens lưu trong HTTP-only cookies (bảo mật XSS)
- Auto-refresh token khi access token hết hạn
- Role-based access control (admin, staff, user)

---

### 2. **Luồng Upload File (Chunked Upload Flow)**

```
┌─────────────┐
│   User      │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User chọn file (ví dụ: 100MB video)
       │    Frontend tự động cắt thành chunks 5MB
       ▼
┌─────────────────────┐
│   Frontend          │
│  - Chunking logic   │
│  - 20 chunks x 5MB  │
└──────┬──────────────┘
       │
       │ 2. POST /api/files/chunked-upload/initiate
       │    { name, path, size, mimeType, visibility }
       ▼
┌─────────────────────┐
│   Backend API       │
│  FilesService       │
└──────┬──────────────┘
       │
       │ 3. Tạo file record trong DB
       │    Initiate MinIO multipart upload
       │    Generate presigned URLs cho chunks
       ▼
┌─────────────────────┐
│   MinIO Storage     │
│  (S3-compatible)    │
└─────────────────────┘
       │
       │ 4. Return { fileId, uploadId, uploadUrls[] }
       ▼
┌─────────────────────┐
│   Frontend          │
│  - Upload 3 chunks │
│    parallel cùng lúc│
│  - Retry failed     │
│  - Track progress   │
└──────┬──────────────┘
       │
       │ 5. PUT {uploadUrls[i]} với chunk data
       │    Nhận ETag cho mỗi chunk
       │
       │ 6. Lặp lại cho đến khi hết chunks
       │    Progress: 15%, 30%, 45%, ..., 100%
       │
       │ 7. POST /api/files/chunked-upload/complete
       │    { fileId, uploadId, parts: [{partNumber, etag}] }
       ▼
┌─────────────────────┐
│   Backend API       │
│  - Complete multipart│
│  - Merge chunks     │
│  - Update file status│
│  - Trigger processing│
└──────┬──────────────┘
       │
       │ 8. Nếu là video → HLS processing
       │    - Extract segments
       │    - Generate .m3u8 playlist
       │    - Store in storage
       ▼
┌─────────────────────┐
│   Media Service     │
│  (FFmpeg)           │
└─────────────────────┘
       │
       │ 9. Create audit log
       │    Send notification
       ▼
┌─────────────┐
│   Complete  │
│  File ready │
└─────────────┘
```

**Đặc điểm:**
- Chunked upload giảm tải server RAM
- Parallel upload tăng tốc độ
- Retry logic với exponential backoff
- Real-time progress tracking
- HLS streaming cho video

---

### 3. **Luồng Chia Sẻ File (Share Link Flow)**

```
┌─────────────┐
│   Owner     │
│  (User)     │
└──────┬──────┘
       │
       │ 1. Chọn file/folder cần chia sẻ
       │    POST /api/share-links
       │    { resourceId, permission, expiresAt?, password? }
       ▼
┌─────────────────────┐
│   Backend API       │
│  ShareLinksService  │
└──────┬──────────────┘
       │
       │ 2. Generate unique token (UUID)
       │    Create share link record
       │    Set permissions (view/full)
       ▼
┌─────────────────────┐
│   Database          │
│  ShareLink entity   │
└─────────────────────┘
       │
       │ 3. Return { id, token, expiresAt, ... }
       ▼
┌─────────────┐
│   Owner     │
│  Copy link  │
│  Share với người khác│
└─────────────┘
       │
       │ 4. Người nhận truy cập:
       │    GET /share/[token]
       ▼
┌─────────────────────┐
│   Public Page        │
│  (Frontend)          │
└──────┬──────────────┘
       │
       │ 5. Validate token
       │    POST /api/share-links/token/:token/access
       │    { password? }
       ▼
┌─────────────────────┐
│   Backend API       │
│  - Check active      │
│  - Check expiry      │
│  - Verify password   │
│  - Increment access  │
│    count             │
└──────┬──────────────┘
       │
       │ 6. Return presigned download URL
       │    (hoặc streaming URL cho video)
       ▼
┌─────────────┐
│   Recipient │
│  Download/  │
│  View file  │
└─────────────┘
```

**Đặc điểm:**
- Token-based access (không cần đăng nhập)
- Optional password protection
- Expiry date support
- Access analytics (count, last accessed)
- Permission levels (view only / full access)

---

### 4. **Luồng Thanh Toán (Payment Flow)**

```
┌─────────────┐
│   User      │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. Chọn subscription plan
       │    (FREE / PLUS / PRO)
       │    POST /api/payments/subscriptions
       │    { plan, paymentMethod }
       ▼
┌─────────────────────┐
│   Backend API       │
│  PaymentsService    │
└──────┬──────────────┘
       │
       │ 2. Create subscription record
       │    Status: PENDING
       │    Generate QR code (nếu bank transfer)
       │    Notify admins
       ▼
┌─────────────────────┐
│   Database          │
│  Subscription entity│
└─────────────────────┘
       │
       │ 3. Return { subscription, qrCode, paymentInfo }
       ▼
┌─────────────┐
│   User      │
│  - Scan QR  │
│  - Transfer │
│  - Upload   │
│    proof    │
└─────────────┘
       │
       │ 4. Admin review payment
       │    GET /api/payments/pending
       │    POST /api/payments/:id/approve
       ▼
┌─────────────────────┐
│   Admin Panel       │
│  (Backend)          │
└──────┬──────────────┘
       │
       │ 5. Approve payment
       │    - Update subscription status
       │    - Upgrade storage quota
       │    - Notify user
       ▼
┌─────────────────────┐
│   StorageQuotaService│
│  - Update user quota│
│  - Set expiry date  │
└─────────────────────┘
       │
       │ 6. Send notification
       │    WebSocket + DB notification
       ▼
┌─────────────┐
│   User      │
│  Subscription│
│  Activated   │
└─────────────┘
```

**Đặc điểm:**
- Manual approval workflow
- QR code generation cho bank transfer
- Storage quota management
- Auto-expiry handling

---

### 5. **Luồng Thông Báo Real-time (Notification Flow)**

```
┌─────────────────────┐
│   Backend Service   │
│  (Event triggered)  │
└──────┬──────────────┘
       │
       │ 1. Event occurs
       │    - File approved/rejected
       │    - Payment approved
       │    - Share link accessed
       │
       │ 2. NotificationsService.createAndDispatch()
       │    - Save to database
       │    - Emit via WebSocket
       ▼
┌─────────────────────┐
│   Database          │
│  Notification entity│
└──────┬──────────────┘
       │
       │ 3. NotificationsGateway.emitToUser()
       │    Find user's active sockets
       ▼
┌─────────────────────┐
│   WebSocket Server  │
│  (Socket.IO)        │
└──────┬──────────────┘
       │
       │ 4. Emit 'notification' event
       │    { id, type, message, payload }
       ▼
┌─────────────┐
│   Client    │
│  (Frontend) │
│  - Listen   │
│  - Display  │
│  - Mark read│
└─────────────┘
```

**Đặc điểm:**
- WebSocket connection per user
- Persistent notifications in DB
- Real-time delivery
- Read/unread status

---

## 🏗️ Kiến Trúc Hệ Thống

### **Backend Architecture (NestJS)**

```
┌─────────────────────────────────────────┐
│         API Layer (Controllers)         │
│  - AuthController                        │
│  - FilesController                      │
│  - ShareLinksController                 │
│  - PaymentsController                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Service Layer (Business Logic)     │
│  - AuthService                          │
│  - FilesService                         │
│  - StorageService                       │
│  - MediaProcessingService                │
│  - PaymentsService                      │
│  - NotificationsService                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Data Layer                         │
│  - TypeORM Entities                     │
│  - Repository Pattern                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      External Services                  │
│  - MinIO (S3 Storage)                   │
│  - PostgreSQL/SQLite                    │
│  - Redis (optional)                     │
│  - FFmpeg (Media Processing)            │
└─────────────────────────────────────────┘
```

### **Frontend Architecture (Next.js 16)**

```
┌─────────────────────────────────────────┐
│      Pages (App Router)                 │
│  - (auth)/login                         │
│  - (dashboard)/files                    │
│  - (dashboard)/admin                    │
│  - share/[token]                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Components Layer                   │
│  - UI Components (shadcn/ui)             │
│  - Business Components                  │
│  - Layout Components                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Services & Hooks                   │
│  - API Client (fetch wrapper)           │
│  - React Query (data fetching)           │
│  - Zustand (state management)            │
│  - Custom Hooks                         │
└─────────────────────────────────────────┘
```

---

## 🔐 Bảo Mật

### **Authentication & Authorization**
- JWT tokens với httpOnly cookies
- Role-based access control (RBAC)
- Password hashing với Argon2
- Refresh token rotation

### **File Security**
- Presigned URLs với expiry
- Bucket isolation (private/public)
- Share link token validation
- Optional password protection

### **API Security**
- CORS configuration
- Input validation (DTOs)
- SQL injection prevention (TypeORM)
- XSS protection (httpOnly cookies)

---

## 📊 Data Flow

### **File Upload Data Flow**

```
Client → API → Database (metadata)
         ↓
      MinIO (file storage)
         ↓
   Media Processing (if video)
         ↓
      HLS Segments → MinIO
         ↓
   Notification → WebSocket → Client
```

### **Share Link Data Flow**

```
Owner → Create Share Link → Database
                              ↓
Recipient → Validate Token → Database
                              ↓
         Get Presigned URL → MinIO
                              ↓
         Download/Stream → Client
```

---

## 🚀 Performance Optimizations

1. **Chunked Upload**: Giảm memory usage, tăng reliability
2. **Parallel Upload**: Upload nhiều chunks cùng lúc
3. **Presigned URLs**: Giảm tải backend, direct upload to storage
4. **Caching**: Redis cache cho metadata (planned)
5. **HLS Streaming**: Adaptive bitrate cho video
6. **Database Indexing**: Indexes trên các columns thường query

---

## 📈 Monitoring & Observability

- **Audit Logs**: Tất cả actions quan trọng được log
- **WebSocket Connections**: Track active users
- **File Upload Progress**: Real-time tracking
- **Error Handling**: Comprehensive error messages
- **Health Checks**: `/api/health` endpoint

---

## 🔄 Event-Driven Architecture (Planned)

```
┌─────────────────────┐
│   Application       │
│   Events            │
└──────────┬──────────┘
           │
           │ Publish to Outbox
           ▼
┌─────────────────────┐
│   Outbox Table      │
│   (Database)        │
└──────────┬──────────┘
           │
           │ Poll & Publish
           ▼
┌─────────────────────┐
│   Message Broker    │
│   (RabbitMQ)        │
└──────────┬──────────┘
           │
           │ Subscribe
           ▼
┌─────────────────────┐
│   Event Consumers   │
│   - Indexing        │
│   - Notifications    │
│   - Analytics       │
└─────────────────────┘
```

---

## 📝 Tóm Tắt

MetaStore là một hệ thống lưu trữ file hiện đại với:
- ✅ Chunked upload cho file lớn
- ✅ Real-time notifications
- ✅ Secure sharing
- ✅ Subscription management
- ✅ Media processing
- ✅ Audit logging
- ✅ Scalable architecture

Hệ thống được thiết kế để dễ dàng mở rộng và thêm các tính năng mới trong tương lai.

