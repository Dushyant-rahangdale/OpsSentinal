
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking Status Page Configuration...");

        // 1. Get enabled Status Pages
        const statusPages = await prisma.statusPage.findMany({
            where: { enabled: true },
            include: {
                services: {
                    include: { service: true }
                }
            }
        });

        console.log(`Found ${statusPages.length} enabled Status Pages.`);

        statusPages.forEach(page => {
            console.log(`\nPage: "${page.name}" (ID: ${page.id})`);
            console.log(`Linked Services: ${page.services.length}`);
            page.services.forEach(link => {
                console.log(` - Service: ${link.service.name} (Show: ${link.showOnPage})`);
            });
            if (page.services.length === 0) {
                console.log(" [!] WARNING: This status page has NO services linked. It will not send notifications.");
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
