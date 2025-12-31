/**
 * Next.js Instrumentation
 * This file runs when the server starts, allowing us to initialize services like cron
 * and perform automatic migration recovery for containerized deployments
 */

export async function register() {
    // Only run on the server
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log('🚀 OpsSentinal server initialization...\n');

        // Auto-recover failed migrations (for fault-tolerant deployments)
        try {
            const { autoRecoverMigrations } = await import('./scripts/auto-recover-migrations');
            const migrationSuccess = await autoRecoverMigrations();

            if (!migrationSuccess) {
                console.warn('⚠️  Migration recovery completed with warnings. Check logs above.');
            }
        } catch (error) {
            console.error('❌ Migration auto-recovery failed:', error);
            // Continue startup - application may still function with existing schema
        }

        // Start cron scheduler
        const { startCronScheduler } = await import('./src/lib/cron-scheduler');
        startCronScheduler();

        console.log('\n✅ OpsSentinal server initialized successfully!\n');
    }
}
