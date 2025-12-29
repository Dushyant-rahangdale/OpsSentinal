import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function resetDatabase() {
    try {
        const tablenames = await prisma.$queryRaw<
            Array<{ tablename: string }>
        >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '_prisma_migrations';`;

        if (tablenames.length === 0) {
            console.log('No tables found to reset.');
            return;
        }

        const tables = tablenames
            .map(({ tablename }) => `"${tablename}"`)
            .join(', ');

        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error: any) {
        console.error('Error resetting database:', error.message);
        // If it's a connection error, let us know
        if (error.message.includes('Canbt reach database')) {
            console.error('Check if your database at DATABASE_URL is running.');
        }
    }
}

export async function createTestUser(overrides = {}) {
    return await prisma.user.create({
        data: {
            email: `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
            name: 'Test User',
            passwordHash: 'hashed-pw', // Use passwordHash to match schema
            role: 'USER',
            status: 'ACTIVE',
            ...overrides,
        },
    });
}

export async function createTestTeam(name: string, overrides = {}) {
    return await prisma.team.create({
        data: {
            name,
            ...overrides,
        },
    });
}

export async function createTestService(name: string, teamId: string, overrides = {}) {
    return await prisma.service.create({
        data: {
            name,
            teamId,
            ...overrides,
        },
    });
}

export async function createTestIncident(title: string, serviceId: string, overrides = {}) {
    return await prisma.incident.create({
        data: {
            title,
            serviceId,
            status: 'OPEN',
            urgency: 'HIGH',
            ...overrides,
        },
    });
}

export { prisma as testPrisma };
