# Recreate Database Container - Docker Compose Script

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("restart", "recreate", "fresh")]
    [string]$Mode = "restart",
    
    [Parameter(Mandatory=$false)]
    [switch]$Dev = $false
)

$ComposeFile = if ($Dev) { "docker-compose.dev.yml" } else { "docker-compose.yml" }
$ServiceName = "opsguard-db"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Recreate Database Container Script" -ForegroundColor Cyan
Write-Host "Using: $ComposeFile" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if docker-compose is available
try {
    $dockerComposeVersion = docker-compose --version 2>&1
    Write-Host "✓ docker-compose found" -ForegroundColor Green
} catch {
    Write-Host "✗ docker-compose not found. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker ps > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "Current container status:" -ForegroundColor Yellow
docker-compose -f $ComposeFile ps $ServiceName
Write-Host ""

switch ($Mode) {
    "restart" {
        Write-Host "Mode: Restart Container (Keeps Data)" -ForegroundColor Yellow
        Write-Host "Restarting $ServiceName..." -ForegroundColor Yellow
        
        docker-compose -f $ComposeFile restart $ServiceName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Container restarted" -ForegroundColor Green
            Write-Host ""
            Write-Host "Container status:" -ForegroundColor Yellow
            docker-compose -f $ComposeFile ps $ServiceName
        } else {
            Write-Host "✗ Failed to restart container" -ForegroundColor Red
            exit 1
        }
    }
    
    "recreate" {
        Write-Host "Mode: Recreate Container (Keeps Volume Data)" -ForegroundColor Yellow
        Write-Host "Recreating $ServiceName..." -ForegroundColor Yellow
        
        docker-compose -f $ComposeFile up -d --force-recreate $ServiceName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Container recreated" -ForegroundColor Green
            Write-Host ""
            Write-Host "Container status:" -ForegroundColor Yellow
            docker-compose -f $ComposeFile ps $ServiceName
            Write-Host ""
            Write-Host "Container logs:" -ForegroundColor Yellow
            docker-compose -f $ComposeFile logs --tail=20 $ServiceName
        } else {
            Write-Host "✗ Failed to recreate container" -ForegroundColor Red
            exit 1
        }
    }
    
    "fresh" {
        Write-Host "Mode: Complete Fresh Database" -ForegroundColor Yellow
        Write-Host "⚠️  WARNING: This will delete ALL database data!" -ForegroundColor Red
        Write-Host "⚠️  This includes:" -ForegroundColor Red
        Write-Host "   - Container" -ForegroundColor Red
        Write-Host "   - Volume (ALL DATA)" -ForegroundColor Red
        
        $confirm = Read-Host "Are you absolutely sure? Type 'DELETE ALL DATA' to confirm"
        if ($confirm -ne "DELETE ALL DATA") {
            Write-Host "Cancelled." -ForegroundColor Yellow
            exit 0
        }
        
        Write-Host "Stopping and removing container and volume..." -ForegroundColor Yellow
        docker-compose -f $ComposeFile down -v $ServiceName
        
        Write-Host "Recreating container..." -ForegroundColor Yellow
        docker-compose -f $ComposeFile up -d $ServiceName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Fresh database created" -ForegroundColor Green
            Write-Host ""
            Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            
            Write-Host "Container status:" -ForegroundColor Yellow
            docker-compose -f $ComposeFile ps $ServiceName
            Write-Host ""
            Write-Host "Container logs:" -ForegroundColor Yellow
            docker-compose -f $ComposeFile logs --tail=20 $ServiceName
            Write-Host ""
            Write-Host "⚠️  IMPORTANT: You need to run Prisma migrations now!" -ForegroundColor Yellow
            Write-Host "   npx prisma migrate deploy" -ForegroundColor Cyan
            Write-Host "   or" -ForegroundColor Cyan
            Write-Host "   npx prisma migrate reset --force" -ForegroundColor Cyan
        } else {
            Write-Host "✗ Failed to recreate container" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs: docker-compose -f $ComposeFile logs -f $ServiceName" -ForegroundColor Cyan
Write-Host "  Check status: docker-compose -f $ComposeFile ps $ServiceName" -ForegroundColor Cyan
Write-Host "  Connect to DB: docker-compose -f $ComposeFile exec $ServiceName psql -U opsguard -d opsguard_db" -ForegroundColor Cyan


