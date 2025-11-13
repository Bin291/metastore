# 🧪 MetaStore - Test Checklist

## 📋 Ngày Test: 13/11/2025

---

## 1. 📁 FILE MANAGEMENT

### ✅ Upload File
- [ ] Upload file đơn lẻ (text, image, video)
- [ ] Upload file bằng drag-drop
- [ ] Progress bar hiển thị đúng (0% → 100%)
- [ ] File xuất hiện trong danh sách

### ✅ Upload Folder
- [ ] Upload folder có subfolder
- [ ] Cấu trúc folder được bảo toàn
- [ ] Files nằm trong folder tương ứng
- [ ] Có thể click vào folder xem files bên trong

### ✅ Create Folder
- [ ] Tạo folder mới
- [ ] Folder xuất hiện ngay lập tức
- [ ] Có thể tạo folder trong folder khác

### ✅ Browse Folder
- [ ] Click folder mở đúng folder đó
- [ ] Breadcrumb hiển thị đúng (Home > Folder)
- [ ] Quay lại root bằng Home button
- [ ] Phân trang hoạt động

### ✅ Search Files
- [ ] Tìm kiếm file theo tên
- [ ] Tìm kiếm folder theo tên
- [ ] Search reset khi thay đổi folder
- [ ] Kết quả chính xác

### ✅ Delete Files
- [ ] Xóa file đơn lẻ
- [ ] Xóa folder và files bên trong
- [ ] Confirm dialog trước khi xóa
- [ ] File/folder biến mất sau xóa

### ✅ Download File
- [ ] Download file đơn lẻ
- [ ] Download hoạt động (presigned URL)
- [ ] File download đúng định dạng

### ✅ Preview File
- [ ] Preview image file
- [ ] Preview text file
- [ ] Preview video (nếu hỗ trợ)
- [ ] Close preview modal

### ✅ File Icons
- [ ] Image file: 🖼️ icon
- [ ] Video file: 🎬 icon
- [ ] Audio file: 🎵 icon
- [ ] PDF file: 📄 icon
- [ ] Text file: 📝 icon
- [ ] ZIP file: 📦 icon

---

## 2. 👥 USER MANAGEMENT

### ✅ Login
- [ ] Login với username/password đúng
- [ ] Error message khi credentials sai
- [ ] Redirect tới dashboard sau login
- [ ] Token lưu trong cookie

### ✅ Logout
- [ ] Logout button visible
- [ ] Logout xóa token
- [ ] Redirect tới login page

### ✅ User Profile
- [ ] Xem thông tin user đang login
- [ ] Username hiển thị đúng
- [ ] Role hiển thị đúng (Admin/User)

---

## 3. 🔐 AUTHENTICATION & AUTHORIZATION

### ✅ Role-based Access
- [ ] Admin có quyền access tất cả
- [ ] User có quyền access folder riêng
- [ ] Không thể access folder của user khác
- [ ] Share link hoạt động cho guest

### ✅ JWT Token
- [ ] Token được tạo khi login
- [ ] Token có expiry time
- [ ] Refresh token hoạt động
- [ ] Logout xóa token

---

## 4. 📤 SHARE LINKS

### ✅ Create Share Link
- [ ] Tạo share link cho file
- [ ] Tạo share link cho folder
- [ ] Copy link thành công

### ✅ Share Link Features
- [ ] Set password cho link
- [ ] Set expiry date
- [ ] Permissions: VIEW / DOWNLOAD
- [ ] Share link active/inactive

### ✅ Access Share Link
- [ ] Guest có thể truy cập link
- [ ] Nhập password nếu có
- [ ] Xem files qua link
- [ ] Download file qua link

---

## 5. 📝 MODERATION

### ✅ Pending Review
- [ ] File mới upload có status PENDING
- [ ] Admin có thể xem pending files
- [ ] List pending files

### ✅ Approve File
- [ ] Admin approve file
- [ ] File status thay đổi → APPROVED
- [ ] File move to correct bucket

### ✅ Reject File
- [ ] Admin reject file
- [ ] File status thay đổi → REJECTED
- [ ] Reason được lưu

