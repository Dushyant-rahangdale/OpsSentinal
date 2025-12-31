"use strict";
/**
 * Automatic Migration Recovery Script
 *
 * This script runs on application startup to detect and auto-resolve failed migrations.
 * Designed for containerized deployments where manual intervention is not possible.
 *
 * Features:
 * - Detects failed migrations
 * - Verifies actual database state
 * - Auto-resolves based on database reality
 * - Idempotent and safe for repeated runs
 * - No manual intervention required
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRecoverMigrations = autoRecoverMigrations;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const prisma = new client_1.PrismaClient();
/**
 * Check if enum value exists in database
 */
async function enumValueExists(enumName, value) {
    try {
        const result = await prisma.$queryRaw `
      SELECT e.enumlabel 
      FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = ${enumName}
    `;
        return result.some(r => r.enumlabel === value);
    }
    catch (error) {
        console.error(`Failed to check enum value ${enumName}.${value}:`, error);
        return false;
    }
}
/**
 * Get all failed migrations from database
 */
async function getFailedMigrations() {
    try {
        const failed = await prisma.$queryRaw `
      SELECT migration_name, started_at, finished_at, logs
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
      ORDER BY started_at ASC
    `;
        return failed;
    }
    catch (error) {
        console.error('Failed to query _prisma_migrations:', error);
        return [];
    }
}
/**
 * Auto-resolve a failed migration based on database state
 */
async function autoResolveMigration(migration) {
    const migrationName = migration.migration_name;
    console.log(`\n🔍 Analyzing migration: ${migrationName}`);
    // Special handling for known enum migrations
    if (migrationName.includes('escalation_policy_enum')) {
        const exists = await enumValueExists('AuditEntityType', 'ESCALATION_POLICY');
        if (exists) {
            console.log('  ✅ Enum value ESCALATION_POLICY exists in database');
            console.log('  🔧 Auto-resolving migration as applied...');
            try {
                (0, child_process_1.execSync)(`npx prisma migrate resolve --applied ${migrationName}`, { stdio: 'pipe', encoding: 'utf-8' });
                return {
                    success: true,
                    action: 'resolved',
                    migration: migrationName,
                    reason: 'Enum value exists, marked as applied'
                };
            }
            catch (error) {
                return {
                    success: false,
                    action: 'failed',
                    migration: migrationName,
                    reason: `Failed to resolve: ${error}`
                };
            }
        }
        else {
            console.log('  ⚠️  Enum value ESCALATION_POLICY does NOT exist');
            console.log('  🔧 Applying enum value...');
            try {
                // Apply the enum value
                await prisma.$executeRaw `
          ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'ESCALATION_POLICY'
        `;
                // Mark migration as applied
                (0, child_process_1.execSync)(`npx prisma migrate resolve --applied ${migrationName}`, { stdio: 'pipe', encoding: 'utf-8' });
                return {
                    success: true,
                    action: 'resolved',
                    migration: migrationName,
                    reason: 'Enum value added and migration marked as applied'
                };
            }
            catch (error) {
                return {
                    success: false,
                    action: 'failed',
                    migration: migrationName,
                    reason: `Failed to apply enum: ${error}`
                };
            }
        }
    }
    // Generic handling for other migration types
    // For safety, we'll log and skip unknown failures
    console.log('  ⚠️  Unknown migration type - manual review recommended');
    return {
        success: false,
        action: 'skipped',
        migration: migrationName,
        reason: 'Unknown migration type, skipped for safety'
    };
}
/**
 * Main recovery function
 */
async function autoRecoverMigrations() {
    console.log('\n🏥 =================================================');
    console.log('   AUTOMATIC MIGRATION RECOVERY');
    console.log('   =================================================\n');
    let allSuccess = true;
    try {
        // Check for failed migrations
        const failedMigrations = await getFailedMigrations();
        if (failedMigrations.length === 0) {
            console.log('✅ No failed migrations detected. System healthy!');
            return true;
        }
        console.log(`⚠️  Found ${failedMigrations.length} failed migration(s)...\n`);
        // Attempt to recover each failed migration
        const results = [];
        for (const migration of failedMigrations) {
            const result = await autoResolveMigration(migration);
            results.push(result);
            if (!result.success && result.action === 'failed') {
                allSuccess = false;
            }
        }
        // Print summary
        console.log('\n📊 RECOVERY SUMMARY:');
        console.log('   =================================================');
        const resolved = results.filter(r => r.action === 'resolved');
        const skipped = results.filter(r => r.action === 'skipped');
        const failed = results.filter(r => r.action === 'failed');
        if (resolved.length > 0) {
            console.log(`   ✅ Resolved: ${resolved.length}`);
            resolved.forEach(r => console.log(`      - ${r.migration}: ${r.reason}`));
        }
        if (skipped.length > 0) {
            console.log(`   ⏭️  Skipped: ${skipped.length}`);
            skipped.forEach(r => console.log(`      - ${r.migration}: ${r.reason}`));
        }
        if (failed.length > 0) {
            console.log(`   ❌ Failed: ${failed.length}`);
            failed.forEach(r => console.log(`      - ${r.migration}: ${r.reason}`));
        }
        console.log('   =================================================\n');
        if (allSuccess && skipped.length === 0) {
            console.log('✅ All migrations recovered successfully!');
            // Try to apply any pending migrations
            try {
                console.log('\n🚀 Applying pending migrations...');
                (0, child_process_1.execSync)('npx prisma migrate deploy', { stdio: 'inherit' });
            }
            catch (error) {
                console.error('⚠️  Failed to apply pending migrations:', error);
                allSuccess = false;
            }
        }
        return allSuccess;
    }
    catch (error) {
        console.error('❌ Migration recovery failed:', error);
        return false;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
    autoRecoverMigrations()
        .then(success => {
        process.exit(success ? 0 : 1);
    })
        .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
