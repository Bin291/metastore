# 🚀 Quick Start - FREE Deployment

## Cách NHANH NHẤT & MIỄN PHÍ 100%

### Option 1: Vercel Frontend + Local Backend (RECOMMENDED)

**Ưu điểm**: 
- ✅ Hoàn toàn miễn phí
- ✅ Có đầy đủ tính năng (video processing, HLS streaming)
- ✅ Không cần setup cloud services phức tạp

**Nhược điểm**:
- ⚠️ Máy tính phải bật để backend chạy
- ⚠️ Cần public IP hoặc ngrok tunnel

**Setup (10 phút):**

```powershell
# 1. Install ngrok
# Download: https://ngrok.com/download
# Extract và thêm vào PATH

# 2. Build frontend
cd frontend
npm install
npm run build

# 3. Deploy frontend lên Vercel
npm install -g vercel
vercel login
vercel --prod
# -> Lấy URL: https://your-app.vercel.app

# 4. Start backend locally
cd ../backend
npm install
npm run start:prod

# 5. Tạo tunnel với ngrok (terminal mới)
ngrok http 3001
# -> Lấy URL: https://abc123.ngrok.io

# 6. Update frontend env trên Vercel
# Dashboard → Settings → Environment Variables
# NEXT_PUBLIC_API_URL = https://abc123.ngrok.io/api
# Redeploy

# DONE! App đã chạy với full features
```

---

### Option 2: Vercel + Railway (Cloud 100%)

**Ưu điểm**:
- ✅ Không cần máy tính bật 24/7
- ✅ Professional deployment
- ✅ FREE 500 hours/month (đủ cho hobby project)

**Nhược điểm**:
- ⚠️ KHÔNG có video processing (Railway FREE không có FFmpeg)
- ⚠️ Video chỉ upload, không HLS streaming

**Setup (20 phút):**

```powershell
# 1. Tạo accounts
# - Railway: https://railway.app (GitHub login)
# - Supabase: https://supabase.com (GitHub login)
# - Cloudflare: https://cloudflare.com

# 2. Setup Supabase Database
# Supabase Dashboard → New Project
# Lấy DATABASE_URL từ Settings → Database

# 3. Setup Cloudflare R2
# Cloudflare Dashboard → R2 → Create bucket
# Lấy credentials

# 4. Deploy Backend lên Railway
npm install -g @railway/cli
railway login
cd backend
railway init
railway up

# Add environment variables trong Railway dashboard:
# - DATABASE_URL (từ Supabase)
# - R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY (từ Cloudflare)
# - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (generate random)

# 5. Deploy Frontend lên Vercel
cd ../frontend
vercel --prod

# Add env trong Vercel:
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app/api

# DONE!
```

---

### Option 3: 100% Local (Development)

**Dùng khi**: Đang develop, test features

```powershell
# Terminal 1: MinIO
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"

# Terminal 2: Backend
cd backend
npm run start:dev

# Terminal 3: Frontend
cd frontend
npm run dev

# Open: http://localhost:3000
```

---

## So sánh các options

| Feature | Option 1 (Local+ngrok) | Option 2 (Railway) | Option 3 (100% Local) |
|---------|------------------------|--------------------|-----------------------|
| **Chi phí** | $0 | $0 | $0 |
| **Video Upload** | ✅ | ✅ | ✅ |
| **Video HLS Streaming** | ✅ | ❌ | ✅ |
| **Image Upload** | ✅ | ✅ | ✅ |
| **Cần máy bật 24/7** | ✅ Cần | ❌ Không | ✅ Cần |
| **Public Access** | ✅ Qua ngrok | ✅ Railway URL | ❌ Localhost only |
| **Setup Difficulty** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| **Recommended For** | Demo, MVP | Production (no video) | Development |

---

## Nên chọn option nào?

### Chọn Option 1 nếu:
- ✅ Bạn muốn FULL features (video HLS streaming)
- ✅ Có máy tính/laptop có thể bật 24/7
- ✅ Muốn setup nhanh nhất

### Chọn Option 2 nếu:
- ✅ Muốn deployment professional
- ✅ KHÔNG cần video processing
- ✅ OK với image-only app

### Chọn Option 3 nếu:
- ✅ Đang develop/test
- ✅ Chưa cần deploy public

---

## FAQ

**Q: ngrok có FREE mãi không?**
A: Có! FREE tier cho 1 tunnel, reset mỗi 2 giờ (cần restart). Hoặc mua $8/tháng cho domain cố định.

**Q: Railway FREE có đủ không?**
A: Đủ cho hobby project (~500 hours = 20 ngày/tháng). Nếu traffic thấp, sẽ sleep khi không dùng → tiết kiệm hours.

**Q: Tại sao Railway FREE không có video processing?**
A: FFmpeg cần nhiều CPU/RAM. FREE tier bị giới hạn resources. Nếu cần, upgrade $5/tháng.

**Q: Có cách nào FREE + có video processing + không cần máy bật 24/7?**
A: Có! Dùng **Oracle Cloud FREE Tier** (VM miễn phí mãi mãi). Nhưng setup phức tạp hơn.

---

## Run Setup Script

```powershell
# Chạy script hướng dẫn
.\setup-deploy.ps1
```

Chọn option phù hợp và script sẽ guide bạn!
