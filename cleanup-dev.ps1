# Cleanup script for OpsGuard local development resources
# This script stops and removes all Docker containers, volumes, networks, 
# local Node.js processes, and processes using dev ports

Write-Host "=== OpsGuard Local Development Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Function to kill processes on a port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($processes) {
        foreach ($processId in $processes) {
            try {
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "     Killing process $processId ($($proc.ProcessName)) on port $Port" -ForegroundColor Gray
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                }
            } catch {
                # Process may have already terminated
            }
        }
        return $true
    }
    return $false
}

Write-Host "1. Stopping local Node.js processes..." -ForegroundColor Yellow

# Try to find and kill Node.js processes that might be running from this project
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
$killedCount = 0

if ($nodeProcesses) {
    $currentDir = (Get-Location).Path
    foreach ($proc in $nodeProcesses) {
        try {
            # Try to get the command line using WMI to check if it's related to this project
            $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
            
            # Check if the process is related to this project or Next.js dev server
            $isRelated = $false
            if ($commandLine) {
                if ($commandLine -like "*$currentDir*" -or 
                    $commandLine -like "*next dev*" -or 
                    $commandLine -like "*next start*" -or
                    $commandLine -like "*opsguard*") {
                    $isRelated = $true
                }
            }
            
            if ($isRelated) {
                Write-Host "   - Stopping Node.js process: $($proc.Id) ($($proc.ProcessName))" -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                $killedCount++
            }
        } catch {
            # Process may have already terminated or access denied
        }
    }
}

if ($killedCount -gt 0) {
    Write-Host "   âœ“ Stopped $killedCount Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "   âœ“ No related Node.js processes found" -ForegroundColor Green
}

Write-Host ""

Write-Host "2. Stopping processes on dev ports (3000, 5432)..." -ForegroundColor Yellow

$port3000Stopped = Stop-ProcessOnPort -Port 3000
$port5432Stopped = Stop-ProcessOnPort -Port 5432

if ($port3000Stopped -or $port5432Stopped) {
    Write-Host "   âœ“ Port processes stopped" -ForegroundColor Green
} else {
    Write-Host "   âœ“ No processes found on ports 3000/5432" -ForegroundColor Green
}

Write-Host ""

# Check if Docker is running
Write-Host "3. Cleaning Docker resources..." -ForegroundColor Yellow

$dockerAvailable = $false
try {
    $null = docker --version 2>&1 | Out-Null
    if ($?) {
        $dockerAvailable = $true
    }
} catch {
    $dockerAvailable = $false
}

