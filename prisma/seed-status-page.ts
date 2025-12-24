import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Check if status page already exists
    const existingStatusPage = await prisma.statusPage.findFirst({
        where: { enabled: true },
    });

    if (!existingStatusPage) {
        console.log('Creating default status page...');
        await prisma.statusPage.create({
            data: {
                name: 'Status Page',
                enabled: true,
                showServices: true,
                showIncidents: true,
                showMetrics: true,
            },
        });
        console.log('✅ Default status page created');
    } else {
        console.log('✅ Status page already exists');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });







