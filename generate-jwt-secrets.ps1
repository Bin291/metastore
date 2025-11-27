# Generate random JWT secrets for production

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Generate JWT Secrets" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Generate random secrets (64 characters)
function Get-RandomSecret {
    param([int]$Length = 64)
    
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $secret = -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    return $secret
}

$accessSecret = Get-RandomSecret
$refreshSecret = Get-RandomSecret

Write-Host "✅ Generated new JWT secrets!" -ForegroundColor Green
Write-Host ""
Write-Host "JWT_ACCESS_SECRET:" -ForegroundColor Yellow
Write-Host $accessSecret -ForegroundColor White
Write-Host ""
Write-Host "JWT_REFRESH_SECRET:" -ForegroundColor Yellow
Write-Host $refreshSecret -ForegroundColor White
Write-Host ""

# Ask to update .env.production
$update = Read-Host "Update backend/.env.production automatically? (y/n)"

if ($update -eq "y" -or $update -eq "Y") {
    $envPath = "backend/.env.production"
    
    if (Test-Path $envPath) {
        # Read file and replace secrets
        $content = Get-Content $envPath -Raw
        $content = $content -replace 'JWT_ACCESS_SECRET=.*', "JWT_ACCESS_SECRET=$accessSecret"
        $content = $content -replace 'JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$refreshSecret"
        
        # Save file
        $content | Set-Content $envPath -NoNewline
        
        Write-Host ""
        Write-Host "✅ Updated $envPath" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Keep these secrets safe!" -ForegroundColor Yellow
        Write-Host "   Do NOT commit .env.production to git!" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ File not found: $envPath" -ForegroundColor Red
        Write-Host "Please copy the secrets manually" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "📝 Copy these secrets to backend/.env.production manually" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..."
Read-Host
