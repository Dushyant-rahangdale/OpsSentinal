import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import CustomFieldsConfig from '@/components/CustomFieldsConfig';

export default async function CustomFieldsPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    try {
        await assertAdmin();
    } catch {
        redirect('/');
    }

    const customFields = await prisma.customField.findMany({
        orderBy: { order: 'asc' },
        include: {
            _count: {
                select: {
                    values: true,
                },
            },
        },
    });

    return (
        <div style={{ padding: 'var(--spacing-6)' }}>
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-2)' }}>
                    Custom Fields
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-base)' }}>
                    Define custom fields to capture additional incident information
                </p>
            </div>

            <CustomFieldsConfig customFields={customFields} />
        </div>
    );
}







