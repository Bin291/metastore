# TODO - Folder Page API Integration

## ✅ Completed Tasks

### 1. Tích hợp API GET /bucket/default/folders
- [x] Thêm `useAuthStore` để lấy token
- [x] Tạo `loadFolders` function trong `layout.tsx`
- [x] Transform API data sang local format
- [x] Thêm loading state và error handling
- [x] Fallback to localStorage nếu API fails
- [x] Update sidebar để hiển thị folders từ API
- [x] **FIX**: Handle API response format issues
- [x] **FIX**: Add validation cho array response
- [x] **FIX**: Add demo data fallback cho testing
- [x] **FIX**: Add key props cho conditional rendering
- [x] **FIX**: Ensure unique folder IDs với fallback
- [x] **FIX**: Use IIFE pattern cho conditional rendering

### 2. Update Folder Page
- [x] Thêm `useAuthStore` và token
- [x] Update state types (number → string cho file IDs)
- [x] Thêm `folderFiles` state và `isLoading` state
- [x] Tạo `loadFolderData` function
- [x] Update file selection và preview logic
- [x] Update table columns (Who can access → Type, Size)
- [x] Thêm loading state cho folder contents

## 🔄 In Progress

### 3. Load Files trong Folder
- [ ] Tạo API endpoint để lấy files trong folder cụ thể
- [ ] Tích hợp API call trong `loadFolderData`
- [ ] Transform file data từ API
- [ ] Update file display logic

## 📋 Pending Tasks

### 4. Folder Operations
- [ ] Tạo folder mới (POST /bucket/default/folders)
- [ ] Xóa folder (DELETE /bucket/default/folders/{id})
- [ ] Rename folder (PATCH /bucket/default/folders/{id})

### 5. File Operations trong Folder
- [ ] Upload file vào folder cụ thể
- [ ] Move file giữa các folders
- [ ] Delete file từ folder

### 6. UI Enhancements
- [ ] Thêm breadcrumb navigation
- [ ] Thêm folder context menu (right-click)
- [ ] Thêm drag & drop để move files
- [ ] Thêm search trong folder

## 🎯 Current Status

**Trang Folder đã tích hợp thành công API GET /bucket/default/folders:**

✅ **Sidebar hiển thị folders từ API**  
✅ **Loading states và error handling**  
✅ **Folder selection và navigation**  
✅ **Empty state khi folder không có files**  
✅ **Fallback to localStorage nếu API fails**  
✅ **FIXED**: API response format handling  
✅ **FIXED**: Demo data fallback cho testing  
✅ **FIXED**: React key props cho conditional rendering  
✅ **FIXED**: Unique folder IDs với validation  
✅ **FIXED**: IIFE pattern cho stable rendering  

**Next step:** Tạo API endpoint để lấy files trong folder cụ thể và tích hợp vào trang Folder. 