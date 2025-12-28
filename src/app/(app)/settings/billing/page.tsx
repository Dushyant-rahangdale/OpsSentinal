import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import SettingsEmptyState from '@/components/settings/SettingsEmptyState';

export default function BillingSettingsPage() {
    return (
        <SettingsPage
            currentPageId="billing"
            backHref="/settings"
            title="Billing & Plan"
            description="Review your subscription, invoices, and usage."
        >
            <SettingsSectionCard
                title="Plan details"
                description="Your current plan and usage metrics."
            >
                <SettingsEmptyState
                    title="Billing data not connected"
                    description="Connect a billing provider to view invoices and usage."
                />
            </SettingsSectionCard>

            <SettingsSectionCard
                title="Payment methods"
                description="Manage payment methods and billing contacts."
            >
                <SettingsEmptyState
                    title="No payment methods"
                    description="Add a payment method when billing is enabled."
                />
            </SettingsSectionCard>
        </SettingsPage>
    );
}

