/**
 * Next.js Instrumentation
 * This file runs when the server starts, allowing us to initialize services like cron
 * and perform automatic migration recovery for containerized deployments
 */

import { logger } from './src/lib/logger';

export async function register() {
    // Only run on the server
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        logger.info('OpsSentinal server initialization', { component: 'instrumentation' });

        // Auto-recover failed migrations (for fault-tolerant deployments)
        try {
            const { autoRecoverMigrations } = await import('./scripts/auto-recover-migrations');
            const migrationSuccess = await autoRecoverMigrations();

            if (!migrationSuccess) {
                logger.warn('Migration recovery completed with warnings', { component: 'instrumentation' });
            }
        } catch (error) {
            logger.error('Migration auto-recovery failed', { component: 'instrumentation', error });
            // Continue startup - application may still function with existing schema
        }

        // Start cron scheduler
        const { startCronScheduler } = await import('./src/lib/cron-scheduler');
        startCronScheduler();

        logger.info('OpsSentinal server initialized successfully', { component: 'instrumentation' });
    }
}
