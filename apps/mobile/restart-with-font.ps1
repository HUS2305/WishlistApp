# PowerShell script to restart Expo with cleared cache
# This ensures the new font configuration is loaded

Write-Host "🎨 Restarting Expo with Playwrite CZ font..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
Set-Location $PSScriptRoot

Write-Host "📦 Clearing Metro bundler cache..." -ForegroundColor Yellow
Write-Host ""

# Start Expo with cleared cache
Write-Host "🚀 Starting Expo..." -ForegroundColor Green
Write-Host ""
Write-Host "After the QR code appears:" -ForegroundColor Yellow
Write-Host "  1. Close Expo Go app completely" -ForegroundColor White
Write-Host "  2. Reopen Expo Go" -ForegroundColor White
Write-Host "  3. Scan the QR code again" -ForegroundColor White
Write-Host ""
Write-Host "All text should now be in Playwrite CZ handwriting style! ✨" -ForegroundColor Green
Write-Host ""

npx expo start --clear

