// Script to update status page requireAuth setting
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Updating status page requireAuth setting...');

    const result = await prisma.statusPage.updateMany({
        where: {
            enabled: true
        },
        data: {
            requireAuth: false
        }
    });

    console.log(`Updated ${result.count} status page(s)`);

    // Verify the update
    const statusPages = await prisma.statusPage.findMany({
        select: {
            id: true,
            name: true,
            enabled: true,
            requireAuth: true
        }
    });

    console.log('\nCurrent status pages:');
    console.table(statusPages);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
