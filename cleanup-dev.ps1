# Cleanup script for OpsGuard local development resources
# This script stops and removes all Docker containers, volumes, and networks for the app

Write-Host "=== OpsGuard Local Development Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
} catch {
    Write-Host "✗ Docker is not running or not installed. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "1. Stopping and removing containers..." -ForegroundColor Yellow

# Stop and remove containers from dev compose file
if (Test-Path "docker-compose.dev.yml") {
    Write-Host "   - Cleaning dev containers (docker-compose.dev.yml)..." -ForegroundColor Gray
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>&1 | Out-Null
}

# Stop and remove containers from production compose file (in case they're running locally)
if (Test-Path "docker-compose.yml") {
    Write-Host "   - Cleaning production containers (docker-compose.yml)..." -ForegroundColor Gray
    docker-compose -f docker-compose.yml down --remove-orphans 2>&1 | Out-Null
}

# Force remove any remaining containers with opsguard in the name
Write-Host "   - Removing any remaining opsguard containers..." -ForegroundColor Gray
$containers = docker ps -a --filter "name=opsguard" --format "{{.Names}}" 2>&1
if ($containers) {
    $containers | ForEach-Object {
        docker rm -f $_ 2>&1 | Out-Null
        Write-Host "     Removed container: $_" -ForegroundColor Gray
    }
}

Write-Host "   ✓ Containers cleaned" -ForegroundColor Green
Write-Host ""

Write-Host "2. Removing volumes..." -ForegroundColor Yellow

# Remove volumes from dev compose
if (Test-Path "docker-compose.dev.yml") {
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>&1 | Out-Null
}

# Remove volumes from production compose
if (Test-Path "docker-compose.yml") {
    docker-compose -f docker-compose.yml down -v --remove-orphans 2>&1 | Out-Null
}

# Remove any remaining volumes with opsguard in the name
Write-Host "   - Checking for remaining opsguard volumes..." -ForegroundColor Gray
$volumes = docker volume ls --filter "name=opsguard" --format "{{.Name}}" 2>&1
if ($volumes) {
    $volumes | ForEach-Object {
        docker volume rm $_ 2>&1 | Out-Null
        Write-Host "     Removed volume: $_" -ForegroundColor Gray
    }
}

Write-Host "   ✓ Volumes cleaned" -ForegroundColor Green
Write-Host ""

Write-Host "3. Removing networks..." -ForegroundColor Yellow

# Remove networks (they should be removed with down, but let's be sure)
$networks = docker network ls --filter "name=opsguard" --format "{{.Name}}" 2>&1
if ($networks) {
    $networks | ForEach-Object {
        docker network rm $_ 2>&1 | Out-Null
        Write-Host "     Removed network: $_" -ForegroundColor Gray
    }
}

Write-Host "   ✓ Networks cleaned" -ForegroundColor Green
Write-Host ""

Write-Host "4. Optional: Remove Docker images?" -ForegroundColor Yellow
$removeImages = Read-Host "   Do you want to remove Docker images for opsguard? (y/N)"

if ($removeImages -eq 'y' -or $removeImages -eq 'Y') {
    Write-Host "   - Removing opsguard images..." -ForegroundColor Gray
    $images = docker images --filter "reference=opsguard*" --format "{{.ID}}" 2>&1
    if ($images) {
        $images | ForEach-Object {
            docker rmi -f $_ 2>&1 | Out-Null
            Write-Host "     Removed image: $_" -ForegroundColor Gray
        }
    }
    Write-Host "   ✓ Images cleaned" -ForegroundColor Green
} else {
    Write-Host "   Skipping image removal" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Cleanup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "All OpsGuard development resources have been removed." -ForegroundColor Cyan
Write-Host "You can now start fresh with: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan

