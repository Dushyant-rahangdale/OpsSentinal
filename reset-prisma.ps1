# Reset Prisma Database - Complete Clean Start (No Seeding)
# This script will:
# 1. Drop all tables in the database
# 2. Remove all migration files (except migration_lock.toml)
# 3. Create a fresh initial migration
# 4. Generate Prisma Client

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Prisma Database Reset Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Reset database (drops all tables)
Write-Host "Step 1: Resetting database (dropping all tables)..." -ForegroundColor Yellow
npx prisma migrate reset --skip-seed --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Database reset failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Database reset complete" -ForegroundColor Green
Write-Host ""

# Step 2: Remove all migration files (keep migration_lock.toml)
Write-Host "Step 2: Removing old migration files..." -ForegroundColor Yellow
$migrationsPath = "prisma\migrations"
if (Test-Path $migrationsPath) {
    Get-ChildItem -Path $migrationsPath -Directory | Where-Object { $_.Name -ne "migration_lock.toml" } | Remove-Item -Recurse -Force
    Write-Host "✓ Old migration files removed" -ForegroundColor Green
} else {
    Write-Host "⚠ Migrations directory not found, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Create fresh initial migration
Write-Host "Step 3: Creating fresh initial migration..." -ForegroundColor Yellow
npx prisma migrate dev --name init --skip-seed --create-only
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Migration creation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Initial migration created" -ForegroundColor Green
Write-Host ""

# Step 4: Apply migration
Write-Host "Step 4: Applying migration to database..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Migration deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Migration applied" -ForegroundColor Green
Write-Host ""

# Step 5: Generate Prisma Client
Write-Host "Step 5: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Prisma Client generation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma Client generated" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Reset Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your database has been reset and is ready to use." -ForegroundColor White
Write-Host "No seed data was inserted." -ForegroundColor White


