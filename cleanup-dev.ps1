<#
Simple cleanup script for opssentinal local development resources.
It stops Node.js processes tied to this repo, brings down Docker Compose stacks,
and removes opssentinal-specific Docker volumes and caches.
#>

Write-Host "=== opssentinal Cleanup ===" -ForegroundColor Cyan

function Stop-ProcessOnPort {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if ($connections) {
        foreach ($connPid in $connections) {
            try {
                $proc = Get-Process -Id $connPid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "Stopping process $connPid ($($proc.ProcessName)) on port $Port" -ForegroundColor Gray
                    Stop-Process -Id $connPid -Force -ErrorAction SilentlyContinue
                }
            } catch {
                # process may already be gone
            }
        }
        return $true
    }

    return $false
}

$currentDir = (Get-Location).Path
Write-Host "1. Stopping Node.js processes tied to $currentDir" -ForegroundColor Yellow
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
$stopped = 0

foreach ($proc in $nodeProcs) {
    try {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmd) {
            if ($cmd -like "*$currentDir*" -or $cmd -like "*next dev*" -or $cmd -like "*next start*" -or $cmd -like "*opssentinal*") {
                Write-Host "   Killing Node.js process $($proc.Id)" -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                $stopped++
            }
        }
    } catch {
        # ignore access issues
    }
}

if ($stopped -gt 0) {
    Write-Host "   Stopped $stopped Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "   No matching Node.js processes found" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. Freeing ports 3000 and 5432" -ForegroundColor Yellow
$p3000 = Stop-ProcessOnPort -Port 3000
$p5432 = Stop-ProcessOnPort -Port 5432
if ($p3000 -or $p5432) {
    Write-Host "   Freed blocked ports" -ForegroundColor Green
} else {
    Write-Host "   Ports were already clear" -ForegroundColor Green
}

Write-Host ""
Write-Host "3. Stopping Docker Compose stacks" -ForegroundColor Yellow

function Run-DockerComposeDown($file) {
    if (Test-Path $file) {
        Write-Host "   Bringing down $file" -ForegroundColor Gray
        & docker-compose -f $file down --remove-orphans | Out-Null
    } else {
        Write-Host "   File $file not found, skipping" -ForegroundColor DarkGray
    }
}

Run-DockerComposeDown -file "docker-compose.dev.yml"
Run-DockerComposeDown -file "docker-compose.yml"

Write-Host ""
Write-Host "4. Removing opssentinal Docker volumes" -ForegroundColor Yellow
$volumes = docker volume ls --filter "name=opssentinal" --format "{{.Name}}" 2>$null
foreach ($vol in $volumes) {
    if ($vol) {
        Write-Host "   Removing volume $vol" -ForegroundColor Gray
        docker volume rm $vol | Out-Null
    }
}

Write-Host ""
Write-Host "5. Optional: Clean build caches" -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "   Removing .next" -ForegroundColor Gray
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "node_modules/.cache") {
    Write-Host "   Removing node_modules/.cache" -ForegroundColor Gray
    Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Cleanup finished. You can restart containers with docker-compose." -ForegroundColor Cyan


