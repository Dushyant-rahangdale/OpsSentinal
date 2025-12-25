'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateNotificationPreferences } from '@/app/(app)/settings/actions';

type State = {
    error?: string | null;
    success?: boolean;
};

type Props = {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    whatsappEnabled: boolean;
    phoneNumber: string | null;
};

function SubmitButton({ pending }: { pending: boolean }) {
    return (
        <button
            type="submit"
            disabled={pending}
            className="glass-button primary"
            style={{ width: '100%', marginTop: '1rem' }}
        >
            {pending ? 'Saving...' : 'Save Notification Preferences'}
        </button>
    );
}

export default function NotificationPreferencesForm({
    emailEnabled,
    smsEnabled,
    pushEnabled,
    whatsappEnabled,
    phoneNumber
}: Props) {
    const [state, formAction, isPending] = useActionState<State, FormData>(updateNotificationPreferences, { error: null, success: false });
    const [smsChecked, setSmsChecked] = useState(smsEnabled);
    const [whatsappChecked, setWhatsappChecked] = useState(whatsappEnabled);
    const router = useRouter();

    // Refresh the page after successful update
    useEffect(() => {
        if (state?.success) {
            const timer = setTimeout(() => {
                router.refresh();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [state?.success, router]);

    return (
        <form action={formAction} className="settings-panel-modern">
            <div className="settings-panel-header">
                <h3>Notification Channels</h3>
                <p>Choose how you want to receive incident notifications</p>
            </div>

            <div className="notification-options">
                <label className="notification-option">
                    <div className="notification-option-header">
                        <input 
                            type="checkbox" 
                            name="emailNotificationsEnabled" 
                            defaultChecked={emailEnabled}
                            key={emailEnabled ? 'email-checked' : 'email-unchecked'}
                        />
                        <div className="notification-option-content">
                            <div className="notification-option-title">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M2.5 5L10 10L17.5 5M2.5 5H17.5V15H2.5V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <strong>Email Notifications</strong>
                            </div>
                            <p>Receive incident notifications via email. Requires SMTP/Resend configuration.</p>
                        </div>
                    </div>
                </label>

                <label className="notification-option">
                    <div className="notification-option-header">
                        <input 
                            type="checkbox" 
                            name="smsNotificationsEnabled" 
                            defaultChecked={smsEnabled}
                            onChange={(e) => setSmsChecked(e.target.checked)}
                            key={smsEnabled ? 'sms-checked' : 'sms-unchecked'}
                        />
                        <div className="notification-option-content">
                            <div className="notification-option-title">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M2.5 4.5H17.5C18.3284 4.5 19 5.17157 19 6V14C19 14.8284 18.3284 15.5 17.5 15.5H2.5C1.67157 15.5 1 14.8284 1 14V6C1 5.17157 1.67157 4.5 2.5 4.5Z" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M1 7L10 12L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <strong>SMS Notifications</strong>
                            </div>
                            <p>Receive incident notifications via SMS. Requires phone number and Twilio configuration.</p>
                        </div>
                    </div>
                    {smsChecked && (
                        <div className="notification-option-field">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                placeholder="+1234567890"
                                defaultValue={phoneNumber || ''}
                                required={smsChecked}
                            />
                            <p className="settings-field-hint">
                                Enter phone number in E.164 format (e.g., +1234567890)
                            </p>
                        </div>
                    )}
                </label>

                <label className="notification-option">
                    <div className="notification-option-header">
                        <input 
                            type="checkbox" 
                            name="pushNotificationsEnabled" 
                            defaultChecked={pushEnabled}
                            key={pushEnabled ? 'push-checked' : 'push-unchecked'}
                        />
                        <div className="notification-option-content">
                            <div className="notification-option-title">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 2C6.68629 2 4 4.68629 4 8V12C4 13.1046 4.89543 14 6 14H7M10 2C13.3137 2 16 4.68629 16 8V12C16 13.1046 15.1046 14 14 14H13M10 2V1M10 1H8M10 1H12M13 14V16C13 17.6569 11.6569 19 10 19C8.34315 19 7 17.6569 7 16V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <strong>Push Notifications</strong>
                            </div>
                            <p>Receive incident notifications via push notifications. Requires Firebase/OneSignal configuration.</p>
                        </div>
                    </div>
                </label>

                <label className="notification-option">
                    <div className="notification-option-header">
                        <input 
                            type="checkbox" 
                            name="whatsappNotificationsEnabled" 
                            defaultChecked={whatsappEnabled}
                            onChange={(e) => setWhatsappChecked(e.target.checked)}
                            key={whatsappEnabled ? 'whatsapp-checked' : 'whatsapp-unchecked'}
                        />
                        <div className="notification-option-content">
                            <div className="notification-option-title">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 2C5.58172 2 2 5.58172 2 10C2 12.2091 2.89543 14.2091 4.34315 15.6569L2 18L4.34315 15.6569C5.79086 17.1046 7.79086 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M7 7H13M7 10H13M7 13H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <strong>WhatsApp Notifications</strong>
                            </div>
                            <p>Receive incident notifications via WhatsApp. Requires phone number and Twilio WhatsApp Business API configuration.</p>
                        </div>
                    </div>
                    {whatsappChecked && (
                        <div className="notification-option-field">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumberWhatsApp"
                                placeholder="+1234567890"
                                defaultValue={phoneNumber || ''}
                                required={whatsappChecked}
                            />
                            <p className="settings-field-hint">
                                Enter phone number in E.164 format (e.g., +1234567890). Same number can be used for SMS and WhatsApp.
                            </p>
                        </div>
                    )}
                </label>
            </div>

            <SubmitButton pending={isPending} />
            
            {state?.error && (
                <div className="settings-error-banner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#dc2626"/>
                        <path d="M10 6V10M10 14H10.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>{state.error}</span>
                </div>
            )}
            
            {state?.success && (
                <div className="settings-success-banner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#22c55e"/>
                        <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Notification preferences saved successfully</span>
                </div>
            )}
        </form>
    );
}
