#!/usr/bin/env pwsh
# Script khởi động MinIO + Redis

Write-Host "🚀 Khởi động MinIO + Redis..." -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Docker
Write-Host "⏳ Kiểm tra Docker..." -ForegroundColor Yellow
$dockerCheck = docker --version 2>$null
if (-not $dockerCheck) {
    Write-Host "❌ Docker không được cài đặt hoặc không chạy!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker đã sẵn sàng" -ForegroundColor Green
Write-Host ""

# Dừng các container cũ
Write-Host "⏳ Dừng các container cũ..." -ForegroundColor Yellow
docker rm -f minio redis 2>$null | Out-Null
Write-Host "✅ Các container cũ đã dừng" -ForegroundColor Green
Write-Host ""

# Tạo thư mục minio
$minioPath = "C:\Users\Acer\metastore\minio"
if (-not (Test-Path $minioPath)) {
    New-Item -ItemType Directory -Path $minioPath | Out-Null
}

# Khởi động MinIO + Redis cùng lúc
Write-Host "⏳ Khởi động MinIO..." -ForegroundColor Yellow
docker run -d --rm --name minio `
    -p 9000:9000 -p 9001:9001 `
    -e MINIO_ROOT_USER=minioadmin `
    -e MINIO_ROOT_PASSWORD=minioadmin `
    -v "$minioPath`:/data" `
    minio/minio:latest server /data --console-address ":9001" | Out-Null

Write-Host "⏳ Khởi động Redis..." -ForegroundColor Yellow
docker run -d --rm --name redis `
    -p 6379:6379 `
    redis:7-alpine | Out-Null

# Đợi services khởi động
Write-Host "⏳ Chờ services khởi động..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Kiểm tra
$minioCheck = docker ps | Select-String minio
$redisCheck = docker ps | Select-String redis

Write-Host ""
if ($minioCheck) {
    Write-Host "✅ MinIO đang chạy" -ForegroundColor Green
} else {
    Write-Host "❌ MinIO không thể khởi động!" -ForegroundColor Red
}

if ($redisCheck) {
    Write-Host "✅ Redis đang chạy" -ForegroundColor Green
} else {
    Write-Host "❌ Redis không thể khởi động!" -ForegroundColor Red
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Services đã sẵn sàng!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "MinIO Console: http://localhost:9001" -ForegroundColor Green
Write-Host "MinIO API:     http://localhost:9000" -ForegroundColor Green
Write-Host "Redis:         localhost:6379" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
