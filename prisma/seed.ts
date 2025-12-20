import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Create a Team
    const team = await prisma.team.create({
        data: {
            name: 'Platform Engineering',
            description: 'Responsible for core infrastructure',
        },
    })

    // Create Users
    const passwordHash = await bcrypt.hash('Password123!', 10)

    const alice = await prisma.user.upsert({
        where: { email: 'alice@example.com' },
        update: {},
        create: {
            email: 'alice@example.com',
            name: 'Alice DevOps',
            role: 'ADMIN',
            status: 'ACTIVE',
            passwordHash,
            teamMemberships: {
                create: {
                    teamId: team.id,
                    role: 'OWNER',
                },
            },
        },
    })

    const bob = await prisma.user.upsert({
        where: { email: 'bob@example.com' },
        update: {},
        create: {
            email: 'bob@example.com',
            name: 'Bob SRE',
            role: 'RESPONDER',
            status: 'ACTIVE',
            passwordHash,
            teamMemberships: {
                create: {
                    teamId: team.id,
                    role: 'MEMBER',
                },
            },
        },
    })

    // Create Service
    const service = await prisma.service.create({
        data: {
            name: 'API Gateway',
            description: 'Main public API entry point',
            status: 'OPERATIONAL',
            teamId: team.id,
        },
    })

    console.log({ team, alice, bob, service })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
