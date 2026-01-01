import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

const demoPassword = 'Password123!'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function daysAgo(days: number) {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date
}

function hoursFrom(date: Date, hours: number) {
    const next = new Date(date)
    next.setHours(next.getHours() + hours)
    return next
}

function randomPick<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)]
}

function randomInt(max: number) {
    return Math.floor(Math.random() * max)
}

function makeIntegrationKey() {
    return randomBytes(16).toString('hex')
}

// =============================================================================
// SEED DATA DEFINITIONS
// =============================================================================

const teamSeeds = [
    { name: 'Platform Engineering', description: 'Core infrastructure and reliability' },
    { name: 'Payments Operations', description: 'Revenue-critical services and payments' },
    { name: 'Customer Support', description: 'Customer communication and incident comms' },
    { name: 'Frontend Team', description: 'Web and mobile applications' },
    { name: 'Data Engineering', description: 'Data pipelines and analytics infrastructure' }
]

const userSeeds = [
    { email: 'alice@example.com', name: 'Alice DevOps', role: 'ADMIN' as const },
    { email: 'bob@example.com', name: 'Bob SRE', role: 'RESPONDER' as const },
    { email: 'carol@example.com', name: 'Carol Ops', role: 'RESPONDER' as const },
    { email: 'dave@example.com', name: 'Dave Analyst', role: 'USER' as const },
    { email: 'erin@example.com', name: 'Erin Oncall', role: 'RESPONDER' as const },
    { email: 'frank@example.com', name: 'Frank Support', role: 'RESPONDER' as const },
    { email: 'gina@example.com', name: 'Gina Reliability', role: 'RESPONDER' as const },
    { email: 'hank@example.com', name: 'Hank Systems', role: 'RESPONDER' as const },
    { email: 'ivy@example.com', name: 'Ivy Platform', role: 'RESPONDER' as const },
    { email: 'jake@example.com', name: 'Jake Engineer', role: 'RESPONDER' as const }
]

