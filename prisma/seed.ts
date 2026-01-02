import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// Configuration
const TOTAL_INCIDENTS = 1000
const INCIDENT_HISTORY_DAYS = 730 // 2 Years
const TEAMS_COUNT = 6
const USERS_PER_TEAM = 5
const SERVICES_PER_TEAM = 4

// =============================================================================
// DATA GENERATORS
// =============================================================================

const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
const domains = ['example.com', 'test.com', 'demo.org']

const teamNames = [
    'Platform Engineering',
    'Core Infrastructure',
    'Payment Gateway',
    'Frontend Experience',
    'Data Science',
    'Customer Success',
    'Security Operations',
    'Mobile Development'
]

const serviceTypes = [
    { name: 'API Gateway', tier: 'Gold' },
    { name: 'Auth Service', tier: 'Gold' },
    { name: 'Payment Processor', tier: 'Gold' },
    { name: 'Email Worker', tier: 'Silver' },
    { name: 'Search Indexer', tier: 'Silver' },
    { name: 'Analytics Pipeline', tier: 'Silver' },
    { name: 'User Profile DB', tier: 'Gold' },
    { name: 'Frontend CDN', tier: 'Gold' },
    { name: 'Backoffice UI', tier: 'Bronze' },
    { name: 'Inventory System', tier: 'Silver' },
    { name: 'Recommendation Engine', tier: 'Silver' },
    { name: 'Notification Service', tier: 'Gold' }
]

const incidentScenarios = [
    { title: 'High Latency', desc: 'Response times exceeding 500ms SLA' },
    { title: 'Database Connection Timeout', desc: 'Connection pool exhausted, refusing new connections' },
    { title: '5xx Error Spike', desc: 'Elevated rate of 500/502 errors detected by load balancer' },
    { title: 'Memory Leak', desc: 'Container memory usage > 90% causing OOM kills' },
    { title: 'Certificate Expiration', desc: 'SSL certificate expiring in less than 24h' },
    { title: 'Disk Space Low', desc: 'Root partition at 95% capacity' },
    { title: 'Queue Backlog', desc: 'Message processing lag > 5 minutes' },
    { title: 'Third-party API Down', desc: 'Payment provider API returning 503' },
    { title: 'Frontend Crash', desc: 'JS error rate spike in production' },
    { title: 'Login Failure', desc: 'Users unable to authenticate via OAuth' }
]

// =============================================================================
// HELPERS
// =============================================================================

function randomInt(max: number) {
    return Math.floor(Math.random() * max)
}

function randomPick<T>(items: T[]): T {
    return items[randomInt(items.length)]
}

function daysAgo(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d
}

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60000)
}

function hoursFrom(date: Date, hours: number) {
    return new Date(date.getTime() + hours * 3600000)
}

