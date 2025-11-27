# MetaStore FREE Deployment Guide (Vercel + Firebase)

## 🎯 Architecture - 100% FREE

```
Frontend (Next.js)     → Vercel (FREE - Unlimited)
Backend API (NestJS)   → Firebase Functions (FREE - 125K invocations/month)
Database               → Firebase Firestore (FREE - 1GB storage)
File Storage (Images)  → Firebase Storage (FREE - 5GB)
Video Processing       → LOCAL ONLY (Không deploy - chạy dev mode)
Authentication         → Firebase Auth (FREE - Unlimited users)
```

## 💰 Chi phí: $0/tháng

### Free Tier Limits:
- ✅ Vercel: Unlimited bandwidth, 100GB/month
- ✅ Firebase Functions: 125,000 invocations/month, 40,000 GB-seconds
- ✅ Firebase Firestore: 1GB storage, 50K reads/day, 20K writes/day
- ✅ Firebase Storage: 5GB storage, 1GB download/day
- ✅ Firebase Auth: Unlimited users

### ⚠️ Limitations với FREE tier:

1. **Video/Audio Processing**: 
   - KHÔNG deploy video chunking và HLS processing
   - Chỉ chạy local development mode
   - Upload file < 5MB trực tiếp lên Firebase Storage
   
2. **Firebase Functions Cold Start**:
   - First request có thể chậm (5-10s)
   - Giải pháp: Keep-alive ping

## 📋 Step-by-Step Setup

### 1. Setup Firebase Project (15 phút)

1. **Tạo Firebase project**:
   ```bash
   # Truy cập https://console.firebase.google.com
   # Click "Add project" → Đặt tên "metastore"
   # Disable Google Analytics (không cần cho FREE tier)
   ```

2. **Enable các services**:
   - Authentication → Email/Password
   - Firestore Database → Start in production mode
   - Storage → Start in production mode

3. **Install Firebase CLI**:
   ```powershell
   npm install -g firebase-tools
   firebase login
   ```

4. **Initialize Firebase trong project**:
   ```powershell
   cd C:\Users\Acer\metastore
   firebase init
   
   # Chọn:
   # - Functions (JavaScript/TypeScript)
   # - Firestore
   # - Storage
   # - Hosting (optional)
   
   # Project: metastore
   # Language: TypeScript
   # ESLint: Yes
   # Install dependencies: Yes
   ```

### 2. Cấu hình Backend cho Firebase Functions

Firebase Functions không support full NestJS framework. Có 2 options:

**Option A: Express API trên Firebase Functions (Recommended)**

Tạo file `backend/firebase-functions/index.ts`:
```typescript
import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const userRecord = await getAuth().createUser({ email, password, displayName: name });
    
    // Save user to Firestore
    await getFirestore().collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'user',
      createdAt: new Date(),
    });
    
    res.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  // Use Firebase Client SDK on frontend for authentication
  res.json({ message: 'Use Firebase Auth client SDK' });
});

app.get('/api/files', async (req, res) => {
  try {
    const userId = req.headers.authorization; // Firebase ID token
    const filesSnapshot = await getFirestore()
      .collection('files')
      .where('ownerId', '==', userId)
      .get();
    
    const files = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ data: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Express app as Firebase Function
export const api = functions.https.onRequest(app);
```

**Option B: Chạy full NestJS locally, chỉ deploy Frontend**

Nếu muốn giữ full NestJS code:
1. Frontend → Vercel
2. Backend → Chạy local hoặc ngrok tunnel
3. Database → SQLite local hoặc Firebase Firestore
4. Storage → Firebase Storage

### 3. Frontend Environment Variables

Tạo `frontend/.env.production`:
```env
# Firebase Config (Get from Firebase Console → Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=metastore.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=metastore
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=metastore.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# API URL (Firebase Functions)
NEXT_PUBLIC_API_URL=https://us-central1-metastore.cloudfunctions.net/api
```

### 4. Deploy Frontend to Vercel

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend folder
cd frontend
vercel --prod

# Add environment variables in Vercel dashboard:
# Settings → Environment Variables → Add all NEXT_PUBLIC_* vars
```

### 5. Deploy Backend to Firebase Functions

```powershell
cd backend/firebase-functions
firebase deploy --only functions
```

Lấy Function URL: `https://[region]-[project-id].cloudfunctions.net/api`

