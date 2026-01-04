/**
 * DB Smoke Test (CI)
 *
 * Runs after `prisma migrate deploy` to catch schema/runtime drift early.
 * Keeps scope intentionally small and fast.
 *
 * Usage:
 *   node scripts/ci-db-smoke.cjs
 *
 * Requires:
 *   DATABASE_URL env var set
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  requireEnv('DATABASE_URL');

  const prisma = new PrismaClient();
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `ci-smoke-${runId}@example.com`.toLowerCase();

  try {
    // 1) Basic connectivity
    await prisma.$queryRaw`SELECT 1`;

    // 2) Create a user (minimal required fields)
    const user = await prisma.user.create({
      data: {
        name: 'CI Smoke',
        email,
        status: 'ACTIVE',
        role: 'USER',
      },
      select: { id: true, email: true },
    });

    // 3) Create + read a UserToken (hashed token only)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.userToken.create({
      data: {
        identifier: user.email,
        type: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        metadata: { smoke: true },
      },
    });

    const tokenRow = await prisma.userToken.findFirst({
      where: {
        tokenHash,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
      select: { tokenHash: true, identifier: true },
    });

    if (!tokenRow) {
      throw new Error('Smoke test failed: userToken row not readable after create');
    }

    // 4) Mark token used (one-time semantics)
    await prisma.userToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    // 5) Cleanup
    await prisma.userToken.deleteMany({ where: { identifier: user.email } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log('[ci-db-smoke] OK');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[ci-db-smoke] FAILED');
  console.error(err);
  process.exit(1);
});

