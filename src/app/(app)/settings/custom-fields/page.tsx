import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import CustomFieldsConfig from '@/components/CustomFieldsConfig';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';

export default async function CustomFieldsPage() {
    const session = await getServerSession(await getAuthOptions());
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
        <SettingsPage
            currentPageId="custom-fields"
            backHref="/settings"
            title="Custom Fields"
            description="Define custom fields to capture additional incident information."
        >
            <SettingsSectionCard
                title="Custom field builder"
                description="Create, edit, and manage structured incident metadata."
            >
                <CustomFieldsConfig customFields={customFields} />
            </SettingsSectionCard>
        </SettingsPage>
    );
}








