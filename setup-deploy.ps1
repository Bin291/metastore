# MetaStore FREE Deployment Setup Script

Write-Host "🎯 MetaStore FREE Deployment Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

# Check npm
$npmVersion = npm --version 2>$null
Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green

# Check git
$gitVersion = git --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git not found. Please install Git" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Git installed" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 Deployment Options:" -ForegroundColor Cyan
Write-Host "1. Frontend Only (Vercel) - EASIEST & FREE"
Write-Host "2. Frontend + Backend Local (ngrok tunnel) - FULL FEATURES FREE"
Write-Host "3. Frontend + Backend (Railway) - FREE 500 hours/month"
Write-Host ""

$choice = Read-Host "Select option (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📦 Option 1: Frontend Only Deployment" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Install Vercel CLI: npm install -g vercel"
        Write-Host "2. Build frontend: cd frontend && npm run build"
        Write-Host "3. Deploy: vercel --prod"
        Write-Host ""
        Write-Host "⚠️  Backend will run locally only" -ForegroundColor Yellow
        Write-Host "   You need to keep your computer on for backend to work"
        Write-Host ""
        
        $install = Read-Host "Install Vercel CLI now? (y/n)"
        if ($install -eq "y") {
            npm install -g vercel
        }
        
        $build = Read-Host "Build and test frontend now? (y/n)"
        if ($build -eq "y") {
            Write-Host "Building frontend..." -ForegroundColor Yellow
            Set-Location frontend
            npm install
            npm run build
            Set-Location ..
            Write-Host "✅ Frontend build successful!" -ForegroundColor Green
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "📦 Option 2: Full Stack Local + ngrok" -ForegroundColor Green
        Write-Host "=======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Install ngrok: https://ngrok.com/download"
        Write-Host "2. Setup Supabase (FREE): https://supabase.com"
        Write-Host "3. Setup Cloudflare R2 (FREE): https://cloudflare.com/r2"
        Write-Host "4. Build backend: cd backend && npm run build"
        Write-Host "5. Start backend: npm run start:prod"
        Write-Host "6. Tunnel backend: ngrok http 3001"
        Write-Host "7. Deploy frontend to Vercel with ngrok URL"
        Write-Host ""
        Write-Host "✅ Pros: Full features (video processing, HLS)" -ForegroundColor Green
        Write-Host "⚠️  Cons: Computer must stay on" -ForegroundColor Yellow
        Write-Host ""
        
        $setup = Read-Host "Open setup guides? (y/n)"
        if ($setup -eq "y") {
            Start-Process "https://ngrok.com/download"
            Start-Process "https://supabase.com"
            Start-Process "https://cloudflare.com"
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "📦 Option 3: Frontend + Backend Cloud (FREE Tiers)" -ForegroundColor Green
        Write-Host "===================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Stack:" -ForegroundColor Yellow
        Write-Host "- Frontend: Vercel (FREE unlimited)"
        Write-Host "- Backend: Railway (FREE 500 hours/month)"
        Write-Host "- Database: Supabase PostgreSQL (FREE 500MB)"
        Write-Host "- Storage: Cloudflare R2 (FREE 10GB)"
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Create accounts on:"
        Write-Host "   - Vercel: https://vercel.com"
        Write-Host "   - Railway: https://railway.app"
        Write-Host "   - Supabase: https://supabase.com"
        Write-Host "   - Cloudflare: https://cloudflare.com"
        Write-Host ""
        Write-Host "2. Setup Railway:"
        Write-Host "   npm install -g @railway/cli"
        Write-Host "   railway login"
        Write-Host "   cd backend && railway init"
        Write-Host ""
        Write-Host "3. Setup Vercel:"
        Write-Host "   npm install -g vercel"
        Write-Host "   cd frontend && vercel"
        Write-Host ""
        Write-Host "⚠️  Video processing disabled (FFmpeg not available on Railway FREE tier)" -ForegroundColor Yellow
        Write-Host "   Video uploads work but no HLS streaming" -ForegroundColor Yellow
        Write-Host ""
        
        $install = Read-Host "Install Railway & Vercel CLI now? (y/n)"
        if ($install -eq "y") {
            npm install -g @railway/cli vercel
        }
    }
}

Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Read DEPLOYMENT_FREE.md for detailed instructions"
Write-Host "2. Setup your chosen platform accounts"
Write-Host "3. Configure environment variables"
Write-Host "4. Deploy!"
Write-Host ""
Write-Host "Need help? Check DEPLOYMENT_FREE.md" -ForegroundColor Yellow