function clampToNow(date: Date) {
    const now = new Date()
    if (date > now) return new Date(now.getTime() - 1000)
    return date
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('🌱 Starting ULTIMATE seed...')

    // 1. CLEANUP
    console.log('🗑️ Cleaning database...')
    await prisma.$transaction([
        prisma.incidentEvent.deleteMany(),
        prisma.incidentNote.deleteMany(),
        prisma.alert.deleteMany(),
        prisma.incidentTag.deleteMany(),
        prisma.postmortem.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.incidentWatcher.deleteMany(),
        prisma.incident.deleteMany(),
        prisma.onCallShift.deleteMany(),
        prisma.statusPageService.deleteMany(),
        prisma.statusPage.deleteMany(),
        prisma.integration.deleteMany(),
        prisma.service.deleteMany(),
        prisma.onCallLayerUser.deleteMany(),
        prisma.onCallLayer.deleteMany(),
        prisma.onCallSchedule.deleteMany(),
        prisma.escalationRule.deleteMany(),
        prisma.escalationPolicy.deleteMany(),
        prisma.teamMember.deleteMany(),
        prisma.team.deleteMany(),
        prisma.apiKey.deleteMany(),
        prisma.session.deleteMany(),
        prisma.account.deleteMany(),
        prisma.userDevice.deleteMany(),
        prisma.user.deleteMany()
    ])
    console.log('   ✓ Database cleared')

    const passwordHash = await bcrypt.hash('Password123!', 10)

    // 2. CREATE USERS & TEAMS
    console.log('👥 Creating Organization Structure...')
    const allUsers = []
    const allTeams = []

    for (let i = 0; i < TEAMS_COUNT; i++) {
        // Create Team
        const team = await prisma.team.create({
            data: {
                name: teamNames[i] || `Team ${i + 1}`,
                description: `Responsible for ${teamNames[i] || `Component ${i}`} services`
            }
        })
        allTeams.push(team)

        // Create Users for Team
        const teamUsers = []
        for (let j = 0; j < USERS_PER_TEAM; j++) {
            const firstName = randomPick(firstNames)
            const lastName = randomPick(lastNames)
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(99)}@${randomPick(domains)}`

            const user = await prisma.user.create({
                data: {
                    name: `${firstName} ${lastName}`,
                    email,
                    role: 'RESPONDER', // Mostly responders
                    status: 'ACTIVE',
                    passwordHash
                }
            })
            allUsers.push(user)
            teamUsers.push(user)

            // Add to Team
            await prisma.teamMember.create({
                data: {
                    teamId: team.id,
                    userId: user.id,
                    role: j === 0 ? 'OWNER' : 'MEMBER'
                }
            })
        }
    }

    // Create Admin
    const admin = await prisma.user.create({
        data: {
            name: 'System Admin',
            email: 'admin@example.com',
            role: 'ADMIN',
            status: 'ACTIVE',
            passwordHash
        }
    })
    console.log(`   ✓ Created ${allTeams.length} teams and ${allUsers.length + 1} users`)

    // 3. CREATE SCHEDULES & POLICIES
    console.log('📅 Creating Schedules & Policies...')
    const policies = []

    for (const team of allTeams) {
        // Get team members
        const members = await prisma.teamMember.findMany({
            where: { teamId: team.id },
            include: { user: true }
        })
        const userIds = members.map(m => m.user.id)

        // On-Call Schedule
        const schedule = await prisma.onCallSchedule.create({
            data: {
                name: `${team.name} On-Call`,
                timeZone: 'UTC',
                layers: {
                    create: [{
                        name: 'Primary Rotation',
                        start: daysAgo(365), // Started a year ago
                        rotationLengthHours: 24,
                        users: {
                            create: userIds.map((uid, idx) => ({ userId: uid, position: idx }))
                        }
                    }]
                }
            }
        })

        // Generate Shifts (Past 30d + Future 30d)
        for (let d = -30; d < 30; d++) {
            const start = daysAgo(-d) // -d to go forward? No, daysAgo(-30) is 30 days in future.
            // daysAgo(30) is 30 days ago. daysAgo(-30) is 30 days future.
            // Loop d from -30 (future) to 30 (past). logic: daysAgo(d).
            // Let's stick to daysAgo(i) where i is 30 down to -30
            // start = daysAgo(d)
        }

        // Let's do simple loop for shifts: 60 days starting 30 days ago
        const shiftStartBase = daysAgo(30)
        for (let i = 0; i < 60; i++) {
            const start = addMinutes(shiftStartBase, i * 24 * 60)
            const end = addMinutes(start, 24 * 60)
            const userId = userIds[i % userIds.length]
            await prisma.onCallShift.create({
                data: { scheduleId: schedule.id, userId, start, end }
            })
        }

        // Escalation Policy
        const policy = await prisma.escalationPolicy.create({
            data: {
                name: `${team.name} Policy`,
                steps: {
                    create: [
                        { stepOrder: 0, delayMinutes: 0, targetType: 'SCHEDULE', targetScheduleId: schedule.id },
                        { stepOrder: 1, delayMinutes: 15, targetType: 'USER', targetUserId: userIds[0] }, // Team lead
                    ]
                }
            }
        })
        policies.push({ teamId: team.id, policyId: policy.id })
    }
    console.log('   ✓ Schedules & Policies ready')

    // 4. CREATE SERVICES
    console.log('🔧 Creating Services...')
    const allServices = []

    for (const team of allTeams) {
        const policy = policies.find(p => p.teamId === team.id)!

        for (let k = 0; k < SERVICES_PER_TEAM; k++) {
            const template = randomPick(serviceTypes)
            const name = `${team.name.split(' ')[0]} ${template.name} ${k + 1}`

            const service = await prisma.service.create({
                data: {
                    name,
                    description: `Managed by ${team.name}`,
                    status: 'OPERATIONAL',
                    slaTier: template.tier,
                    teamId: team.id,
                    escalationPolicyId: policy.policyId,
                    targetAckMinutes: template.tier === 'Gold' ? 15 : 60,
                    targetResolveMinutes: template.tier === 'Gold' ? 120 : 480
                }
            })
            allServices.push(service)
        }
    }
    console.log(`   ✓ ${allServices.length} Services active`)

    // 5. INCIDENTS GENERATION
    console.log(`🔥 Generating ${TOTAL_INCIDENTS} Incidents (2 Years History)...`)

    let incidentCount = 0
    const now = new Date()

    for (let i = 0; i < TOTAL_INCIDENTS; i++) {
        const service = randomPick(allServices)
        const scenario = randomPick(incidentScenarios)

        // Date Distribution: 50% recent (last 30d), 50% old (31d - 730d)
        const isRecent = Math.random() < 0.5
        const daysBack = isRecent
            ? randomInt(30)
            : randomInt(INCIDENT_HISTORY_DAYS - 30) + 30

        // Creation time
        const createdAt = hoursFrom(daysAgo(daysBack), randomInt(24))
        if (createdAt > now) createdAt.setTime(now.getTime() - 3600000)

        // Lifecycle
        let status: 'RESOLVED' | 'ACKNOWLEDGED' | 'OPEN' = 'RESOLVED'
        let urgency: 'HIGH' | 'LOW' = Math.random() < 0.3 ? 'HIGH' : 'LOW'

        // If very recent, might be OPEN
        if (daysBack < 1 && Math.random() < 0.2) status = 'OPEN'
        else if (daysBack < 2 && Math.random() < 0.3) status = 'ACKNOWLEDGED'

        const incident = await prisma.incident.create({
            data: {
                title: `${service.name}: ${scenario.title}`,
                description: scenario.desc,
                status,
                urgency,
                priority: urgency === 'HIGH' ? 'P1' : 'P3',
                serviceId: service.id,
                teamId: service.teamId, // Assign to team
                dedupKey: `seed-mega-${i}`,
                createdAt,
                updatedAt: createdAt // will update below
            }
        })

        // Events
        await prisma.incidentEvent.create({
            data: { incidentId: incident.id, message: 'Triggered via API', createdAt }
        })

        let lastEventTime = createdAt
        let acknowledgedAt: Date | null = null
        let resolvedAt: Date | null = null

        // Ack Logic
        if (status !== 'OPEN') {
            // Ack time: 1 min to 4 hours
            const delay = urgency === 'HIGH' ? randomInt(15) + 1 : randomInt(240) + 5
            acknowledgedAt = addMinutes(createdAt, delay)
            acknowledgedAt = clampToNow(acknowledgedAt)

            await prisma.incidentEvent.create({
                data: { incidentId: incident.id, message: 'Acknowledged', createdAt: acknowledgedAt }
            })
            lastEventTime = acknowledgedAt

            await prisma.incident.update({
                where: { id: incident.id },
                data: { acknowledgedAt, assigneeId: allUsers[0].id } // Assign to random admin as placeholder or team member
            })
        }

        // Resolve Logic
        if (status === 'RESOLVED') {
            // Resolve time: 10 mins to 2 days
            const delay = urgency === 'HIGH' ? randomInt(120) + 10 : randomInt(2880) + 60
            resolvedAt = addMinutes(lastEventTime, delay)
            resolvedAt = clampToNow(resolvedAt)

            await prisma.incidentEvent.create({
                data: { incidentId: incident.id, message: 'Resolved', createdAt: resolvedAt }
            })

            // Postmortem for severe ones
            if (urgency === 'HIGH' && Math.random() < 0.2) {
                await prisma.postmortem.create({
                    data: {
                        incidentId: incident.id,
                        title: `Post-Mortem: ${scenario.title}`,
                        rootCause: 'Capacity planning failure',
                        status: 'PUBLISHED',
                        createdById: allUsers[0].id
                    }
                })
            }

            await prisma.incident.update({
                where: { id: incident.id },
                data: { resolvedAt, updatedAt: resolvedAt }
            })
        }

        incidentCount++
        if (i % 100 === 0) process.stdout.write('.')
    }
    console.log(`\n   ✓ ${incidentCount} incidents generated`)

    // 6. STATUS PAGE
    console.log('🌐 Configuring Status Page...')
    const sp = await prisma.statusPage.create({
        data: {
            name: 'System Status',
            subdomain: 'status',
            enabled: true,
        }
    })

    // Add services
    for (const [idx, svc] of allServices.slice(0, 10).entries()) {
        await prisma.statusPageService.create({
            data: {
                statusPageId: sp.id,
                serviceId: svc.id,
                order: idx,
                showOnPage: true
            }
        })
    }
    console.log('   ✓ Status Page live')

    console.log('\n✅ ULTIMATE SEED COMPLETE')
    console.log(`Admin Login: admin@example.com / Password123!`)
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
