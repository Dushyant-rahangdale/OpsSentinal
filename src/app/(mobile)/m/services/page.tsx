import prisma from '@/lib/prisma';
import MobileServicesClient from '@/components/mobile/MobileServicesClient';

export const dynamic = 'force-dynamic';

export default async function MobileServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';

  const services = await prisma.service.findMany({
    where: query
      ? {
          name: { contains: query, mode: 'insensitive' },
        }
      : undefined,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          incidents: {
            where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } },
          },
        },
      },
    },
  });

  return <MobileServicesClient initialServices={services} query={query} />;
}
