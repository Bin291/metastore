# MetaStore Deployment Guide

## 🎯 RECOMMENDED: 100% FREE Stack

**Xem hướng dẫn chi tiết tại: [DEPLOYMENT_FREE.md](./DEPLOYMENT_FREE.md)**

```
Frontend (Next.js)    → Vercel (FREE)
Backend (NestJS)      → Railway FREE tier hoặc Local + ngrok
Database              → Supabase PostgreSQL (FREE 500MB)
Storage (Images)      → Cloudflare R2 (FREE 10GB)
Video Processing      → Local development only
```

**Chi phí: $0/tháng**

---

## Alternative: Production-Ready Deployment (Paid)

Nếu cần video processing và scale:

## Architecture

```
Frontend (Next.js) → Vercel
Backend (NestJS) → Railway/Render/Fly.io
Database → PostgreSQL (Railway/Supabase/Neon)
Storage → MinIO Cloud / AWS S3 / Cloudflare R2
```

## Prerequisites

1. **GitHub Repository** - Push code to GitHub
2. **Vercel Account** - For frontend deployment
3. **Railway/Render Account** - For backend deployment
4. **Database** - PostgreSQL instance
5. **Object Storage** - MinIO Cloud/S3/R2

## Step 1: Prepare Code

```bash
# Ensure all dependencies are installed
cd backend && npm install
cd ../frontend && npm install

# Test builds locally
cd backend && npm run build
cd ../frontend && npm run build
```

## Step 2: Database Migration

### Convert SQLite to PostgreSQL

1. **Install TypeORM CLI**:
```bash
cd backend
npm install -g typeorm
```

2. **Update database config** in `backend/src/config/configuration.ts`:
```typescript
database: {
  type: process.env.DATABASE_TYPE || 'postgres',
  url: process.env.DATABASE_URL,
  // ... existing config
}
```

3. **Create PostgreSQL database** on Railway/Supabase/Neon

4. **Run migrations**:
```bash
npm run migration:run
```

## Step 3: Setup Object Storage

### Option A: Cloudflare R2 (Recommended - Free 10GB)

1. Go to Cloudflare Dashboard → R2
2. Create bucket: `metastore-private`, `metastore-public`, etc.
3. Get API credentials
4. Update backend env:
```
MINIO_ENDPOINT=<account-id>.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=<r2-access-key>
MINIO_SECRET_KEY=<r2-secret-key>
```

### Option B: AWS S3

1. Create S3 buckets
2. Create IAM user with S3 permissions
3. Update env variables

### Option C: MinIO Cloud

1. Sign up at https://min.io/
2. Create buckets
3. Get credentials

## Step 4: Deploy Backend

### Using Railway

1. **Install Railway CLI**:
```bash
npm install -g @railway/cli
railway login
```

2. **Initialize project**:
```bash
cd backend
railway init
```

3. **Add environment variables** in Railway dashboard:
   - Copy from `.env.production.example`
   - Add PostgreSQL database connection
   - Add MinIO/S3 credentials

4. **Deploy**:
```bash
railway up
```

5. **Get backend URL**: `https://your-backend.railway.app`

### Using Render

1. Connect GitHub repository
2. Select `backend` folder as root
3. Set build command: `npm install && npm run build`
4. Set start command: `npm run start:prod`
5. Add environment variables
6. Deploy

## Step 5: Deploy Frontend (Vercel)

1. **Connect GitHub** to Vercel

2. **Import repository**

3. **Configure project**:
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Add environment variable**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   ```

5. **Deploy**

6. **Get frontend URL**: `https://your-project.vercel.app`

## Step 6: Update CORS

In backend `.env`:
```
CORS_ORIGINS=https://your-project.vercel.app,https://your-custom-domain.com
```

Redeploy backend.

## Step 7: Setup Custom Domains (Optional)

### Vercel (Frontend)
1. Vercel Dashboard → Domains
2. Add custom domain
3. Update DNS records

### Railway (Backend)
1. Railway Dashboard → Settings → Domains
2. Add custom domain
3. Update DNS records

## Step 8: Initialize Admin User

```bash
# SSH to backend or use Railway/Render console
npm run seed:admin
```

Or manually create via API:
```bash
curl -X POST https://your-backend.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure-password",
    "name": "Admin"
  }'
```

## Monitoring

- **Vercel**: Built-in analytics
- **Railway**: Logs in dashboard
- **Database**: Supabase/Neon dashboard
- **Storage**: CloudFlare R2 / S3 dashboard

## Costs Estimate (Monthly)

- Vercel: Free (Hobby tier)
- Railway: $5-20 (depending on usage)
- PostgreSQL: Free (Supabase/Neon) or $5-10
- Cloudflare R2: Free (10GB) or $0.015/GB
- **Total**: ~$5-30/month

## Troubleshooting

### Frontend can't connect to backend
- Check CORS_ORIGINS in backend
- Verify NEXT_PUBLIC_API_URL in frontend
- Check backend is running

### Database connection fails
- Verify DATABASE_URL format
- Check database is accessible
- Run migrations

### Video upload/processing fails
- Check FFmpeg is available on backend host
- Verify MinIO/S3 credentials
- Check bucket permissions

### HLS streaming not working
- Verify CORS headers on storage
- Check content-type for .m3u8 and .ts files
- Ensure segments are publicly accessible
