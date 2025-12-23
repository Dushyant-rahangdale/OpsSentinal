# Clear Next.js build cache
# Run this script when you encounter EBUSY errors

Write-Host "Stopping any running Next.js processes..." -ForegroundColor Yellow

# Kill any node processes related to Next.js
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Waiting for file locks to release..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Removing .next directory..." -ForegroundColor Yellow
if (Test-Path .next) {
    try {
        Remove-Item -Recurse -Force .next -ErrorAction Stop
        Write-Host "✓ .next directory cleared successfully!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Error clearing .next: $_" -ForegroundColor Red
        Write-Host "Try closing any file explorers or OneDrive sync, then run this script again." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✓ .next directory doesn't exist (already cleared)" -ForegroundColor Green
}

Write-Host "`nYou can now restart the dev server with: npm run dev" -ForegroundColor Cyan








