# MetaStore Deployment Script (PowerShell)

Write-Host "🚀 MetaStore Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if git is clean
$gitStatus = git status -s
if ($gitStatus) {
    Write-Host "⚠️  Warning: You have uncommitted changes" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Build backend
Write-Host "`n📦 Building backend..." -ForegroundColor Green
Set-Location backend
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Build frontend
Write-Host "`n📦 Building frontend..." -ForegroundColor Green
Set-Location frontend
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Commit and push
Write-Host "`n📝 Committing changes..." -ForegroundColor Green
git add .
$date = Get-Date -Format "yyyy-MM-dd"
git commit -m "chore: prepare for deployment $date"
$branch = git branch --show-current
git push origin $branch

Write-Host "`n✅ Build successful and pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy backend to Railway: railway up (in backend folder)"
Write-Host "2. Deploy frontend to Vercel: vercel --prod (in frontend folder)"
Write-Host "3. Update environment variables on both platforms"
Write-Host "4. Test your deployment!"
