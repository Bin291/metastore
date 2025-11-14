#!/usr/bin/env pwsh
# Script khởi động tất cả services cho Metastore project

Write-Host "🚀 Khởi động Metastore services..." -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Docker
Write-Host "⏳ Kiểm tra Docker..." -ForegroundColor Yellow
$dockerCheck = docker --version 2>$null
if (-not $dockerCheck) {
    Write-Host "❌ Docker không được cài đặt hoặc không chạy!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker đã sẵn sàng: $dockerCheck" -ForegroundColor Green
Write-Host ""

# Dừng các container cũ
Write-Host "⏳ Dừng các container cũ..." -ForegroundColor Yellow
docker rm -f minio redis 2>$null
Write-Host "✅ Các container cũ đã dừng" -ForegroundColor Green
Write-Host ""

# Tạo thư mục minio
$minioPath = "C:\Users\Acer\metastore\minio"
if (-not (Test-Path $minioPath)) {
    New-Item -ItemType Directory -Path $minioPath | Out-Null
    Write-Host "✅ Tạo thư mục minio: $minioPath" -ForegroundColor Green
}

# Khởi động MinIO
Write-Host "⏳ Khởi động MinIO..." -ForegroundColor Yellow
docker run -d --rm --name minio `
    -p 9000:9000 -p 9001:9001 `
    -e MINIO_ROOT_USER=minioadmin `
    -e MINIO_ROOT_PASSWORD=minioadmin `
    -v "$minioPath`:/data" `
    minio/minio:latest server /data --console-address ":9001" | Out-Null

Start-Sleep -Seconds 2
$minioCheck = docker ps | Select-String minio
if ($minioCheck) {
    Write-Host "✅ MinIO đang chạy" -ForegroundColor Green
} else {
    Write-Host "❌ MinIO không thể khởi động!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Khởi động Redis
Write-Host "⏳ Khởi động Redis..." -ForegroundColor Yellow
docker run -d --rm --name redis `
    -p 6379:6379 `
    redis:7-alpine | Out-Null

Start-Sleep -Seconds 2
$redisCheck = docker ps | Select-String redis
if ($redisCheck) {
    Write-Host "✅ Redis đang chạy" -ForegroundColor Green
} else {
    Write-Host "❌ Redis không thể khởi động!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Hiển thị thông tin kết nối
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📊 THÔNG TIN KẾT NỐI" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Frontend:      http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API:   http://localhost:3001/api" -ForegroundColor Green
Write-Host "MinIO API:     http://localhost:9000" -ForegroundColor Green
Write-Host "MinIO Console: http://localhost:9001" -ForegroundColor Green
Write-Host "Redis:         localhost:6379" -ForegroundColor Green
Write-Host ""
Write-Host "Tài khoản admin:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "MinIO credentials:" -ForegroundColor Yellow
Write-Host "  Username: minioadmin" -ForegroundColor White
Write-Host "  Password: minioadmin" -ForegroundColor White
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Khởi động Backend
Write-Host "⏳ Khởi động Backend (npm run start:dev)..." -ForegroundColor Yellow
Write-Host "   Tương tự, mở terminal mới và chạy:" -ForegroundColor Cyan
Write-Host "   cd C:\Users\Acer\metastore\frontend" -ForegroundColor Cyan
Write-Host "   npm install" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""

# Chạy backend
Set-Location "C:\Users\Acer\metastore\backend"
npm run start:dev
