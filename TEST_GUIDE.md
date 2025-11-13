# 🧪 MetaStore Testing Guide

Hướng dẫn test toàn bộ hệ thống MetaStore.

## 📋 Prerequisites

1. **Backend đang chạy** trên `http://localhost:3001`
2. **Frontend đang chạy** trên `http://localhost:3000`
3. **Postgres đang chạy** (Docker container hoặc local)
4. **MinIO đang chạy** (Docker container hoặc local)

Kiểm tra services:
```bash
# Check backend
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:3000

# Check Postgres
docker ps | grep postgres

# Check MinIO
docker ps | grep minio
```

---

## 🎯 Test Flow Chính

### 1. Test Authentication

#### 1.1 Login với Admin Account
1. Mở `http://localhost:3000/login`
2. Đăng nhập với:
   - **Username**: `admin`
   - **Password**: `ChangeMe123!`
3. ✅ **Expected**: Redirect đến `/dashboard`, hiển thị dashboard overview

#### 1.2 Test Logout
1. Click nút "Logout" ở sidebar
2. ✅ **Expected**: Redirect về `/login`, không thể truy cập dashboard

---

### 2. Test File Management

#### 2.1 Upload Single File
1. Vào `/files`
2. Click "Choose File" → chọn một file bất kỳ
3. ✅ **Expected**: 
   - File upload thành công
   - File xuất hiện trong danh sách với status "pending"
   - Có thể thấy file name, path, status

#### 2.2 Upload Folder
1. Vào `/files`
2. Click input file thứ 2 (có `webkitdirectory`)
3. Chọn một folder từ máy tính
4. ✅ **Expected**:
   - Tất cả files trong folder được upload
   - Giữ nguyên cấu trúc folder

#### 2.3 Create Folder
1. Vào `/files`
2. Click "New Folder"
3. Nhập tên folder (VD: "My Documents")
4. Click "Create"
5. ✅ **Expected**:
   - Folder được tạo với status "pending"
   - Có thể click vào folder để vào bên trong

#### 2.4 Navigate Folders
1. Click vào một folder đã tạo
2. ✅ **Expected**:
   - Hiển thị "← Back to Root" button
   - Chỉ hiển thị files/folders trong folder đó
   - Có thể quay lại root

#### 2.5 Delete File/Folder
1. Click nút "Delete" trên một file hoặc folder
2. Confirm deletion
3. ✅ **Expected**:
   - File/folder bị xóa khỏi danh sách
   - Không còn xuất hiện

#### 2.6 Download File
1. Click nút "Download" trên một file đã approved
2. ✅ **Expected**:
   - File được download về máy
   - Presigned URL hoạt động

#### 2.7 Search Files
1. Nhập từ khóa vào search box
2. ✅ **Expected**:
   - Kết quả filter theo tên file
   - Real-time search

---

### 3. Test Share Links

#### 3.1 Create Share Link (View Only)
1. Vào `/share-links`
2. Chọn một file từ dropdown "Resource"
3. Chọn permission: "View only"
4. (Optional) Nhập password
5. (Optional) Set expiry date
6. Click "Create Share Link"
7. ✅ **Expected**:
   - Share link được tạo
   - Token hiển thị trong bảng
   - Status: "active"

#### 3.2 Create Share Link (Full Access)
1. Tạo share link với permission "Full access"
2. ✅ **Expected**:
   - Link được tạo với permission "full"
   - Có thể toggle on/off

#### 3.3 Toggle Share Link
1. Click "Disable" trên một active link
2. ✅ **Expected**:
   - Status chuyển sang "disabled"
   - Button đổi thành "Enable"
3. Click "Enable"
4. ✅ **Expected**:
   - Status chuyển về "active"

#### 3.4 Access Share Link (Public)
1. Copy share link token
2. Mở `http://localhost:3000/share/[token]` trong incognito window
3. (Nếu có password) Nhập password
4. Click "Unlock"
5. ✅ **Expected**:
   - Hiển thị thông tin share link
   - Có thể download file (nếu permission = view)
   - Có thể upload file (nếu permission = full)

#### 3.5 Upload via Share Link (Full Access)
1. Tạo share link với permission "full"
2. Mở share link trong incognito
3. Click "Choose File" và upload một file
4. ✅ **Expected**:
   - File upload thành công
   - File được lưu vào folder được share

---

### 4. Test Admin Functions

#### 4.1 Approve File
1. Vào `/admin/pending` (chỉ admin)
2. Xem danh sách files pending
3. Click "Approve" trên một file
4. ✅ **Expected**:
   - File chuyển status từ "pending" → "approved"
   - File biến mất khỏi pending list
   - File xuất hiện trong `/files` với status "approved"

#### 4.2 Reject File
1. Vào `/admin/pending`
2. Click "Reject" trên một file
3. ✅ **Expected**:
   - File chuyển status thành "rejected"
   - File biến mất khỏi pending list

#### 4.3 Create Invite
1. Vào `/admin/invites`
2. Điền form:
   - Email: `test@example.com`
   - Role: `user`
   - (Optional) Expires At
   - (Optional) Max Uses
3. Click "Create Invite"
4. ✅ **Expected**:
   - Invite được tạo
   - Token hiển thị trong bảng
   - Status: "pending"

