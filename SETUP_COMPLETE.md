# 🎉 MetaStore - Setup Hoàn Tất!

## ✅ Đã làm xong:

- [x] Build frontend thành công
- [x] Build backend thành công  
- [x] Tạo file `.env.production`
- [x] Generate JWT secrets

## 🔐 JWT Secrets của bạn:

**⚠️ SAVE THESE - Cần cho bước tiếp theo!**

```
JWT_ACCESS_SECRET=3AOB5WqTUE97i4mnNvZxgpJjbDftGKerVkLuoh8SF2saC1czlPH6wy0MXdRQIY
JWT_REFRESH_SECRET=wnhkKA8uTLBpx7yHzWV3NPC2mR0QD9gJqct14OEfU5ZMvjiYFraX6ebIsSloGd
```

---

## 📝 Các bước tiếp theo:

### Bước 1: Update Environment Variables

Mở file `backend\.env.production` và update:

```env
# Paste 2 dòng JWT secrets từ trên vào đây:
JWT_ACCESS_SECRET=3AOB5WqTUE97i4mnNvZxgpJjbDftGKerVkLuoh8SF2saC1czlPH6wy0MXdRQIY
JWT_REFRESH_SECRET=wnhkKA8uTLBpx7yHzWV3NPC2mR0QD9gJqct14OEfU5ZMvjiYFraX6ebIsSloGd

# Sau khi deploy Vercel, update CORS:
CORS_ORIGINS=https://your-app.vercel.app
```

---

### Bước 2: Chạy Backend Locally

```powershell
# Terminal 1
cd backend
npm run start:prod
```

Backend sẽ chạy tại: `http://localhost:3001`

---

### Bước 3: Setup ngrok (Public URL cho backend)

#### 3.1 Download ngrok:
https://ngrok.com/download

Extract file và thêm vào PATH hoặc chạy trực tiếp.

#### 3.2 Tạo tunnel:
```powershell
# Terminal 2 (ngrok)
ngrok http 3001
```

**Lưu lại ngrok URL** (ví dụ: `https://abc123.ngrok-free.app`)

---

### Bước 4: Deploy Frontend lên Vercel

```powershell
# Terminal 3
cd frontend

# Login Vercel (mở browser)
vercel login

# Deploy production
vercel --prod
```

Vercel sẽ hỏi:
- Link to existing project? → **No**
- Project name? → **metastore** (hoặc tên khác)
- Directory? → **./frontend**

Sau đó deploy xong, bạn sẽ có URL: `https://metastore-xxx.vercel.app`

---

### Bước 5: Thêm Environment Variables trên Vercel

1. Vào Vercel Dashboard: https://vercel.com/dashboard
2. Chọn project `metastore`
3. Settings → Environment Variables
4. Thêm biến:

```
Name: NEXT_PUBLIC_API_URL
Value: https://abc123.ngrok-free.app/api
```

(Thay `abc123.ngrok-free.app` bằng ngrok URL của bạn)

5. **Redeploy**: Deployments → Latest → Redeploy

---

### Bước 6: Update CORS trong Backend

Sau khi có Vercel URL, update file `backend\.env.production`:

```env
CORS_ORIGINS=https://metastore-xxx.vercel.app
```

Restart backend (Ctrl+C rồi `npm run start:prod` lại)

---

### Bước 7: Test App!

1. Mở Vercel URL: `https://metastore-xxx.vercel.app`
2. Đăng ký user mới
3. Upload files
4. Test video upload & HLS streaming

---

## 🎯 Architecture hiện tại:

```
Frontend  → Vercel (https://metastore-xxx.vercel.app)
              ↓
          ngrok tunnel (https://abc123.ngrok-free.app)
              ↓
Backend   → Local (http://localhost:3001)
              ↓
Database  → SQLite (backend/data/production.sqlite)
Storage   → MinIO Local (docker)
```

---

## 🔄 Workflow hàng ngày:

Mỗi khi muốn app hoạt động:

```powershell
# Terminal 1: Backend
cd backend
npm run start:prod

# Terminal 2: ngrok
ngrok http 3001

# Terminal 3: MinIO (nếu chưa chạy)
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

Frontend trên Vercel sẽ luôn hoạt động, tự động connect về backend qua ngrok.

---

## ⚠️ Lưu ý về ngrok FREE:

- ✅ Miễn phí
- ⚠️ URL thay đổi mỗi khi restart (abc123 → xyz789)
- ⚠️ Tunnel timeout sau 2 giờ (phải restart)

**Giải pháp**: 
1. Upgrade ngrok $8/tháng → domain cố định
2. HOẶC mỗi khi restart ngrok → update lại `NEXT_PUBLIC_API_URL` trên Vercel

---

## 📊 Chi phí:

- Vercel: **$0** (FREE unlimited)
- Backend: **$0** (chạy local)
- ngrok: **$0** (FREE tier) hoặc $8/tháng (fixed domain)
- **Tổng: $0 - $8/tháng**

---

## 🆘 Troubleshooting:

### Frontend không connect được backend:
1. Check ngrok tunnel đang chạy
2. Check NEXT_PUBLIC_API_URL đúng URL ngrok
3. Check CORS trong backend có domain Vercel

### Video upload fail:
1. Check MinIO đang chạy: http://localhost:9001
2. Login MinIO: minioadmin / minioadmin
3. Check buckets đã tạo: metastore-private, metastore-public, etc.

### Backend lỗi database:
```powershell
cd backend
# Delete old database
Remove-Item data\production.sqlite -Force
# Restart backend (sẽ tạo DB mới)
npm run start:prod
```

---

## 🚀 Next: Muốn deploy backend lên cloud?

Xem file: `DEPLOYMENT.md` hoặc `QUICKSTART.md`

Options:
- Railway ($5-10/tháng)
- Render (FREE với limitations)
- Oracle Cloud (FREE forever, complex setup)

---

**🎉 Chúc mừng! App của bạn đã ready!**

Need help? Check các file:
- `QUICKSTART.md` - Quick reference
- `DEPLOYMENT_FREE.md` - FREE deployment options
- `DEPLOYMENT.md` - Paid options
