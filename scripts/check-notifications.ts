
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Users ---');
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- Incident Count ---');
    const incidentCount = await prisma.incident.count();
    console.log('Total Incidents:', incidentCount);

    console.log('\n--- InAppNotifications (Last 10) ---');
    const notifs = await prisma.inAppNotification.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { name: true, email: true } }
        }
    });

    console.log('Total InAppNotifications found:', notifs.length);
    console.log(JSON.stringify(notifs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