### 6. Disable Video Processing (Local Only)

Trong `backend/src/modules/files/files.service.ts`:

```typescript
async completeChunkedUpload(...) {
  // Comment out video processing
  // if (file.mimeType?.startsWith('video/')) {
  //   this.processVideoFile(...) // DISABLE for production
  // }
  
  // Just save file metadata
  return updatedFile;
}
```

Chỉ enable khi chạy local development:
```typescript
if (process.env.NODE_ENV === 'development') {
  // Process video locally
}
```

## 🚀 Deployment Commands

```powershell
# 1. Deploy Frontend
cd frontend
vercel --prod

# 2. Deploy Firebase Functions (if using Option A)
cd backend/firebase-functions
firebase deploy --only functions

# 3. Run Backend Locally (if using Option B)
cd backend
npm run start:dev
# Then use ngrok for public URL:
ngrok http 3001
```

## 📊 Monitor Usage (Tránh vượt FREE tier)

### Firebase Console Dashboard:
1. **Functions**: Usage → Invocations (giới hạn 125K/tháng)
2. **Firestore**: Usage → Reads/Writes (50K reads, 20K writes/day)
3. **Storage**: Usage → Storage (5GB total)

### Alerts Setup:
```bash
# Firebase Console → Project Settings → Usage and Billing
# Set usage alerts at 80% of limits
```

## ⚡ Optimization Tips (Tiết kiệm FREE quota)

1. **Cache Frontend**:
   ```typescript
   // Use React Query caching
   staleTime: 5 * 60 * 1000, // 5 minutes
   ```

2. **Firestore Batching**:
   ```typescript
   // Batch writes to reduce operations
   const batch = firestore.batch();
   batch.set(...);
   batch.set(...);
   await batch.commit(); // Count as 1 write
   ```

3. **Firebase Storage Rules** (Public read, auth write):
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /public/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /private/{userId}/{allPaths=**} {
         allow read, write: if request.auth.uid == userId;
       }
     }
   }
   ```

4. **CDN Caching**:
   - Vercel tự động cache static assets
   - Firebase Hosting cache public files

## 🔧 Local Development (Video Processing)

```powershell
# Terminal 1: Backend (with video processing)
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: MinIO local storage
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

Environment cho local:
```env
# backend/.env.development
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/dev.sqlite
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
ENABLE_VIDEO_PROCESSING=true

# frontend/.env.development
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 📝 Migration Path (Khi cần scale)

Nếu vượt FREE tier limits:
1. **Firebase → Blaze Plan** ($0.40/GB storage, $0.026/10K reads)
2. **Backend → Cloud Run** (Pay-per-use, ~$5-10/tháng)
3. **Database → Supabase** (Free PostgreSQL 500MB)
4. **Storage → Cloudflare R2** (Free 10GB)

## ❓ FAQ

**Q: Video upload có hoạt động không?**
A: Có, nhưng chỉ upload file gốc lên Firebase Storage. Không có HLS processing/streaming trên production. Chỉ download và play file gốc.

**Q: Có thể xem video trên production không?**
A: Có, nhưng sẽ download toàn bộ file thay vì streaming HLS. Phù hợp với video ngắn (<50MB).

**Q: Làm sao để có HLS streaming miễn phí?**
A: Không có giải pháp FREE cho video processing. Cần server có FFmpeg và CPU đủ mạnh. Các options:
- Chạy backend local + ngrok (FREE tunnel)
- Oracle Cloud Free Tier (VM miễn phí mãi mãi)
- Google Cloud Free Tier ($300 credit 90 ngày)

**Q: Firebase Functions có chạy được NestJS không?**
A: Không trực tiếp. Phải refactor thành Express routes hoặc deploy NestJS lên Cloud Run/Railway.

## 🎯 Recommended FREE Stack

```
Frontend:          Vercel (Next.js)
Backend:          Railway Free Tier (500h/month) - Đủ cho NestJS
Database:         Supabase (PostgreSQL 500MB FREE)
Storage (Images): Cloudflare R2 (10GB FREE)
Video:            Local development only
Auth:             Supabase Auth (FREE unlimited)
```

Hoặc **simplest FREE option**:
```
Frontend:  Vercel
Backend:   Local (ngrok tunnel)
Database:  SQLite local
Storage:   MinIO local
```

Chọn option nào phù hợp với bạn?
