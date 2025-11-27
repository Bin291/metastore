Write-Host "🔐 Generating JWT Secrets..." -ForegroundColor Cyan
Write-Host ""

# Generate random secrets
$accessSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$refreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host "✅ Secrets generated!" -ForegroundColor Green
Write-Host ""
Write-Host "Copy these to your .env file or deployment platform:" -ForegroundColor Yellow
Write-Host ""
Write-Host "JWT_ACCESS_SECRET=$accessSecret" -ForegroundColor White
Write-Host "JWT_REFRESH_SECRET=$refreshSecret" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Keep these secrets private! Never commit to git!" -ForegroundColor Red
Write-Host ""

# Offer to copy to clipboard
$copy = Read-Host "Copy ACCESS_SECRET to clipboard? (y/n)"
if ($copy -eq "y") {
    $accessSecret | Set-Clipboard
    Write-Host "✅ Copied to clipboard!" -ForegroundColor Green
}
