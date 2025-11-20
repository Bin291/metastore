# TODO - Metastore Project

## 🚀 Hướng dẫn chạy Project 

### Điều kiện tiên quyết
- Docker Desktop đã cài đặt và chạy
- Đã có các images sau:
  - `redis:7-alpine` (60.7MB)
  - `minio/minio:latest` (241MB)

### Lần đầu chạy project (Setup lần đầu)

**Bước 1: Khởi động MinIO + Redis** (chỉ cần chạy 1 lần)

Cách thường (khuyến nghị):
```powershell
make minio-up-alt
```

Hoặc cách cũ:
```powershell
make minio-up
```

⚠️ **Chú ý:** Sau khi chạy lệnh này, đợi 3-5 giây để MinIO khởi động hoàn tất.

**Bước 2: Khởi động Backend (Terminal 1)**
```powershell
make start-backend
```

**Bước 3: Khởi động Frontend (Terminal 2)** 
```powershell
make start-frontend
```

### Lần 2 trở đi (khi đã tắt Docker/Projects)

Nếu MinIO + Redis containers vẫn đang chạy:
```powershell
# Chỉ cần chạy Backend và Frontend
make start-backend  # Terminal 1
make start-frontend # Terminal 2
```

Nếu containers đã tắt, cần khởi động lại MinIO + Redis:
```powershell
# Bước 1: Khởi động MinIO + Redis
make minio-up-alt

# Bước 2-3: Khởi động Backend và Frontend
make start-backend  # Terminal 1  
make start-frontend # Terminal 2
```

### Thông tin kết nối
| Service | URL | Ghi chú |
|---------|-----|--------|
| Frontend | http://localhost:3000 | Giao diện chính |
| Backend API | http://localhost:3001/api | NestJS API |
| MinIO API | http://localhost:9000 | Object Storage API |
| MinIO Console | http://localhost:9001 | Quản lý storage (user: minioadmin / pass: minioadmin) |
| Redis | localhost:6379 | Cache database |

### Tài khoản mặc định
- **Username:** admin
- **Password:** admin123
- **Email:** admin@metastore.local

### Kiểm tra trạng thái services

```powershell
# Kiểm tra containers đang chạy
docker ps

# Kiểm tra logs nếu có lỗi
docker logs minio
docker logs redis

# Health check tất cả services  
make health-check

# Kiểm tra trạng thái infrastructure (MinIO + Redis)
make infra-status

# Xem logs infrastructure
make infra-logs

# Restart infrastructure nếu cần
make infra-restart
```

### Vấn đề & Giải pháp

**Vấn đề:** `Failed to create bucket "metastore-xxx"` khi khởi động backend
- **Nguyên nhân:** MinIO chưa sẵn sàng khi backend cố gắng tạo buckets
- **Giải pháp:** 
  1. Đợi 3-5 giây sau khi chạy `make minio-up-alt` 
  2. Backend đã được cập nhật để tự động retry và thêm delay
  3. Buckets sẽ được tạo tự động, lỗi log này không ảnh hưởng chức năng

**Vấn đề:** `TLS handshake timeout` khi `docker-compose up -d`
- **Nguyên nhân:** Không thể kết nối Docker Hub để tải PostgreSQL
- **Giải pháp:** Dùng SQLite thay vì PostgreSQL, chạy MinIO + Redis bằng docker run

**Vấn đề:** Makefile không hoạt động tốt trên Windows PowerShell
- **Nguyên nhân:** Dấu gạch chéo và PowerShell environment variables xen vào
- **Giải pháp:** Chạy docker run command trực tiếp thay vì dùng Makefile

**Vấn đề:** Backend log hiển thị lỗi StorageService
- **Nguyên nhân:** Log level quá chi tiết, hiển thị cả warning/error không quan trọng
- **Giải pháp:** Các buckets sẽ được tạo tự động ở lần chạy tiếp theo, không cần lo lắng

---

## ✅ Completed Tasks

### 1. Tích hợp API GET /bucket/default/folders
- [x] Thêm `useAuthStore` để lấy token
- [x] Tạo `loadFolders` function trong `layout.tsx`
- [x] Transform API data sang local format
- [x] Thêm loading state và error handling
- [x] Fallback to localStorage nếu API fails
- [x] Update sidebar để hiển thị folders từ API
- [x] **FIX**: Handle API response format issues
- [x] **FIX**: Add validation cho array response
- [x] **FIX**: Add demo data fallback cho testing
- [x] **FIX**: Add key props cho conditional rendering
- [x] **FIX**: Ensure unique folder IDs với fallback
- [x] **FIX**: Use IIFE pattern cho conditional rendering

### 2. Update Folder Page
- [x] Thêm `useAuthStore` và token
- [x] Update state types (number → string cho file IDs)
- [x] Thêm `folderFiles` state và `isLoading` state
- [x] Tạo `loadFolderData` function
- [x] Update file selection và preview logic
- [x] Update table columns (Who can access → Type, Size)
- [x] Thêm loading state cho folder contents

## 🔄 In Progress

### 3. Load Files trong Folder
- [ ] Tạo API endpoint để lấy files trong folder cụ thể
- [ ] Tích hợp API call trong `loadFolderData`
- [ ] Transform file data từ API
- [ ] Update file display logic

## 📋 Pending Tasks

### 4. Folder Operations
- [ ] Tạo folder mới (POST /bucket/default/folders)
- [ ] Xóa folder (DELETE /bucket/default/folders/{id})
- [ ] Rename folder (PATCH /bucket/default/folders/{id})

### 5. File Operations trong Folder
- [ ] Upload file vào folder cụ thể
- [ ] Move file giữa các folders
- [ ] Delete file từ folder

### 6. UI Enhancements
- [ ] Thêm breadcrumb navigation
- [ ] Thêm folder context menu (right-click)
- [ ] Thêm drag & drop để move files
- [ ] Thêm search trong folder

## 🎯 Current Status

**Trang Folder đã tích hợp thành công API GET /bucket/default/folders:**

✅ **Sidebar hiển thị folders từ API**  
✅ **Loading states và error handling**  
✅ **Folder selection và navigation**  
✅ **Empty state khi folder không có files**  
✅ **Fallback to localStorage nếu API fails**  
✅ **FIXED**: API response format handling  
✅ **FIXED**: Demo data fallback cho testing  
✅ **FIXED**: React key props cho conditional rendering  
✅ **FIXED**: Unique folder IDs với validation  
✅ **FIXED**: IIFE pattern cho stable rendering  

**Next step:** Tạo API endpoint để lấy files trong folder cụ thể và tích hợp vào trang Folder. 