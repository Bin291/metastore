# Simplified Backend - No Video Processing

## Changes needed:

### 1. Remove video processing dependencies

```bash
cd backend
npm uninstall fluent-ffmpeg ffmpeg-static ffprobe-static @types/fluent-ffmpeg
```

### 2. Disable video processing in code

File: `backend/src/modules/files/files.service.ts`

Comment out video processing:
```typescript
async completeChunkedUpload(...) {
  // DISABLE VIDEO PROCESSING
  if (process.env.ENABLE_VIDEO_PROCESSING === 'true') {
    // Only process if explicitly enabled (local dev only)
    if (file.mimeType?.startsWith('video/')) {
      this.processVideoFile(...);
    }
  }
  
  // Just save file metadata
  return updatedFile;
}
```

### 3. Simplified feature set:

✅ File upload (all types)
✅ Image preview  
✅ File management
✅ Share links
✅ User management
❌ Video HLS streaming (just download original)
❌ Audio processing

### 4. Can now deploy to Railway FREE:

```powershell
cd backend
railway init
railway up
```

Set env: `ENABLE_VIDEO_PROCESSING=false`

### 5. Deployment stack:

```
Frontend: Vercel (FREE)
Backend: Railway (FREE 500h)
Database: Supabase PostgreSQL (FREE 500MB)
Storage: Cloudflare R2 (FREE 10GB)
Total: $0/month
```

Works great for:
- Document management
- Image gallery
- File sharing
- CANNOT: Video streaming
