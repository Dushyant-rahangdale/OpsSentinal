import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { issueBootstrapAuthorization } from '../src/lib/bootstrap-security';

const prisma = new PrismaClient();

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.error('OpsKnight is already initialized; no bootstrap capability was issued.');
    process.exitCode = 1;
    return;
  }

  const issued = await issueBootstrapAuthorization();
  // This is an explicit, foreground operator command. The capability is printed
  // only to the invoking terminal; application/server logging never receives it.
  process.stdout.write('\nOpsKnight first-admin setup capability\n');
  process.stdout.write('Treat this value like a password. It will not be shown again.\n\n');
  process.stdout.write(`${issued.code}\n\n`);
  process.stdout.write(`Expires: ${issued.expiresAt.toISOString()}\n`);
}

main()
  .catch(error => {
    console.error(
      'Unable to issue bootstrap capability:',
      error instanceof Error ? error.message : String(error)
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