---

## 6. 🔔 NOTIFICATIONS

### ✅ Real-time Notifications
- [ ] Nhận thông báo khi file được upload
- [ ] Nhận thông báo khi file được approve/reject
- [ ] Notification count hiển thị đúng
- [ ] Click notification mở file

### ✅ WebSocket Connection
- [ ] WebSocket kết nối thành công
- [ ] Real-time update files list
- [ ] Real-time update notifications

---

## 7. 📊 PAGINATION

### ✅ File Pagination
- [ ] Hiển thị 20 items/page
- [ ] Next page button hoạt động
- [ ] Previous page button hoạt động
- [ ] Page number đúng

### ✅ Search with Pagination
- [ ] Search trong page đúng
- [ ] Reset tới page 1 khi search

---

## 8. 🎨 UI/UX

### ✅ Icons (React Icons)
- [ ] Upload icon đúng
- [ ] Folder icon đúng
- [ ] File icons đúng theo type
- [ ] Action icons (eye, download, trash) hiển thị

### ✅ Responsive Design
- [ ] Mobile view (< 640px) - ẩn columns
- [ ] Tablet view - ẩn một số columns
- [ ] Desktop view - hiển thị tất cả
- [ ] Touch friendly buttons

### ✅ Drag-Drop Zone
- [ ] Drag zone responsive
- [ ] Hover effect đúng
- [ ] Active state đúng
- [ ] Drop files upload đúng

### ✅ Loading States
- [ ] Loading spinner khi load files
- [ ] Upload progress bar
- [ ] Button disabled khi pending
- [ ] Empty state message

---

## 9. 🔍 SEARCH & FILTER

### ✅ Search Functionality
- [ ] Search by filename
- [ ] Search by folder name
- [ ] Search case-insensitive
- [ ] Real-time search

### ✅ File Status Filter
- [ ] Filter by PENDING
- [ ] Filter by APPROVED
- [ ] Filter by REJECTED
- [ ] Filter by PRIVATE/PUBLIC

---

## 10. 📈 PERFORMANCE

### ✅ Load Time
- [ ] Initial page load < 2s
- [ ] File list load < 1s
- [ ] Search response < 500ms
- [ ] Pagination smooth

### ✅ Upload Performance
- [ ] Single file upload speed
- [ ] Folder upload with multiple files
- [ ] Large file handling (> 100MB)
- [ ] Progress accuracy

---

## 11. ❌ ERROR HANDLING

### ✅ Network Errors
- [ ] Handle 404 (file not found)
- [ ] Handle 403 (forbidden)
- [ ] Handle 500 (server error)
- [ ] Retry option available

### ✅ Upload Errors
- [ ] Handle failed upload
- [ ] Handle timeout
- [ ] Show error message
- [ ] Cleanup temp files

### ✅ Validation
- [ ] Folder name validation
- [ ] File size validation
- [ ] File type validation
- [ ] Empty field validation

---

## 12. 🗄️ DATABASE & STORAGE

### ✅ File Storage
- [ ] Files lưu trong MinIO
- [ ] Folder structure correct
- [ ] Checksums calculated
- [ ] Presigned URLs work

### ✅ Database
- [ ] File metadata lưu đúng
- [ ] Folder relationships correct
- [ ] User associations correct
- [ ] Audit logs recorded

---

## 📝 NOTES

```
Backend Status: ✅ Running on port 3001
Frontend Status: ✅ Running on port 3000
Database: ✅ PostgreSQL
Storage: ✅ MinIO
Cache: ✅ Redis (if configured)
```

---

## ✨ SUMMARY

- **Total Test Cases**: 50+
- **Status**: In Progress
- **Last Updated**: 13/11/2025

---

## 🚀 How to Use This Checklist

1. Đối với mỗi chức năng, hãy kiểm tra tất cả các sub-items
2. ✅ = Passed (hoạt động đúng)
3. ❌ = Failed (cần sửa)
4. ⚠️ = Warning (cần cải thiện)
5. Ghi lại issue và bugs tìm được

---

