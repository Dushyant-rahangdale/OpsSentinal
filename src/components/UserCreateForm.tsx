'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

type FormState = {
    error?: string | null;
    success?: boolean;
    inviteUrl?: string | null;
};

type Props = {
    action: (prevState: FormState, formData: FormData) => Promise<FormState>;
    className?: string;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="glass-button primary full-width" disabled={pending}>
            {pending ? 'Adding...' : 'Add User'}
        </button>
    );
}

export default function UserCreateForm({ action, className = '' }: Props) {
    const [state, formAction] = useActionState(action, { error: null, success: false });
    const formRef = useRef<HTMLFormElement | null>(null);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);

    useEffect(() => {
        if (state?.success) {
            formRef.current?.reset();
            setEmail('');
            setEmailError(null);
        }
    }, [state?.success]);

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        const error = getEmailValidationError(value);
        setEmailError(error);
    };

    return (
        <form ref={formRef} action={formAction} className={`invite-form ${className}`.trim()}>
            <div className="form-field">
                <label className="form-label">Name *</label>
                <input
                    name="name"
                    required
                    placeholder="Full name"
                    className="form-input"
                    maxLength={200}
                />
            </div>
            <div className="form-field">
                <label className="form-label">Email *</label>
                <input
                    name="email"
                    required
                    type="email"
                    placeholder="name@company.com"
                    className="form-input"
                    maxLength={320}
                    value={email}
                    onChange={handleEmailChange}
                />
                {emailError && (
                    <div className="form-error" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        {emailError}
                    </div>
                )}
            </div>
            <div className="form-field">
                <label className="form-label">Role</label>
                <select name="role" defaultValue="RESPONDER" className="form-select">
                    <option value="ADMIN">Admin</option>
                    <option value="RESPONDER">Responder</option>
                    <option value="USER">User</option>
                </select>
            </div>
            <SubmitButton />
            {state?.error && (
                <div className="form-error">
                    {getUserFriendlyError(state.error)}
                </div>
            )}
            {state?.inviteUrl && (
                <div className="invite-link-feedback">
                    <div className="invite-link-label">
                        Share this invite link with the new user:
                    </div>
                    <div className="invite-link-copy">
                        <input
                            value={state.inviteUrl}
                            readOnly
                            className="form-input invite-link-input"
                        />
                        <button
                            type="button"
                            className="glass-button"
                            onClick={() => navigator.clipboard.writeText(state.inviteUrl || '')}
                        >
                            Copy link
                        </button>
                    </div>
                </div>
            )}
        </form>
    );
}
