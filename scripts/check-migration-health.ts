/**
 * Migration Health Check Script
 * 
 * Checks the health of Prisma migrations by comparing:
 * - Local migration files vs database migration table
 * - Detects failed migrations
 * - Identifies missing or extra migrations
 * 
 * Usage: npm run prisma:health
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

interface MigrationRecord {
    migration_name: string;
    started_at: Date;
    finished_at: Date | null;
    logs: string | null;
}

async function getLocalMigrations(): Promise<string[]> {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error('❌ Migrations directory not found');
        process.exit(1);
    }

    const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory() && /^\d{14}_/.test(entry.name))
        .map(entry => entry.name)
        .sort();
}

async function getDatabaseMigrations(prisma: PrismaClient): Promise<MigrationRecord[]> {
    try {
        const migrations = await prisma.$queryRaw<MigrationRecord[]>`
      SELECT migration_name, started_at, finished_at, logs
      FROM "_prisma_migrations"
      ORDER BY started_at ASC
    `;
        return migrations;
    } catch (error) {
        console.error('❌ Failed to query _prisma_migrations table');
        console.error('   Make sure the database is accessible and migrations table exists');
        throw error;
    }
}

async function checkMigrationHealth(): Promise<boolean> {
    console.log('🏥 Checking migration health...\n');

    const prisma = new PrismaClient();
    let hasIssues = false;

    try {
        const localMigrations = await getLocalMigrations();
        const dbMigrations = await getDatabaseMigrations(prisma);

        // Check for failed migrations
        const failedMigrations = dbMigrations.filter(m => m.finished_at === null);
        if (failedMigrations.length > 0) {
            console.log('❌ FAILED MIGRATIONS DETECTED:\n');
            failedMigrations.forEach(migration => {
                console.log(`  Migration: ${migration.migration_name}`);
                console.log(`  Started:   ${migration.started_at}`);
                console.log(`  Status:    FAILED (finished_at is NULL)`);
                if (migration.logs) {
                    console.log(`  Logs:      ${migration.logs}`);
                }
                console.log('');
            });
            console.log('  ⚠️  Failed migrations block new migrations from being applied.');
            console.log('  📖 See agent.md "Migration Failure Recovery" section for resolution steps.\n');
            hasIssues = true;
        }

        // Check for migrations in DB but not locally
        const localMigrationSet = new Set(localMigrations);
        const extraInDb = dbMigrations
            .map(m => m.migration_name)
            .filter(name => !localMigrationSet.has(name));

        if (extraInDb.length > 0) {
            console.log('⚠️  MIGRATIONS IN DATABASE BUT NOT LOCALLY:\n');
            extraInDb.forEach(migration => {
                console.log(`  ${migration}`);
            });
            console.log('\n  This usually means:');
            console.log('  - You need to pull latest migration files from repository');
            console.log('  - Or migrations were applied directly to database (not recommended)\n');
            hasIssues = true;
        }

        // Check for migrations locally but not in DB
        const dbMigrationSet = new Set(dbMigrations.map(m => m.migration_name));
        const notApplied = localMigrations.filter(name => !dbMigrationSet.has(name));

        if (notApplied.length > 0) {
            console.log('ℹ️  UNAPPLIED MIGRATIONS:\n');
            notApplied.forEach(migration => {
                console.log(`  ${migration}`);
            });
            console.log('\n  These migrations exist locally but have not been applied to the database.');
            console.log('  Run: npx prisma migrate deploy\n');
        }

        // Summary
        console.log('📊 SUMMARY:\n');
        console.log(`  Local migrations:      ${localMigrations.length}`);
        console.log(`  Database migrations:   ${dbMigrations.length}`);
        console.log(`  Failed migrations:     ${failedMigrations.length}`);
        console.log(`  Unapplied migrations:  ${notApplied.length}`);
        console.log(`  Extra in DB:           ${extraInDb.length}\n`);

        if (!hasIssues && notApplied.length === 0) {
            console.log('✅ Migration health check passed!\n');
            return true;
        }

        if (hasIssues) {
            console.log('❌ Migration health check failed. Action required.\n');
            return false;
        }

        console.log('⚠️  Migration health check passed with warnings.\n');
        return true;

    } catch (error) {
        console.error('❌ Health check failed:', error);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

// Run health check
checkMigrationHealth()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