#### 4.4 Revoke Invite
1. Click "Revoke" trên một invite
2. ✅ **Expected**:
   - Invite status chuyển thành "revoked"
   - Không thể sử dụng invite đó nữa

#### 4.5 Manage Users
1. Vào `/admin/users`
2. Xem danh sách users
3. Thay đổi role của một user (user ↔ admin)
4. ✅ **Expected**:
   - Role được update ngay lập tức
   - User có quyền mới
5. Click "Suspend" trên một user
6. ✅ **Expected**:
   - User status chuyển thành "suspended"
   - User không thể login

---

### 5. Test Invite Flow

#### 5.1 Accept Invite
1. Copy invite token từ `/admin/invites`
2. Mở `http://localhost:3000/accept-invite?token=[token]`
3. Điền form:
   - Username
   - Password
   - Confirm Password
4. Click "Accept Invite"
5. ✅ **Expected**:
   - Tài khoản được tạo
   - Redirect đến `/login`
   - Có thể login với username/password mới
   - Invite status chuyển thành "used"

#### 5.2 Test Expired Invite
1. Tạo invite với expiry date trong quá khứ
2. Thử accept invite
3. ✅ **Expected**:
   - Hiển thị lỗi "Invite has expired"

---

### 6. Test Search & Filters

#### 6.1 Search Files
1. Vào `/files`
2. Upload một số files với tên khác nhau
3. Nhập từ khóa vào search box
4. ✅ **Expected**:
   - Kết quả filter real-time
   - Chỉ hiển thị files match

#### 6.2 Search Users (Admin)
1. Vào `/admin/users`
2. Nhập từ khóa vào search box
3. ✅ **Expected**:
   - Users được filter theo username/email

---

### 7. Test Edge Cases

#### 7.1 Upload File Quá Lớn
1. Thử upload file rất lớn (>100MB)
2. ✅ **Expected**:
   - Hiển thị error hoặc warning
   - (Tùy config backend)

#### 7.2 Access Disabled Share Link
1. Tạo share link
2. Disable link
3. Thử access link trong incognito
4. ✅ **Expected**:
   - Hiển thị error "Link has been disabled"

#### 7.3 Access Expired Share Link
1. Tạo share link với expiry date trong quá khứ
2. Thử access link
3. ✅ **Expected**:
   - Hiển thị error "Link has expired"

#### 7.4 Delete Folder Có Files Bên Trong
1. Tạo folder
2. Upload files vào folder
3. Thử delete folder
4. ✅ **Expected**:
   - (Tùy implementation) Có thể xóa cascade hoặc yêu cầu xóa files trước

#### 7.5 Upload File Vào Folder Đã Rejected
1. Tạo folder
2. Admin reject folder
3. Thử upload file vào folder đó
4. ✅ **Expected**:
   - Hiển thị error hoặc không cho phép

---

## 🔧 Test Scripts

### Quick Test Script
```bash
# Test backend health
curl http://localhost:3001/api/health

# Test login (sẽ trả về cookies)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeMe123!"}' \
  -c cookies.txt

# Test get current user (với cookies)
curl http://localhost:3001/api/users/me -b cookies.txt

# Test list files
curl http://localhost:3001/api/files -b cookies.txt
```

---

## ✅ Checklist Test

- [ ] Login/Logout hoạt động
- [ ] Upload single file
- [ ] Upload folder
- [ ] Create folder
- [ ] Navigate folders
- [ ] Delete file/folder
- [ ] Download file
- [ ] Search files
- [ ] Create share link (view)
- [ ] Create share link (full)
- [ ] Toggle share link
- [ ] Access share link (public)
- [ ] Upload via share link
- [ ] Approve file (admin)
- [ ] Reject file (admin)
- [ ] Create invite (admin)
- [ ] Revoke invite (admin)
- [ ] Manage users (admin)
- [ ] Accept invite flow
- [ ] Search functionality
- [ ] Edge cases

---

## 🐛 Common Issues & Solutions

### Backend không start
```bash
# Check logs
cd backend && npm run start:dev

# Check database connection
# Ensure Postgres is running
docker ps | grep postgres
```

### Frontend không connect backend
```bash
# Check NEXT_PUBLIC_API_URL
echo $NEXT_PUBLIC_API_URL
# Should be: http://localhost:3001/api

# Or set in .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > frontend/.env.local
```

### CORS errors
- Check backend CORS config trong `main.ts`
- Ensure `CORS_ORIGINS` includes `http://localhost:3000`

### Database errors
- Check Postgres connection string trong `.env`
- Ensure database exists: `metastore`
- Check TypeORM synchronize setting

---

## 📊 Performance Testing

### Load Test
```bash
# Install Apache Bench
brew install httpd

# Test API endpoint
ab -n 100 -c 10 http://localhost:3001/api/health
```

### File Upload Test
1. Upload file 10MB
2. Upload file 100MB
3. Upload folder với 100 files
4. Monitor backend logs và MinIO

---

## 🎯 Next Steps

Sau khi test xong, nếu có issues:
1. Check browser console (F12)
2. Check backend logs
3. Check network tab trong DevTools
4. Review error messages

Happy Testing! 🚀