const incidentTitles = [
    'Database connection pool exhausted',
    'API latency spike detected',
    'Memory leak in service worker',
    'Failed payment processing',
    'Certificate expiration warning',
    'Disk space critical on production',
    'Cache miss rate increased',
    'Third-party API timeout',
    'High error rate in microservice',
    'Queue processing backlog'
]

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
    if (process.env.NODE_ENV === 'production') {
        console.log('🛑 Production environment detected. Skipping seed.')
        return
    }

    console.log('🌱 Starting database seed...\n')
    const passwordHash = await bcrypt.hash(demoPassword, 10)

    // =========================================================================
    // 1. CREATE TEAMS
    // =========================================================================
    console.log('📁 Creating teams...')
    const teams = await Promise.all(
        teamSeeds.map(async (seed) => {
            const existing = await prisma.team.findFirst({ where: { name: seed.name } })
            if (existing) return existing
            return prisma.team.create({ data: seed })
        })
    )
    const teamByName = new Map(teams.map((t) => [t.name, t]))
    console.log(`   ✓ ${teams.length} teams ready`)

    // =========================================================================
    // 2. CREATE USERS
    // =========================================================================
    console.log('👤 Creating users...')
    const users = await Promise.all(
        userSeeds.map((user) =>
            prisma.user.upsert({
                where: { email: user.email },
                update: {},
                create: {
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: 'ACTIVE',
                    passwordHash
                }
            })
        )
    )
    const userByEmail = new Map(users.map((u) => [u.email, u]))
    console.log(`   ✓ ${users.length} users ready`)

    // =========================================================================
    // 3. CREATE TEAM MEMBERSHIPS
    // =========================================================================
    console.log('👥 Creating team memberships...')
    await prisma.teamMember.createMany({
        data: [
            { teamId: teamByName.get('Platform Engineering')!.id, userId: userByEmail.get('alice@example.com')!.id, role: 'OWNER' },
            { teamId: teamByName.get('Platform Engineering')!.id, userId: userByEmail.get('bob@example.com')!.id, role: 'ADMIN' },
            { teamId: teamByName.get('Platform Engineering')!.id, userId: userByEmail.get('carol@example.com')!.id, role: 'MEMBER' },
            { teamId: teamByName.get('Payments Operations')!.id, userId: userByEmail.get('erin@example.com')!.id, role: 'OWNER' },
            { teamId: teamByName.get('Payments Operations')!.id, userId: userByEmail.get('bob@example.com')!.id, role: 'MEMBER' },
            { teamId: teamByName.get('Customer Support')!.id, userId: userByEmail.get('frank@example.com')!.id, role: 'OWNER' },
            { teamId: teamByName.get('Customer Support')!.id, userId: userByEmail.get('dave@example.com')!.id, role: 'MEMBER' },
            { teamId: teamByName.get('Frontend Team')!.id, userId: userByEmail.get('gina@example.com')!.id, role: 'OWNER' },
            { teamId: teamByName.get('Frontend Team')!.id, userId: userByEmail.get('hank@example.com')!.id, role: 'MEMBER' },
            { teamId: teamByName.get('Data Engineering')!.id, userId: userByEmail.get('ivy@example.com')!.id, role: 'OWNER' },
            { teamId: teamByName.get('Data Engineering')!.id, userId: userByEmail.get('jake@example.com')!.id, role: 'MEMBER' }
        ],
        skipDuplicates: true
    })
    console.log('   ✓ Team memberships created')

    // =========================================================================
    // 4. CREATE ESCALATION POLICIES
    // =========================================================================
    console.log('🛡️ Creating escalation policies...')
    const policies = await Promise.all([
        createPolicy('Platform Primary', 'Primary escalation for platform services', [
            userByEmail.get('alice@example.com')!.id,
            userByEmail.get('bob@example.com')!.id,
            userByEmail.get('carol@example.com')!.id
        ]),
        createPolicy('Payments Critical', 'Critical payments escalation path', [
            userByEmail.get('erin@example.com')!.id,
            userByEmail.get('bob@example.com')!.id,
            userByEmail.get('alice@example.com')!.id
        ]),
        createPolicy('Customer Support', 'Customer facing incident escalation', [
            userByEmail.get('frank@example.com')!.id,
            userByEmail.get('dave@example.com')!.id
        ]),
        createPolicy('Frontend Alerts', 'Frontend and UI escalation', [
            userByEmail.get('gina@example.com')!.id,
            userByEmail.get('hank@example.com')!.id
        ]),
        createPolicy('Data Pipeline', 'Data engineering escalation', [
            userByEmail.get('ivy@example.com')!.id,
            userByEmail.get('jake@example.com')!.id
        ])
    ])
    const policyByName = new Map(policies.map((p) => [p.name, p]))
    console.log(`   ✓ ${policies.length} escalation policies created`)

    // =========================================================================
    // 5. CREATE SERVICES
    // =========================================================================
    console.log('🔧 Creating services...')
    const services = await Promise.all([
        createService('API Gateway', 'Main public API entry point', 'OPERATIONAL',
            teamByName.get('Platform Engineering')!.id, policyByName.get('Platform Primary')!.id),
        createService('Auth Service', 'Authentication and sessions', 'OPERATIONAL',
            teamByName.get('Platform Engineering')!.id, policyByName.get('Platform Primary')!.id),
        createService('Payments API', 'Payment processing core', 'DEGRADED',
            teamByName.get('Payments Operations')!.id, policyByName.get('Payments Critical')!.id),
        createService('Checkout UI', 'Customer checkout experience', 'OPERATIONAL',
            teamByName.get('Payments Operations')!.id, policyByName.get('Payments Critical')!.id),
        createService('Customer Portal', 'Customer-facing web application', 'OPERATIONAL',
            teamByName.get('Frontend Team')!.id, policyByName.get('Frontend Alerts')!.id),
        createService('Data Pipeline', 'ETL and data processing', 'OPERATIONAL',
            teamByName.get('Data Engineering')!.id, policyByName.get('Data Pipeline')!.id),
        createService('Status Page', 'Public status page', 'OPERATIONAL',
            teamByName.get('Customer Support')!.id, policyByName.get('Customer Support')!.id)
    ])
    console.log(`   ✓ ${services.length} services created`)

    // =========================================================================
    // 6. CREATE ON-CALL SCHEDULES
    // =========================================================================
    console.log('📅 Creating on-call schedules...')
    const schedules = await Promise.all([
        createSchedule('Platform Primary', [
            userByEmail.get('alice@example.com')!.id,
            userByEmail.get('bob@example.com')!.id,
            userByEmail.get('carol@example.com')!.id
        ]),
        createSchedule('Payments Oncall', [
            userByEmail.get('erin@example.com')!.id,
            userByEmail.get('bob@example.com')!.id
        ]),
        createSchedule('Customer Support 24/7', [
            userByEmail.get('frank@example.com')!.id,
            userByEmail.get('dave@example.com')!.id
        ]),
        createSchedule('Frontend Oncall', [
            userByEmail.get('gina@example.com')!.id,
            userByEmail.get('hank@example.com')!.id
        ]),
        createSchedule('Data Engineering', [
            userByEmail.get('ivy@example.com')!.id,
            userByEmail.get('jake@example.com')!.id
        ])
    ])
    console.log(`   ✓ ${schedules.length} on-call schedules created`)

    // =========================================================================
    // 7. CREATE ON-CALL SHIFTS
    // =========================================================================
    console.log('⏰ Creating on-call shifts...')
    for (const schedule of schedules) {
        await createShifts(schedule.id, schedule.layers[0]?.users.map((u: { userId: string }) => u.userId) || [])
    }
    console.log('   ✓ On-call shifts created for 30 days')

    // =========================================================================
    // 8. CREATE INCIDENTS
    // =========================================================================
    console.log('🔥 Creating sample incidents...')
    const responderIds = users.filter((u) => u.role !== 'USER').map((u) => u.id)
    const serviceList = await prisma.service.findMany()

    let incidentCount = 0
    for (let i = 0; i < 50; i++) {
        const service = randomPick(serviceList)
        const status = randomPick(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED'] as const)
        const createdAt = hoursFrom(daysAgo(randomInt(30)), randomInt(24))

        const incident = await prisma.incident.create({
            data: {
                title: `${service.name}: ${randomPick(incidentTitles)}`,
                description: `Auto-generated incident for testing`,
                status,
                urgency: randomPick(['HIGH', 'LOW'] as const),
                priority: randomPick(['P1', 'P2', 'P3', 'P4', null]),
                dedupKey: `seed-${Date.now()}-${i}`,
                serviceId: service.id,
                assigneeId: status !== 'OPEN' ? randomPick(responderIds) : null,
                acknowledgedAt: status === 'ACKNOWLEDGED' || status === 'RESOLVED' ? hoursFrom(createdAt, 1) : null,
                resolvedAt: status === 'RESOLVED' ? hoursFrom(createdAt, randomInt(24) + 2) : null,
                createdAt,
                updatedAt: createdAt
            }
        })
        incidentCount++

        // Add activity event
        await prisma.incidentEvent.create({
            data: {
                incidentId: incident.id,
                message: 'Incident triggered via monitoring alert',
                createdAt
            }
        })
    }
    console.log(`   ✓ ${incidentCount} incidents created`)

    // =========================================================================
    // 9. CREATE STATUS PAGE CONFIGURATION
    // =========================================================================
    console.log('🌐 Creating status page configuration...')

    // Create status page
    const statusPage = await prisma.statusPage.create({
        data: {
            name: 'OpsSentinel Status',
            subdomain: 'status',
            enabled: true,
            showServices: true,
            showIncidents: true,
            showMetrics: true,
            privacyMode: 'PUBLIC',
            branding: {
                logoUrl: '/logo.png',
                primaryColor: '#2563eb'
            }
        }
    })

    // Add Services to Status Page
    const serviceListForStatus = await prisma.service.findMany()
    await Promise.all(
        serviceListForStatus.map((service, index) =>
            prisma.statusPageService.create({
                data: {
                    statusPageId: statusPage.id,
                    serviceId: service.id,
                    order: index,
                    showOnPage: true,
                    displayName: service.name
                }
            })
        )
    )
    console.log(`   ✓ Status page created with ${serviceListForStatus.length} services`)

    // =========================================================================
    // COMPLETE
    // =========================================================================
    console.log('\n✅ Seed complete!')
    console.log(`   Demo password: ${demoPassword}`)
    console.log(`   Login with: alice@example.com / ${demoPassword}\n`)
}

