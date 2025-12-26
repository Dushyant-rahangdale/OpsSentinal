
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://opssure:opssure_secure_password_change_me@localhost:5432/opssure_db'
        }
    }
});

async function main() {
    try {
        console.log('Connecting to database...');
        const count = await prisma.user.count();
        console.log(`Successfully connected. User count: ${count}`);
    } catch (e) {
        console.error('Connection failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

