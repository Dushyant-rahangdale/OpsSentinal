#!/bin/sh
set -e

echo "🚀 OpsSentinal Startup"
echo "======================"

# ---------------------------
# Fault-tolerant Migration Logic
# ---------------------------
echo "🔄 Running database migrations..."

# Function to run migrations
run_migrations() {
    if [ -f "node_modules/prisma/build/index.js" ]; then
        node node_modules/prisma/build/index.js migrate deploy
        return $?
    else
        echo "⚠️  Prisma not found, skipping migrations"
        return 0
    fi
}

# Function to run auto-recovery
run_auto_recovery() {
    echo "🔧 Attempting auto-recovery..."
    
    # Check for compiled JS version (Production)
    if [ -f "scripts/dist/auto-recover-migrations.js" ]; then
        node scripts/dist/auto-recover-migrations.js
    
    # Fallback to TS version (Development w/ ts-node)
    elif [ -f "scripts/auto-recover-migrations.ts" ] && [ -f "node_modules/.bin/ts-node" ]; then
        node --loader ts-node/esm scripts/auto-recover-migrations.ts
        
    else
        echo "ℹ️  No executable recovery script found. Relying on app startup recovery."
    fi
}

MAX_RETRIES=3
RETRY_COUNT=0
MIGRATION_SUCCESS=0

# Retry loop with backoff
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if run_migrations; then
        echo "✅ Migrations completed successfully"
        MIGRATION_SUCCESS=1
        break
    else
        EXIT_CODE=$?
        echo "⚠️  Migration attempt $RETRY_COUNT failed (exit code: $EXIT_CODE)"
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            # Try recovery before next attempt
            run_auto_recovery
            
            echo "⏳ Waiting 5s before retrying..."
            sleep 5
        fi
    fi
done

if [ $MIGRATION_SUCCESS -eq 0 ]; then
    echo "❌ All migration attempts failed."
    echo "⚡ Starting application anyway (Instrumentation will attempt final recovery)..."
else
    echo "✅ Database is ready."
fi

echo "🚀 Starting application..."
exec node server.js