// =============================================================================
// HELPER CREATION FUNCTIONS
// =============================================================================

async function createPolicy(name: string, description: string, userIds: string[]) {
    const existing = await prisma.escalationPolicy.findFirst({ where: { name } })
    if (existing) return existing

    const policy = await prisma.escalationPolicy.create({
        data: { name, description }
    })

    // Create escalation steps
    await prisma.escalationRule.createMany({
        data: userIds.map((userId, index) => ({
            policyId: policy.id,
            targetType: 'USER',
            targetUserId: userId,
            stepOrder: index,
            delayMinutes: index * 15
        }))
    })

    return policy
}

async function createService(
    name: string,
    description: string,
    status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE',
    teamId: string,
    escalationPolicyId: string
) {
    const existing = await prisma.service.findFirst({ where: { name } })
    if (existing) return existing

    const service = await prisma.service.create({
        data: {
            name,
            description,
            status,
            teamId,
            escalationPolicyId,
            targetAckMinutes: 15,
            targetResolveMinutes: 120
        }
    })

    // Create integration for the service
    await prisma.integration.create({
        data: {
            name: `${name} Events`,
            key: makeIntegrationKey(),
            serviceId: service.id
        }
    })

    return service
}

async function createSchedule(name: string, userIds: string[]) {
    const existing = await prisma.onCallSchedule.findFirst({
        where: { name },
        include: { layers: { include: { users: true } } }
    })
    if (existing) return existing

    return prisma.onCallSchedule.create({
        data: {
            name,
            timeZone: 'UTC',
            layers: {
                create: [{
                    name: `${name} Layer 1`,
                    start: daysAgo(30),
                    rotationLengthHours: 24,
                    users: {
                        create: userIds.map((userId, index) => ({
                            userId,
                            position: index
                        }))
                    }
                }]
            }
        },
        include: { layers: { include: { users: true } } }
    })
}

async function createShifts(scheduleId: string, userIds: string[]) {
    if (!userIds.length) return

    const existingCount = await prisma.onCallShift.count({
        where: { scheduleId, start: { gte: daysAgo(30) } }
    })
    if (existingCount > 0) return

    for (let i = 0; i < 30; i++) {
        const start = daysAgo(30 - i)
        const end = hoursFrom(start, 24)
        const userId = userIds[i % userIds.length]

        await prisma.onCallShift.create({
            data: { scheduleId, userId, start, end }
        })
    }
}

// =============================================================================
// RUN
// =============================================================================

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (error) => {
        console.error('Seed error:', error)
        await prisma.$disconnect()
        process.exit(1)
    })
