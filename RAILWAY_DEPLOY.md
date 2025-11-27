# Deploy Backend to Railway

## Bước 1: Tạo tài khoản Railway
1. Vào https://railway.app
2. Sign up với GitHub
3. FREE: 500 hours/month + $5 credit

## Bước 2: Deploy từ GitHub

### 2.1. Push code lên GitHub
```powershell
git add .
git commit -m "Add Railway config"
git push origin feat/invents
```

### 2.2. Tạo project trên Railway
1. Railway Dashboard → **New Project**
2. Chọn **Deploy from GitHub repo**
3. Chọn repo `metastore`
4. Railway sẽ tự động detect và build

## Bước 3: Cấu hình Environment Variables

Vào Railway project → **Settings** → **Variables**, thêm:

```env
NODE_ENV=production
GLOBAL_PREFIX=api
DATABASE_TYPE=sqlite
DATABASE_PATH=/app/data/production.sqlite
ENABLE_VIDEO_PROCESSING=true

# JWT Secrets (đã generate)
JWT_ACCESS_SECRET=6hf8khGa16XSzLX76UyUyTEl7sIcDNMCfY1nRDpx1nMkBOfzJ7658Id4H80zgNsx
JWT_REFRESH_SECRET=mBW57vDmNMkS41Q24h0ZtJsdUX9DGE04Ik09OsJbx0ebVgBzvssPgyYAH2BVexuj
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS (sẽ update sau khi deploy frontend)
CORS_ORIGINS=*

# MinIO - CẦN SETUP RIÊNG (xem bước 4)
MINIO_ENDPOINT=your-endpoint
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-key
MINIO_SECRET_KEY=your-secret

BUCKET_PENDING=metastore-pending
BUCKET_PRIVATE=metastore-private
BUCKET_PUBLIC=metastore-public
BUCKET_REJECTED=metastore-rejected
BUCKET_SANDBOX=metastore-sandbox
```

## Bước 4: Setup MinIO Storage

Railway KHÔNG có persistent storage cho files. Bạn cần dùng:

### Option A: Cloudflare R2 (FREE 10GB)
1. Vào https://dash.cloudflare.com → R2
2. Create bucket cho mỗi bucket name
3. Create API Token → Copy Access Key + Secret
4. Update Railway variables:
   ```
   MINIO_ENDPOINT=your-account-id.r2.cloudflarestorage.com
   MINIO_PORT=443
   MINIO_USE_SSL=true
   ```

### Option B: AWS S3 Free Tier (FREE 5GB)
1. Tạo AWS account
2. S3 → Create buckets
3. IAM → Create access key
4. Update Railway variables

### Option C: Backblaze B2 (FREE 10GB)
1. Vào https://www.backblaze.com/b2
2. Create buckets
3. Application Keys → Create key
4. Update Railway variables:
   ```
   MINIO_ENDPOINT=s3.us-west-000.backblazeb2.com
   MINIO_PORT=443
   MINIO_USE_SSL=true
   ```

## Bước 5: Verify Deployment

1. Railway sẽ tự động build & deploy
2. Sau khi deploy xong, vào **Settings** → copy **Public URL**
3. Test: `https://your-app.railway.app/api/health`

## Bước 6: Deploy Frontend to Vercel

```powershell
cd frontend
vercel --prod -e NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
```

## Bước 7: Update CORS

Sau khi có Vercel URL, quay lại Railway:
- **Variables** → Update `CORS_ORIGINS` = `https://your-app.vercel.app`
- Railway sẽ tự động redeploy

## Troubleshooting

### Build fails
- Check **Deployments** → View logs
- Thường do thiếu dependencies

### 502 Bad Gateway
- Check environment variables
- Check MinIO connection

### Video processing slow
- Railway FREE tier có RAM/CPU limit
- Có thể disable: `ENABLE_VIDEO_PROCESSING=false`

## Chi phí

- **Railway**: $0 (500h/month FREE)
- **Cloudflare R2**: $0 (10GB FREE)
- **Vercel**: $0 (FREE tier)

**Tổng: $0/month** 🎉