if (-not $dockerAvailable) {
    Write-Host "   âš  Docker is not running or not installed. Skipping Docker cleanup." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "   - Stopping and removing containers..." -ForegroundColor Gray

    # Stop and remove containers from dev compose file
    if (Test-Path "docker-compose.dev.yml") {
        Write-Host "     Cleaning dev containers (docker-compose.dev.yml)..." -ForegroundColor DarkGray
        docker-compose -f docker-compose.dev.yml down --remove-orphans 2>&1 | Out-Null
    }

    # Stop and remove containers from production compose file (in case they're running locally)
    if (Test-Path "docker-compose.yml") {
        Write-Host "     Cleaning production containers (docker-compose.yml)..." -ForegroundColor DarkGray
        docker-compose -f docker-compose.yml down --remove-orphans 2>&1 | Out-Null
    }

    # Force remove any remaining containers with opsguard in the name
    $containerOutput = docker ps -a --filter "name=opsguard" 2>&1
    if ($containerOutput) {
        $containers = $containerOutput | Select-Object -Skip 1 | ForEach-Object { 
            $parts = $_ -split '\s+'
            if ($parts.Length -gt 0) { $parts[-1] }
        } | Where-Object { $_ -and $_ -ne "NAMES" }
        foreach ($container in $containers) {
            if ($container) {
                docker rm -f $container 2>&1 | Out-Null
                Write-Host "       Removed container: $container" -ForegroundColor DarkGray
            }
        }
    }

    Write-Host "   âœ“ Containers cleaned" -ForegroundColor Green

    Write-Host "   - Removing volumes..." -ForegroundColor Gray

    # Remove volumes from dev compose
    if (Test-Path "docker-compose.dev.yml") {
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>&1 | Out-Null
    }

    # Remove volumes from production compose
    if (Test-Path "docker-compose.yml") {
        docker-compose -f docker-compose.yml down -v --remove-orphans 2>&1 | Out-Null
    }

    # Remove any remaining volumes with opsguard in the name
    $volumeOutput = docker volume ls --filter "name=opsguard" 2>&1
    if ($volumeOutput) {
        $volumes = $volumeOutput | Select-Object -Skip 1 | ForEach-Object {
            $parts = $_ -split '\s+', 2
            if ($parts.Length -gt 1) { $parts[1] }
        } | Where-Object { $_ -and $_ -ne "VOLUME NAME" }
        foreach ($volume in $volumes) {
            if ($volume) {
                docker volume rm $volume 2>&1 | Out-Null
                Write-Host "       Removed volume: $volume" -ForegroundColor DarkGray
            }
        }
    }

    Write-Host "   âœ“ Volumes cleaned" -ForegroundColor Green

    Write-Host "   - Removing networks..." -ForegroundColor Gray

    # Remove networks (they should be removed with down, but let's be sure)
    $networkOutput = docker network ls --filter "name=opsguard" 2>&1
    if ($networkOutput) {
        $networks = $networkOutput | Select-Object -Skip 1 | ForEach-Object {
            $parts = $_ -split '\s+', 2
            if ($parts.Length -gt 1) { 
                $namePart = ($parts[1] -split '\s+')[0]
                if ($namePart -notmatch '^[a-f0-9]{12}$') { $namePart }
            }
        } | Where-Object { $_ -and $_ -ne "NETWORK" }
        foreach ($network in $networks) {
            if ($network) {
                docker network rm $network 2>&1 | Out-Null
                Write-Host "       Removed network: $network" -ForegroundColor DarkGray
            }
        }
    }

    Write-Host "   âœ“ Networks cleaned" -ForegroundColor Green

    Write-Host ""
    Write-Host "   Optional: Remove Docker images?" -ForegroundColor Yellow
    $removeImages = Read-Host "   Do you want to remove Docker images for opsguard? (y/N)"

    if ($removeImages -eq 'y' -or $removeImages -eq 'Y') {
        Write-Host "   - Removing opsguard images..." -ForegroundColor Gray
        $imageOutput = docker images --filter "reference=opsguard*" 2>&1
        if ($imageOutput) {
            $images = $imageOutput | Select-Object -Skip 1 | ForEach-Object {
                $parts = $_ -split '\s+'
                if ($parts.Length -gt 2) { $parts[2] }
            } | Where-Object { $_ -and $_ -ne "IMAGE ID" }
            foreach ($imageId in $images) {
                if ($imageId) {
                    docker rmi -f $imageId 2>&1 | Out-Null
                    Write-Host "     Removed image: $imageId" -ForegroundColor Gray
                }
            }
        }
        Write-Host "   âœ“ Images cleaned" -ForegroundColor Green
    } else {
        Write-Host "   Skipping image removal" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "4. Optional: Clean build artifacts?" -ForegroundColor Yellow
$cleanBuild = Read-Host "   Do you want to remove .next folder and build cache? (y/N)"

if ($cleanBuild -eq 'y' -or $cleanBuild -eq 'Y') {
    Write-Host "   - Removing build artifacts..." -ForegroundColor Gray
    
    if (Test-Path ".next") {
        Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "     Removed .next folder" -ForegroundColor DarkGray
    }
    
    if (Test-Path "node_modules/.cache") {
        Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "     Removed node_modules/.cache" -ForegroundColor DarkGray
    }
    
    Write-Host "   âœ“ Build artifacts cleaned" -ForegroundColor Green
} else {
    Write-Host "   Skipping build artifact cleanup" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Cleanup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "All OpsGuard development resources have been removed." -ForegroundColor Cyan
Write-Host "You can now start fresh with: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
