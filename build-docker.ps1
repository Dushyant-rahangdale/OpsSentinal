# Temporary build script to work around OneDrive file locking issues
$tempDir = "$env:TEMP\opsguard-build-$(Get-Date -Format 'yyyyMMddHHmmss')"
$sourceDir = $PSScriptRoot

Write-Host "Copying files to temporary location: $tempDir"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy only necessary files for Docker build
Copy-Item "$sourceDir\Dockerfile" "$tempDir\" -Force
Copy-Item "$sourceDir\package.json" "$tempDir\" -Force
Copy-Item "$sourceDir\package-lock.json" "$tempDir\" -Force
Copy-Item "$sourceDir\prisma" "$tempDir\" -Recurse -Force
Copy-Item "$sourceDir\src" "$tempDir\" -Recurse -Force
Copy-Item "$sourceDir\public" "$tempDir\" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\next.config.ts" "$tempDir\" -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\.dockerignore" "$tempDir\" -Force -ErrorAction SilentlyContinue

# Copy docker-compose.yml to temp location
Copy-Item "$sourceDir\docker-compose.yml" "$tempDir\" -Force

Write-Host "Building Docker image from temporary location..."
Set-Location $tempDir
docker-compose build opsguard-app

Write-Host "Cleaning up temporary files..."
Set-Location $sourceDir
Remove-Item $tempDir -Recurse -Force

Write-Host "Build complete!"

