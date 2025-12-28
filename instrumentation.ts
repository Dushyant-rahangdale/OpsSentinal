/**
 * Next.js Instrumentation
 * This file runs when the server starts, allowing us to initialize services like cron
 */

export async function register() {
    // Only run on the server
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startCronScheduler } = await import('./src/lib/cron-scheduler');
        startCronScheduler();
    }
}
