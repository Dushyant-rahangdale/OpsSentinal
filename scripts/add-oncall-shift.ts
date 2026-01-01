import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createShift() {
    console.log('--- Creating On-Call Shift ---');

    // 1. Find User
    const users = await prisma.user.findMany({
        where: { email: { contains: 'dushyant', mode: 'insensitive' } }
    });

    if (users.length === 0) {
        console.error('❌ User not found');
        return;
    }
    const user = users[0];
    console.log(`✅ User: ${user.email} (${user.id})`);

    // 2. Find Schedule
    const schedule = await prisma.onCallSchedule.findFirst();
    if (!schedule) {
        console.error('❌ No schedule found');
        return;
    }
    console.log(`✅ Schedule: ${schedule.name}`);

    // 3. Clear existing shifts for this user (cleanup)
    const deleted = await prisma.onCallShift.deleteMany({
        where: { userId: user.id }
    });
    console.log(`🧹 Cleared ${deleted.count} existing shifts for user.`);

    // 4. Create NEW Shift
    const now = new Date();
    // Shift starts 1 hour ago and ends 24 hours from now to be SAFE
    const start = new Date(now.getTime() - 60 * 60 * 1000);
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const shift = await prisma.onCallShift.create({
        data: {
            scheduleId: schedule.id,
            userId: user.id,
            start: start,
            end: end
        }
    });

    console.log(`🎉 Created Active Shift:`);
    console.log(`   ID: ${shift.id}`);
    console.log(`   Time: ${shift.start.toISOString()} -> ${shift.end.toISOString()}`);
}

createShift()
    .then(() => prisma.$disconnect())
    .catch(console.error);
