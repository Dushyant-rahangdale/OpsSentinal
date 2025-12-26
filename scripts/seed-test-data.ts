import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding test data...');

    // Get the first user to assign as team lead
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('❌ No users found. Please create a user first.');
        return;
    }

    console.log(`✅ Using user: ${user.name || user.email}`);

    // Create teams
    const platformTeam = await prisma.team.upsert({
        where: { id: 'platform-team' },
        update: {},
        create: {
            id: 'platform-team',
            name: 'Platform Team',
            description: 'Core infrastructure and platform services',
            teamLeadId: user.id,
        },
    });

    const apiTeam = await prisma.team.upsert({
        where: { id: 'api-team' },
        update: {},
        create: {
            id: 'api-team',
            name: 'API Team',
            description: 'Backend API services',
            teamLeadId: user.id,
        },
    });

    const frontendTeam = await prisma.team.upsert({
        where: { id: 'frontend-team' },
        update: {},
        create: {
            id: 'frontend-team',
            name: 'Frontend Team',
            description: 'User-facing web applications',
            teamLeadId: user.id,
        },
    });

    console.log('✅ Created teams');

    // Create services
    const webApp = await prisma.service.upsert({
        where: { id: 'web-app' },
        update: {},
        create: {
            id: 'web-app',
            name: 'Web Application',
            description: 'Main customer-facing web application',
            status: 'OPERATIONAL',
            teamId: frontendTeam.id,
        },
    });

    const apiGateway = await prisma.service.upsert({
        where: { id: 'api-gateway' },
        update: {},
        create: {
            id: 'api-gateway',
            name: 'API Gateway',
            description: 'Primary API gateway for all services',
            status: 'OPERATIONAL',
            teamId: apiTeam.id,
        },
    });

    const database = await prisma.service.upsert({
        where: { id: 'database' },
        update: {},
        create: {
            id: 'database',
            name: 'Database Cluster',
            description: 'PostgreSQL database cluster',
            status: 'OPERATIONAL',
            teamId: platformTeam.id,
        },
    });

    const cdn = await prisma.service.upsert({
        where: { id: 'cdn' },
        update: {},
        create: {
            id: 'cdn',
            name: 'CDN',
            description: 'Content delivery network',
            status: 'OPERATIONAL',
            teamId: platformTeam.id,
        },
    });

    const authService = await prisma.service.upsert({
        where: { id: 'auth-service' },
        update: {},
        create: {
            id: 'auth-service',
            name: 'Authentication Service',
            description: 'User authentication and authorization',
            status: 'OPERATIONAL',
            teamId: apiTeam.id,
        },
    });

    console.log('✅ Created services');

    // Create historical incidents (for uptime metrics)
    const now = new Date();
    const incidents = [];

    // Web App - 2 incidents in last 30 days (99.5% uptime)
    incidents.push(
        await prisma.incident.create({
            data: {
                title: 'Slow page load times',
                description: 'Users reporting slow page loads',
                status: 'RESOLVED',
                urgency: 'LOW',
                serviceId: webApp.id,
                createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                resolvedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
                events: {
                    create: [
                        { message: 'Incident detected' },
                        { message: 'Investigating CDN issues' },
                        { message: 'CDN cache cleared, performance restored' },
                    ],
                },
            },
        })
    );

    incidents.push(
        await prisma.incident.create({
            data: {
                title: 'Login page unresponsive',
                description: 'Login page not loading for some users',
                status: 'RESOLVED',
                urgency: 'HIGH',
                serviceId: webApp.id,
                createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                resolvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 minutes later
                events: {
                    create: [
                        { message: 'Incident detected' },
                        { message: 'Auth service connection issues identified' },
                        { message: 'Connection pool increased, resolved' },
                    ],
                },
            },
        })
    );

    // API Gateway - 1 incident in last 90 days (99.95% uptime)
    incidents.push(
        await prisma.incident.create({
            data: {
                title: 'API rate limiting errors',
                description: '503 errors on API endpoints',
                status: 'RESOLVED',
                urgency: 'HIGH',
                serviceId: apiGateway.id,
                createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
                resolvedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 minutes later
                events: {
                    create: [
                        { message: 'Incident detected' },
                        { message: 'High traffic spike identified' },
                        { message: 'Rate limits adjusted, scaled horizontally' },
                    ],
                },
            },
        })
    );

    // Database - Multiple incidents (98.5% uptime - should show as yellow/red)
    incidents.push(
        await prisma.incident.create({
            data: {
                title: 'Database connection pool exhausted',
                description: 'Connection pool maxed out, queries timing out',
                status: 'RESOLVED',
                urgency: 'HIGH',
                serviceId: database.id,
                createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
                resolvedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
                events: {
                    create: [
                        { message: 'Incident detected' },
                        { message: 'Connection pool exhausted' },
                        { message: 'Increased pool size and restarted' },
                    ],
                },
            },
        })
    );

    incidents.push(
        await prisma.incident.create({
            data: {
                title: 'Slow query performance',
                description: 'Database queries running significantly slower',
                status: 'RESOLVED',
                urgency: 'LOW',
                serviceId: database.id,
                createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                resolvedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
                events: {
                    create: [
                        { message: 'Incident detected' },
                        { message: 'Missing index identified' },
                        { message: 'Index created, performance restored' },
                    ],
                },
            },
        })
    );

    // CDN - Perfect uptime (100%)
    // No incidents

    // Auth Service - 1 minor incident (99.9% uptime)
    incidents.push(
        await prisma.incident.create({
            data: {
                title: 'Token refresh delays',
                description: 'JWT token refresh taking longer than expected',
                status: 'RESOLVED',
                urgency: 'LOW',
                serviceId: authService.id,
                createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
                resolvedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 hour later
                events: {
                    create: [
                        { message: 'Incident detected' },
                        { message: 'Redis cache degradation identified' },
                        { message: 'Cache cleared and optimized' },
                    ],
                },
            },
        })
    );

    console.log(`✅ Created ${incidents.length} incidents`);

    // Add services to status page
    const statusPage = await prisma.statusPage.findFirst();
    if (statusPage) {
        await prisma.statusPageService.createMany({
            data: [
                { statusPageId: statusPage.id, serviceId: webApp.id, order: 1, showOnPage: true },
                { statusPageId: statusPage.id, serviceId: apiGateway.id, order: 2, showOnPage: true },
                { statusPageId: statusPage.id, serviceId: database.id, order: 3, showOnPage: true },
                { statusPageId: statusPage.id, serviceId: cdn.id, order: 4, showOnPage: true },
                { statusPageId: statusPage.id, serviceId: authService.id, order: 5, showOnPage: true },
            ],
            skipDuplicates: true,
        });
        console.log('✅ Added services to status page');
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📊 Expected Uptime Metrics (90 days):');
    console.log('  - Web Application: ~99.5% (yellow - 2 incidents)');
    console.log('  - API Gateway: ~99.95% (green - 1 minor incident)');
    console.log('  - Database Cluster: ~98.5% (red - 2 long incidents)');
    console.log('  - CDN: 100% (green - no incidents)');
    console.log('  - Authentication Service: ~99.9% (green - 1 minor incident)');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
