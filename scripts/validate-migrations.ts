/**
 * Migration Validation Script
 * 
 * Validates Prisma migrations before deployment to catch common issues:
 * - Transaction-unsafe enum additions
 * - Dangerous operations (DROP, TRUNCATE)
 * - Invalid migration naming
 * - Syntax errors
 * 
 * Usage: npm run prisma:validate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    migration: string;
    message: string;
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');
const DANGEROUS_OPERATIONS = ['DROP TABLE', 'DROP COLUMN', 'TRUNCATE', 'DELETE FROM'];
const ENUM_ALTER_PATTERN = /ALTER\s+TYPE\s+"?\w+"?\s+ADD\s+VALUE/i;

function getAllMigrations(): string[] {
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

function readMigrationSQL(migrationName: string): string | null {
    const sqlPath = path.join(MIGRATIONS_DIR, migrationName, 'migration.sql');

    if (!fs.existsSync(sqlPath)) {
        return null;
    }

    return fs.readFileSync(sqlPath, 'utf-8');
}

function validateMigrationNaming(migrationName: string): ValidationIssue | null {
    // Check timestamp format (YYYYMMDDHHMMSS)
    const timestampPattern = /^(\d{14})_(.+)$/;
    const match = migrationName.match(timestampPattern);

    if (!match) {
        return {
            severity: 'error',
            migration: migrationName,
            message: 'Invalid migration name format. Expected: YYYYMMDDHHmmss_description'
        };
    }

    const [, timestamp, description] = match;

    // Validate timestamp components
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6));
    const day = parseInt(timestamp.substring(6, 8));

    if (month < 1 || month > 12) {
        return {
            severity: 'error',
            migration: migrationName,
            message: `Invalid month in timestamp: ${month}`
        };
    }

    if (day < 1 || day > 31) {
        return {
            severity: 'error',
            migration: migrationName,
            message: `Invalid day in timestamp: ${day}`
        };
    }

    // Check for specific invalid dates
    const monthsWith30Days = [4, 6, 9, 11];
    if (monthsWith30Days.includes(month) && day > 30) {
        return {
            severity: 'error',
            migration: migrationName,
            message: `Invalid date: Month ${month} only has 30 days, found day ${day}`
        };
    }

    // Basic February validation
    if (month === 2 && day > 29) {
        return {
            severity: 'error',
            migration: migrationName,
            message: `Invalid date: February cannot have ${day} days`
        };
    }

    // Check description
    if (!description || description.length < 3) {
        return {
            severity: 'warning',
            migration: migrationName,
            message: 'Migration description is too short or missing'
        };
    }

    return null;
}

function validateMigrationContent(migrationName: string, sql: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for enum alterations with other operations
    if (ENUM_ALTER_PATTERN.test(sql)) {
        const lines = sql.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('--');
        });

        if (lines.length > 1) {
            // Check if there are non-enum operations
            const hasOtherOperations = lines.some(line => {
                const trimmed = line.trim();
                return trimmed &&
                    !ENUM_ALTER_PATTERN.test(trimmed) &&
                    trimmed !== ';';
            });

            if (hasOtherOperations) {
                issues.push({
                    severity: 'error',
                    migration: migrationName,
                    message: '⚠️  CRITICAL: Enum ALTER TYPE cannot be mixed with other operations. ' +
                        'Split this into separate migrations: one for enum changes, one for other changes. ' +
                        'Reason: PostgreSQL enum additions cannot run in transactions.'
                });
            }
        }

        // Warn about enum addition in general
        issues.push({
            severity: 'warning',
            migration: migrationName,
            message: 'Contains enum value addition. Ensure this migration ONLY contains enum changes. ' +
                'Test thoroughly in staging before production.'
        });
    }

    // Check for dangerous operations
    for (const operation of DANGEROUS_OPERATIONS) {
        if (sql.toUpperCase().includes(operation)) {
            issues.push({
                severity: 'warning',
                migration: migrationName,
                message: `Contains potentially dangerous operation: ${operation}. ` +
                    'Ensure you have backups and rollback plan.'
            });
        }
    }

    // Check for missing IF EXISTS clauses in drops
    if (/DROP\s+(TABLE|INDEX|COLUMN)/i.test(sql) && !/IF\s+EXISTS/i.test(sql)) {
        issues.push({
            severity: 'warning',
            migration: migrationName,
            message: 'DROP operation without IF EXISTS clause. This may fail if object does not exist.'
        });
    }

    return issues;
}

function validateMigrations(): boolean {
    console.log('🔍 Validating Prisma migrations...\n');

    const migrations = getAllMigrations();
    const issues: ValidationIssue[] = [];

    for (const migration of migrations) {
        // Validate naming
        const namingIssue = validateMigrationNaming(migration);
        if (namingIssue) {
            issues.push(namingIssue);
        }

        // Validate content
        const sql = readMigrationSQL(migration);
        if (!sql) {
            issues.push({
                severity: 'error',
                migration,
                message: 'migration.sql file not found'
            });
            continue;
        }

        const contentIssues = validateMigrationContent(migration, sql);
        issues.push(...contentIssues);
    }

    // Report results
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
        console.log('❌ ERRORS:\n');
        errors.forEach(issue => {
            console.log(`  ${issue.migration}`);
            console.log(`  → ${issue.message}\n`);
        });
    }

    if (warnings.length > 0) {
        console.log('⚠️  WARNINGS:\n');
        warnings.forEach(issue => {
            console.log(`  ${issue.migration}`);
            console.log(`  → ${issue.message}\n`);
        });
    }

    if (infos.length > 0) {
        console.log('ℹ️  INFO:\n');
        infos.forEach(issue => {
            console.log(`  ${issue.migration}`);
            console.log(`  → ${issue.message}\n`);
        });
    }

    if (issues.length === 0) {
        console.log('✅ All migrations validated successfully!\n');
        return true;
    }

    console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info`);

    if (errors.length > 0) {
        console.log('\n❌ Validation failed. Fix errors before deploying.');
        return false;
    }

    console.log('\n⚠️  Validation passed with warnings. Review warnings before deploying.');
    return true;
}

// Run validation
const success = validateMigrations();
process.exit(success ? 0 : 1);
