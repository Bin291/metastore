# start-dev.ps1

# Định nghĩa biến
$MINIO_CONTAINER = "minio"
$MINIO_PORT = "9000"
$MINIO_CONSOLE_PORT = "9001"
$MINIO_ACCESS_KEY = "minioadmin"
$MINIO_SECRET_KEY = "minioadmin"
$MINIO_VOLUME = "./minio"

# Phát hiện hệ điều hành
if ($env:OS -eq "Windows_NT") {
    $OS = "Windows"
} else {
    $OS = "Unix"
}

# Tạo thư mục MinIO nếu chưa tồn tại
if (-not (Test-Path $MINIO_VOLUME)) {
    New-Item -ItemType Directory -Path $MINIO_VOLUME -Force | Out-Null
}

# Dừng và xóa container MinIO nếu đang chạy
Write-Host "Stopping and removing MinIO container if exists..."
docker rm -f $MINIO_CONTAINER 2>$null

# Khởi động MinIO
Write-Host "Starting MinIO..."
$MINIO_VOLUME_ABS = (Resolve-Path $MINIO_VOLUME -ErrorAction SilentlyContinue).Path
if (-not $MINIO_VOLUME_ABS) { $MINIO_VOLUME_ABS = (Join-Path $PWD $MINIO_VOLUME) }
docker run -d --rm `
    --name $MINIO_CONTAINER `
    -p "$($MINIO_PORT):9000" `
    -p "$($MINIO_CONSOLE_PORT):9001" `
    -e "MINIO_ROOT_USER=$MINIO_ACCESS_KEY" `
    -e "MINIO_ROOT_PASSWORD=$MINIO_SECRET_KEY" `
    -v "$($MINIO_VOLUME_ABS):/data" `
    minio/minio server /data --console-address ":9001"

# Khởi động backend và frontend
if ($OS -eq "Windows") {
    # Windows: Mở cửa sổ Command Prompt mới
    Write-Host "Starting Backend..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d $PWD\backend && npm install && npm run start:dev"
    Write-Host "Starting Frontend..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d $PWD\frontend && npm install && npm run dev"
} else {
    # macOS/Linux: Chạy trong background
    Write-Host "Starting Backend..."
    Start-Process -FilePath "bash" -ArgumentList "-c", "cd $PWD/backend && npm install && npm run start:dev" -NoNewWindow
    Write-Host "Starting Frontend..."
    Start-Process -FilePath "bash" -ArgumentList "-c", "cd $PWD/frontend && npm install && npm run dev" -NoNewWindow
}

Write-Host "Development environment started! MinIO at http://localhost:9001"
if ($OS -eq "Windows") {
    pause
} else {
    Write-Host "Press Ctrl+C to stop..."
    Wait-Process -Name "bash" -ErrorAction SilentlyContinue
}