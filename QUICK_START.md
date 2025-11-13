# 🚀 MetaStore Quick Start Guide

Hướng dẫn nhanh để chạy và test hệ thống MetaStore.

## 📦 Start Services

### Option 1: Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f
```

### Option 2: Manual Start

#### 1. Start Postgres (Docker)
```bash
docker run -d --name metastore-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=metastore \
  -p 5432:5432 \
  postgres:16-alpine
```

#### 2. Start MinIO (Docker)
```bash
docker run -d --name metastore-minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

#### 3. Start Backend
```bash
cd backend
npm install
npm run start:dev
```

Backend sẽ chạy tại: `http://localhost:3001`

#### 4. Start Frontend
```bash
cd frontend
npm install

# Set API URL
export NEXT_PUBLIC_API_URL=http://localhost:3001/api

npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3000`

---

## 🔐 Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `ChangeMe123!`

**Database:**
- Host: `localhost:5432`
- Database: `metastore`
- User: `postgres`
- Password: `postgres`

**MinIO:**
- Endpoint: `http://localhost:9000`
- Console: `http://localhost:9001`
- Access Key: `minioadmin`
- Secret Key: `minioadmin`

---

## ✅ Quick Test

### 1. Test Backend
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-11-13T...",
  "version": "0.0.1",
  "environment": "development"
}
```

### 2. Test Frontend
Mở browser: `http://localhost:3000`

### 3. Run API Test Script
```bash
./test-api.sh
```

---

## 🧪 Test Flow (5 phút)

1. **Login**
   - Mở `http://localhost:3000/login`
   - Login với `admin` / `ChangeMe123!`

2. **Upload File**
   - Vào `/files`
   - Click "Choose File" → chọn file
   - File xuất hiện với status "pending"

3. **Approve File** (Admin)
   - Vào `/admin/pending`
   - Click "Approve" trên file vừa upload
   - File chuyển sang "approved"

4. **Create Share Link**
   - Vào `/share-links`
   - Chọn file → chọn permission → Create
   - Copy token

5. **Access Share Link**
   - Mở incognito window
   - Vào `http://localhost:3000/share/[token]`
   - (Nếu có password) Nhập password
   - Click "Unlock" → Download file

6. **Create Invite** (Admin)
   - Vào `/admin/invites`
   - Tạo invite với email test
   - Copy token

7. **Accept Invite**
   - Mở `http://localhost:3000/accept-invite?token=[token]`
   - Điền form → Accept
   - Login với account mới

---

## 🐛 Troubleshooting

### Backend không start
```bash
# Check logs
cd backend && npm run start:dev

# Check database
docker ps | grep postgres

# Check .env file
cat backend/.env | grep DATABASE
```

### Frontend không connect backend
```bash
# Check API URL
echo $NEXT_PUBLIC_API_URL

# Set if missing
export NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Or create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > frontend/.env.local
```

### Database connection error
```bash
# Check Postgres
docker ps | grep postgres

# Restart if needed
docker restart metastore-postgres

# Check connection
docker exec -it metastore-postgres psql -U postgres -d metastore -c "SELECT 1;"
```

### MinIO connection error
```bash
# Check MinIO
docker ps | grep minio

# Access console
open http://localhost:9001
# Login: minioadmin / minioadmin
```

---

## 📚 Full Documentation

Xem `TEST_GUIDE.md` để có hướng dẫn test chi tiết hơn.

---

## 🎯 Next Steps

1. ✅ Test tất cả features theo `TEST_GUIDE.md`
2. ✅ Customize configuration trong `.env`
3. ✅ Deploy lên production (nếu cần)
4. ✅ Setup backup cho database và MinIO

Happy Coding! 🚀

