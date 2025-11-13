# 🚀 MetaStore - Hướng Dẫn Chạy Toàn Bộ Hệ Thống

## 📋 Yêu cầu trước khi chạy

- Node.js v18+
- npm v9+
- MinIO server (hoặc docker)
- PostgreSQL hoặc SQLite

---

## 🔧 Cách Chạy - Development Mode

### Cách 1: Chạy riêng Backend & Frontend (Recommended)

#### Terminal 1 - Backend

```bash
cd /Users/quoccuong/metastore/backend

# Cài dependencies (nếu chưa)
npm install

# Chạy ở chế độ watch mode
npm run start:dev
```

**Kết quả kỳ vọng**:
```
[Nest] 12345 - 11/13/2025, 8:00:00 PM LOG [NestFactory] Starting Nest application...
[Nest] 12345 - 11/13/2025, 8:00:01 PM LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] 12345 - 11/13/2025, 8:00:02 PM LOG Nest application successfully started +100ms
```

Backend chạy trên: **http://localhost:3001**

---

#### Terminal 2 - Frontend

```bash
cd /Users/quoccuong/metastore/frontend

# Cài dependencies (nếu chưa)
npm install

# Chạy dev server
npm run dev
```

**Kết quả kỳ vọng**:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

  ✓ Ready in 5.2s
```

Frontend chạy trên: **http://localhost:3000**

---

#### Terminal 3 - MinIO (Nếu chưa chạy)

```bash
# Nếu đã có MinIO container chạy
docker-compose up -d

# Hoặc run MinIO locally nếu cài sẵn
minio server ~/minio-data
```

MinIO chạy trên: **http://localhost:9000**

---

### Cách 2: Chạy với Docker Compose (All-in-one)

```bash
cd /Users/quoccuong/metastore

# Chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down
```

Services sẽ chạy trên:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- MinIO: http://localhost:9000
- PostgreSQL: localhost:5432

---

## 🔑 Đăng Nhập

### Tài khoản Admin mặc định

- **Username**: `admin`
- **Password**: `ChangeMe123!`

### Đăng nhập lần đầu

1. Mở browser: http://localhost:3000
2. Trang login sẽ hiển thị tự động
3. Nhập:
   - Username: `admin`
   - Password: `ChangeMe123!`
4. Click "Login"

---

## ✅ Kiểm tra Health

### Backend Health

```bash
# Terminal mới
curl -s http://localhost:3001/api/app 2>/dev/null | jq .
```

Kết quả:
```json
{
  "message": "MetaStore API is running",
  "version": "1.0.0"
}
```

### Frontend

- Mở http://localhost:3000
- Nếu thấy login page → Frontend OK

### Database

Backend logs sẽ hiển thị:
```
[TypeOrmModule] Unable to connect to the database. Retrying (...)
```
Sau vài lần retry, nó sẽ connect thành công.

---

## 🧪 Test API Endpoints

### 1. Đăng nhập

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeMe123!"}'
```

Kết quả:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "ADMIN"
  }
}
```

### 2. Lấy thông tin user

```bash
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Lấy danh sách file

```bash
curl -X GET http://localhost:3001/api/files \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Tạo share link

```bash
curl -X POST http://localhost:3001/api/share-links \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "file-uuid",
    "permission": "VIEW",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

---

## 🐛 Troubleshooting

### Lỗi: "Cannot connect to database"

**Nguyên nhân**: SQLite file chưa được tạo hoặc PostgreSQL không chạy

**Giải pháp**:
```bash
# Xóa DB cũ
cd backend
rm -rf data/metastore.db

# Khởi động lại backend
npm run start:dev
```

---

### Lỗi: "Port 3001 already in use"

**Nguyên nhân**: Process khác đang dùng port 3001

**Giải pháp**:
```bash
# Tìm process dùng port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Hoặc chạy backend ở port khác
PORT=3002 npm run start:dev
```

---

### Lỗi: "MinIO connection refused"

**Nguyên nhân**: MinIO không chạy

**Giải pháp**:
```bash
# Chạy MinIO
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio:latest server /data

# Hoặc dùng docker-compose
docker-compose up -d minio
```

---

### Lỗi: "Node modules missing"

**Nguyên nhân**: Chưa cài dependencies

**Giải pháp**:
```bash
cd backend
npm install

cd ../frontend
npm install
```

---

## 📱 Sử dụng UI

### Dashboard - File Explorer

1. **Upload File**:
   - Click "Upload" button
   - Chọn file từ máy
   - Hoặc drag-drop vào area

2. **Upload Folder**:
   - Click "Upload" button
   - Chọn folder từ máy
   - Cấu trúc folder sẽ được giữ nguyên

3. **Search File**:
   - Dùng search bar
   - Tìm theo tên file

4. **Share File**:
   - Click vào file → "Share"
   - Copy link chia sẻ
   - Có thể set password, expiry, permissions

5. **Download File**:
   - Click vào file → "Download"

6. **Delete File**:
   - Click vào file → "Delete"

7. **Admin Panel** (cho admin):
   - Xem pending approvals
   - Approve/Reject files
   - Quản lý users
   - Quản lý invites

---

## 📊 Monitoring

### Backend Logs

```bash
# Xem logs realtime
docker-compose logs -f backend

# Hoặc từ terminal chạy backend
# Logs hiển thị tự động
```

### Database

```bash
# Connect vào SQLite
sqlite3 backend/data/metastore.db

# Xem tables
.tables

# Xem dữ liệu
SELECT * FROM users;
SELECT * FROM files;
```

---

## 🔒 Security Notes

1. **Change default password**:
   - Sau lần đăng nhập đầu tiên, đổi password admin
   - Settings → Change Password

2. **JWT tokens**:
   - Access token hết hạn sau 15 phút
   - Refresh token hết hạn sau 7 ngày
   - Lưu trong httpOnly cookies

3. **Presigned URLs**:
   - Upload URL hết hạn sau 15 phút
   - Download URL hết hạn sau 10 phút

4. **CORS**:
   - Cấu hình tại: backend/.env
   - CORS_ORIGINS=http://localhost:3000

---

## 📦 Build cho Production

### Build Backend

```bash
cd backend
npm run build
npm run start:prod
```

### Build Frontend

```bash
cd frontend
npm run build
npm run start
```

### Docker Build

```bash
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
```

---

## 🧹 Clean Up

### Xóa tất cả data

```bash
# Xóa SQLite database
rm backend/data/metastore.db

# Xóa MinIO data
rm -rf ~/minio-data

# Xóa Docker volumes
docker-compose down -v
```

### Xóa Docker containers

```bash
docker-compose down

# Hoặc xóa specific containers
docker rm metastore-backend
docker rm metastore-frontend
docker rm metastore-db
```

---

## ✅ Checklist

- [ ] Node.js v18+ cài sẵn
- [ ] npm dependencies cài xong
- [ ] Backend chạy trên 3001
- [ ] Frontend chạy trên 3000
- [ ] MinIO chạy trên 9000
- [ ] Có thể đăng nhập admin
- [ ] Có thể upload file
- [ ] Có thể tạo share link
- [ ] Có thể search file
- [ ] Admin panel hoạt động

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs (backend & frontend)
2. Xem troubleshooting section
3. Restart services
4. Xóa node_modules & reinstall

---

**Happy Coding! 🎉**

MetaStore v1.0 - Ready for Production

