import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import ApiKeysPanel from '@/components/settings/ApiKeysPanel';

export default async function ApiKeysSettingsPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const user = email
        ? await prisma.user.findUnique({
            where: { email },
            select: { id: true }
        })
        : null;
    const keys = user
        ? await prisma.apiKey.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        })
        : [];

    return (
        <div className="settings-section">
            <header className="settings-section-header">
                <h2>API keys</h2>
                <p>Generate keys for automation and integrations.</p>
            </header>

            <ApiKeysPanel
                keys={keys.map((key) => ({
                    id: key.id,
                    name: key.name,
                    prefix: key.prefix,
                    scopes: key.scopes,
                    createdAt: key.createdAt.toLocaleDateString(),
                    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toLocaleDateString() : null,
                    revokedAt: key.revokedAt ? key.revokedAt.toLocaleDateString() : null
                }))}
            />
        </div>
    );
}
