# 📊 BÁO CÁO THUYẾT TRÌNH - MetaStore System
## Submission #3: Reliability, Consistency, and Final Delivery

---

## 📋 MỤC LỤC

1. [Giới Thiệu Hệ Thống](#1-giới-thiệu-hệ-thống)
2. [Kiến Trúc Hệ Thống (Architectural Documentation - 30%)](#2-kiến-trúc-hệ-thống)
3. [Chức Năng Hệ Thống (Functionality - 35%)](#3-chức-năng-hệ-thống)
4. [Reliability & Consistency Patterns (20%)](#4-reliability--consistency-patterns)
5. [Implementation & Testing](#5-implementation--testing)
6. [Kết Luận & Future Work](#6-kết-luận--future-work)

---

## 1. GIỚI THIỆU HỆ THỐNG

### 1.1. Tổng Quan MetaStore
- **Mục đích**: Nền tảng lưu trữ và chia sẻ file hiện đại
- **Core Features**:
  - Chunked file upload cho file lớn
  - Real-time notifications qua WebSocket
  - Secure file sharing với share links
  - Media processing (HLS video streaming)
  - Subscription & payment management
  - Audit logging

### 1.2. Technology Stack
- **Frontend**: Next.js 16, React, TypeScript, Zustand
- **Backend**: NestJS 11, TypeORM, Node.js
- **Database**: PostgreSQL 16
- **Storage**: MinIO (S3-compatible)
- **Cache**: Redis 7
- **Message Broker**: RabbitMQ (optional)
- **Media Processing**: FFmpeg

### 1.3. Submission Requirements Overview
- ✅ Outbox Pattern cho reliable event publishing
- ✅ Idempotency handling cho consumers
- ✅ Saga Pattern cho multi-step transactions
- ✅ API versioning (/v1)
- ✅ Complete documentation (SAD, ADR, caching, async, consistency)

**📷 Hình ảnh**: Không có (phần giới thiệu)

---

## 2. KIẾN TRÚC HỆ THỐNG (Architectural Documentation - 30%)

### 2.1. System Context & Container View
**Nội dung trình bày**:
- Tổng quan hệ thống MetaStore
- Các containers chính: Frontend, Backend, Database, Storage, Cache, Message Broker
- Protocols và ports
- Communication patterns

**📷 Hình ảnh**: 
- **System Architecture Diagram (C4 Level 2 - Container Diagram)**
  - MetaStore System - Container View
  - Frontend Web App, Backend API, PostgreSQL, MinIO, Redis, RabbitMQ

### 2.2. Backend Architecture - Component View
**Nội dung trình bày**:
- API Layer (Controllers)
- Business Logic Layer (Services)
- Infrastructure Layer (Saga, Outbox, Idempotency, Cache)
- External Services (Storage, Media, Notifications)
- Dependencies và data flow

**📷 Hình ảnh**:
- **Backend Component Diagram (C4 Level 3)**
  - Backend API - NestJS Component View
  - API Layer, Business Logic, Infrastructure, External Services

### 2.3. Frontend Architecture - Component View
**Nội dung trình bày**:
- Pages Layer (Next.js App Router)
- Components Layer (React Components)
- Services Layer (API clients, chunked upload)
- State Management (Zustand stores)
- Hooks (Custom React hooks)
- WebSocket Client

**📷 Hình ảnh**:
- **Frontend Component Diagram (C4 Level 3)**
  - Frontend - Next.js 16 Component View
  - Pages, Components, Services, State Management, Hooks, WebSocket

### 2.4. Database Schema
**Nội dung trình bày**:
- Core entities (users, files, share_links, invites, notifications, payments, audit_logs)
- Pattern entities (outbox_events, saga_instances, idempotency_keys)
- Relationships và foreign keys
- Indexes cho performance

**📷 Hình ảnh**:
- **Database Schema Diagram (ERD)**
  - Entity Relationship Diagram
  - All tables với relationships và attributes

---

## 3. CHỨC NĂNG HỆ THỐNG (Functionality - 35%)

### 3.1. CRUD Operations
**Nội dung trình bày**:
- File Management (Create, Read, Update, Delete)
- User Management
- Share Links Management
- API Endpoints với versioning (/v1)

**📷 Hình ảnh**: Không có (phần mô tả)

### 3.2. Authentication & Authorization
**Nội dung trình bày**:
- JWT-based authentication
- Access token + Refresh token
- HTTP-only cookies
- Role-based access control (RBAC)

**📷 Hình ảnh**: Không có (phần mô tả)

### 3.3. Async Operations - File Upload Flow

#### 3.3.1. Step 1: Register File & Initiate Upload
**Nội dung trình bày**:
- Client request upload initiation
- Backend tạo file record (PENDING)
- Initiate MinIO multipart upload
- Generate presigned URLs cho chunks
- Start Saga instance
- Return presigned URLs to client

**📷 Hình ảnh**:
- **Step 1 - Register File Sequence Diagram**
  - File Registration & Upload Initiation
  - Client → FilesController → FilesService → SagaOrchestrator → Database → StorageService → MinIO

#### 3.3.2. Step 2: Upload Chunks & Complete
**Nội dung trình bày**:
- Client upload chunks parallel (max 3 concurrent)
- MinIO returns ETags cho mỗi chunk
- Client request completion với ETags
- Backend complete multipart upload
- Update file record
- Saga step 2 completed

**📷 Hình ảnh**:
- **Step 2 - Upload Chunks Sequence Diagram**
  - Chunked Upload & Complete
  - Parallel upload flow, completion flow, Saga update

#### 3.3.3. Step 3: Process Media
**Nội dung trình bày**:
- Saga orchestrator triggers media processing
- Download file từ MinIO
- Check MIME type (video/image/other)
- Process video → HLS conversion (FFmpeg)
- Generate thumbnail
- Upload processed files to MinIO
- Update file metadata
- Saga step 3 completed

**📷 Hình ảnh**:
- **Step 3 - Process Media Sequence Diagram**
  - HLS Conversion & Thumbnail Generation
  - SagaOrchestrator → MediaProcessingService → Database → StorageService → MinIO → FFmpeg

#### 3.3.4. Step 4: Send Notification
**Nội dung trình bày**:
- Saga orchestrator triggers notification
- Create notification record trong database
- Emit WebSocket event
- Client receives real-time notification
- Update file status to APPROVED
- Complete Saga instance

**📷 Hình ảnh**:
- **Step 4 - Send Notification Sequence Diagram**
  - Real-time Notification Delivery
  - SagaOrchestrator → NotificationsService → Database → NotificationsGateway → Client (WebSocket)

### 3.4. Caching Strategy
**Nội dung trình bày**:
- Redis-based caching
- HTTP response caching
- Cache keys và TTL
- Cache invalidation strategy
- Performance impact

**📷 Hình ảnh**: Không có (phần mô tả)

---

## 4. RELIABILITY & CONSISTENCY PATTERNS (20%)

### 4.1. Saga Pattern Implementation

#### 4.1.1. Saga State Management
**Nội dung trình bày**:
- Saga states: PENDING, IN_PROGRESS, COMPLETED, COMPENSATING, COMPENSATED, FAILED
- State transitions và conditions
- Current step tracking
- Completed steps tracking
- Compensation logic

**📷 Hình ảnh**:
- **Saga State Diagram**
  - Saga Instance Lifecycle
  - States và transitions với conditions

#### 4.1.2. File Upload Saga Flow
**Nội dung trình bày**:
- 4 steps của File Upload Saga
- Step execution flow
- Compensation logic cho mỗi step
- Error handling

**📷 Hình ảnh**: 
- Sử dụng lại các sequence diagrams từ phần 3.3:
  - Step 1, Step 2, Step 3, Step 4 (đã có ở trên)

#### 4.1.3. Compensation Flow
**Nội dung trình bày**:
- Error detection và saga status update
- Compensation order (reverse order)
- Compensate Step 3: Delete processed files
- Compensate Step 2: Delete uploaded file
- Compensate Step 1: Delete file record
- Update saga status to COMPENSATED
- Send error notification

**📷 Hình ảnh**:
- **Compensation Flow Sequence Diagram**
  - Error Handling & Rollback
  - SagaOrchestrator → MediaProcessingService → StorageService → FilesService → Database → MinIO → NotificationService → Client

### 4.2. Outbox Pattern Implementation
**Nội dung trình bày**:
- Database-backed event storage
- Transactional event creation
- Background poller (every 5 seconds)
- Retry logic (max 5 retries)
- Event status tracking

**📷 Hình ảnh**: Không có (phần mô tả, có thể vẽ thêm nếu cần)

### 4.3. Idempotency Pattern Implementation
**Nội dung trình bày**:
- HTTP Idempotency-Key header support
- Request hash comparison
- Response caching
- TTL-based expiration (24 hours)
- Duplicate request prevention

**📷 Hình ảnh**: Không có (phần mô tả, có thể vẽ thêm nếu cần)

### 4.4. Consistency Guarantees
**Nội dung trình bày**:
- Transaction management
- Saga Pattern cho distributed transactions
- Outbox Pattern cho event consistency
- Retry logic và compensation

**📷 Hình ảnh**: Không có (phần mô tả)

---

## 5. IMPLEMENTATION & TESTING

### 5.1. Code Structure
**Nội dung trình bày**:
- Backend structure (entities, modules, common)
- Frontend structure (app, components, lib, stores)
- Module integration
- Dependencies

**📷 Hình ảnh**: Không có (phần mô tả code)

### 5.2. API Versioning
**Nội dung trình bày**:
- All APIs prefixed with `/api/v1/`
- Versioning strategy
- Future compatibility

**📷 Hình ảnh**: Không có (phần mô tả)

### 5.3. Testing Strategy
**Nội dung trình bày**:
- Unit tests
- Integration tests
- Manual testing scenarios
- Test coverage

**📷 Hình ảnh**: Không có (phần mô tả)

### 5.4. Documentation
**Nội dung trình bày**:
- Created documentation files
- API documentation
- Runbook for local testing
- Pattern documentation

**📷 Hình ảnh**: Không có (phần mô tả)

---

## 6. KẾT LUẬN & FUTURE WORK

### 6.1. Achievements
**Nội dung trình bày**:
- ✅ Architectural Patterns (Outbox, Saga, Idempotency, Caching)
- ✅ Functionality (CRUD, Auth, Async, Caching)
- ✅ Documentation (SAD, Patterns, API, Runbook)

**📷 Hình ảnh**: Không có (phần tổng kết)

### 6.2. Key Highlights
**Nội dung trình bày**:
- Reliability: Saga Pattern, Outbox Pattern, Compensation logic
- Performance: Chunked upload, Parallel upload, Redis caching
- Consistency: Transactional events, Saga state management, Idempotency

**📷 Hình ảnh**: Không có (phần tổng kết)

### 6.3. Future Enhancements
**Nội dung trình bày**:
- Scalability improvements
- Monitoring và observability
- Advanced features
- Mobile app support

**📷 Hình ảnh**: Không có (phần tương lai)

### 6.4. Grading Criteria Alignment
**Nội dung trình bày**:
- Architectural Documentation (30%): ✅ Complete
- Functionality (35%): ✅ Complete
- Reliability & Consistency (20%): ✅ Complete
- Clarity, Teamwork & Reproducibility (15%): ✅ Complete

**📷 Hình ảnh**: Không có (phần tổng kết)

---

## 📊 TỔNG KẾT HÌNH ẢNH THEO THỨ TỰ TRÌNH BÀY

### Phần 2: Kiến Trúc Hệ Thống (4 hình)
1. **System Architecture Diagram (C4 Level 2 - Container Diagram)**
   - MetaStore System - Container View
   - Frontend Web App, Backend API, PostgreSQL, MinIO, Redis, RabbitMQ

2. **Backend Component Diagram (C4 Level 3)**
   - Backend API - NestJS Component View
   - API Layer, Business Logic, Infrastructure, External Services

3. **Frontend Component Diagram (C4 Level 3)**
   - Frontend - Next.js 16 Component View
   - Pages, Components, Services, State Management, Hooks, WebSocket

4. **Database Schema Diagram (ERD)**
   - Entity Relationship Diagram
   - All tables với relationships và attributes

### Phần 3: Chức Năng Hệ Thống (4 hình)
5. **Step 1 - Register File Sequence Diagram**
   - File Registration & Upload Initiation
   - Client → FilesController → FilesService → SagaOrchestrator → Database → StorageService → MinIO

6. **Step 2 - Upload Chunks Sequence Diagram**
   - Chunked Upload & Complete
   - Parallel upload flow, completion flow, Saga update

7. **Step 3 - Process Media Sequence Diagram**
   - HLS Conversion & Thumbnail Generation
   - SagaOrchestrator → MediaProcessingService → Database → StorageService → MinIO → FFmpeg

8. **Step 4 - Send Notification Sequence Diagram**
   - Real-time Notification Delivery
   - SagaOrchestrator → NotificationsService → Database → NotificationsGateway → Client (WebSocket)

### Phần 4: Reliability & Consistency Patterns (2 hình)
9. **Saga State Diagram**
   - Saga Instance Lifecycle
   - States và transitions với conditions

10. **Compensation Flow Sequence Diagram**
    - Error Handling & Rollback
    - SagaOrchestrator → MediaProcessingService → StorageService → FilesService → Database → MinIO → NotificationService → Client

---

## 📝 GHI CHÚ

- **Tổng số hình ảnh**: 10 diagrams
- **Phần có nhiều hình nhất**: 
  - Phần 2 (Kiến Trúc): 4 hình
  - Phần 3 (Chức Năng): 4 hình
  - Phần 4 (Reliability): 2 hình
- **Thứ tự trình bày**: 
  - Từ tổng quan (System Architecture) 
  - → Chi tiết (Components) 
  - → Flow (Sequence Diagrams) 
  - → Patterns (Saga, Compensation)
- **Mỗi hình có mục đích rõ ràng**: Mô tả một aspect cụ thể của hệ thống
- **Hình ảnh được phân bổ hợp lý**: Mỗi phần có đủ hình để minh họa nội dung

---

## 🎯 CẤU TRÚC TRÌNH BÀY ĐỀ XUẤT

### Slide 1-3: Giới Thiệu (Không có hình)
- Slide 1: Title slide
- Slide 2: Tổng quan MetaStore
- Slide 3: Technology Stack & Requirements

### Slide 4-7: Kiến Trúc Hệ Thống (4 hình)
- Slide 4: System Architecture Diagram
- Slide 5: Backend Component Diagram
- Slide 6: Frontend Component Diagram
- Slide 7: Database Schema Diagram

### Slide 8-11: Chức Năng Hệ Thống (4 hình)
- Slide 8: Step 1 - Register File Sequence Diagram
- Slide 9: Step 2 - Upload Chunks Sequence Diagram
- Slide 10: Step 3 - Process Media Sequence Diagram
- Slide 11: Step 4 - Send Notification Sequence Diagram

### Slide 12-13: Reliability & Consistency (2 hình)
- Slide 12: Saga State Diagram
- Slide 13: Compensation Flow Sequence Diagram

### Slide 14-16: Implementation & Kết Luận (Không có hình)
- Slide 14: Implementation & Testing
- Slide 15: Achievements & Highlights
- Slide 16: Future Work & Q&A

---

**Last Updated**: 2024-12-29  
**Version**: 1.0  
**Total Diagrams**: 10  
**Total Slides (đề xuất)**: 16 slides

