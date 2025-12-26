
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://opssentinal:opssentinal_secure_password_change_me@localhost:5432/opssentinal_db'
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


