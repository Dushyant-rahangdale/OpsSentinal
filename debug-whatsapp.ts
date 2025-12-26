import prisma from './src/lib/prisma';

async function debugWhatsApp() {
    const twilioProvider = await prisma.notificationProvider.findUnique({
        where: { provider: 'twilio' }
    });

    console.log('Twilio Provider:', JSON.stringify(twilioProvider, null, 2));

    if (twilioProvider) {
        console.log('\nConfig:', twilioProvider.config);
    }
}

debugWhatsApp()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
