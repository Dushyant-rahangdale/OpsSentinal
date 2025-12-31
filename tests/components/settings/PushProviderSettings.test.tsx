import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PushProviderSettings from '@/components/settings/PushProviderSettings';

// Mock Button and FormField
vi.mock('@/components/ui/Button', () => ({
  default: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/FormField', () => ({
  default: ({
    type,
    label,
    value,
    onChange,
    checked,
    placeholder,
    options,
  }: {
    type: string;
    label: string;
    value?: string;
    onChange?: ((v: boolean) => void) | ((e: { target: { value: string } }) => void);
    checked?: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
  }) => {
    if (type === 'switch') {
      return (
        <label data-testid={`switch-${label.replace(/\s+/g, '-').toLowerCase()}`}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => (onChange as (v: boolean) => void)?.(e.target.checked)}
          />
          {label}
        </label>
      );
    }
    if (type === 'select') {
      return (
        <select
          data-testid={`select-${label.replace(/\s+/g, '-').toLowerCase()}`}
          value={value}
          onChange={e => (onChange as (e: { target: { value: string } }) => void)?.(e)}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    if (type === 'textarea') {
      return (
        <div>
          <label>{label}</label>
          <textarea
            data-testid={`textarea-${label.replace(/\s+/g, '-').toLowerCase()}`}
            value={value}
            placeholder={placeholder}
            onChange={e => (onChange as (e: { target: { value: string } }) => void)?.(e)}
          />
        </div>
      );
    }
    return (
      <div>
        <label>{label}</label>
        <input
          data-testid={`input-${label.replace(/\s+/g, '-').toLowerCase()}`}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => (onChange as (e: { target: { value: string } }) => void)?.(e)}
        />
      </div>
    );
  },
}));

describe('PushProviderSettings', () => {
  const defaultProps = {
    enabled: false,
    provider: 'firebase' as const,
    firebaseProjectId: '',
    firebasePrivateKey: '',
    firebaseClientEmail: '',
    onesignalAppId: '',
    onesignalRestApiKey: '',
    onEnabledChange: vi.fn(),
    onProviderChange: vi.fn(),
    onFirebaseProjectIdChange: vi.fn(),
    onFirebasePrivateKeyChange: vi.fn(),
    onFirebaseClientEmailChange: vi.fn(),
    onOnesignalAppIdChange: vi.fn(),
    onOnesignalRestApiKeyChange: vi.fn(),
    onTestPush: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Push section header', () => {
    render(<PushProviderSettings {...defaultProps} />);
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(
      screen.getByText('Configure push notification provider for mobile devices.')
    ).toBeInTheDocument();
  });

  it('renders enable switch', () => {
    render(<PushProviderSettings {...defaultProps} />);
    expect(screen.getByTestId('switch-enable-push-notifications')).toBeInTheDocument();
  });

  it('shows provider select when enabled', () => {
    render(<PushProviderSettings {...defaultProps} enabled={true} />);
    expect(screen.getByTestId('select-push-provider')).toBeInTheDocument();
  });

  it('shows Firebase fields when Firebase is selected', () => {
    render(<PushProviderSettings {...defaultProps} enabled={true} provider="firebase" />);
    expect(screen.getByTestId('input-firebase-project-id')).toBeInTheDocument();
    expect(screen.getByTestId('input-firebase-client-email')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-firebase-private-key')).toBeInTheDocument();
  });

  it('shows OneSignal fields when OneSignal is selected', () => {
    render(<PushProviderSettings {...defaultProps} enabled={true} provider="onesignal" />);
    expect(screen.getByTestId('input-onesignal-app-id')).toBeInTheDocument();
    expect(screen.getByTestId('input-onesignal-rest-api-key')).toBeInTheDocument();
  });

  it('shows Test Push button when enabled', () => {
    render(<PushProviderSettings {...defaultProps} enabled={true} />);
    expect(screen.getByText('Test Push')).toBeInTheDocument();
  });

  it('disables Test Push button when isPending', () => {
    render(<PushProviderSettings {...defaultProps} enabled={true} isPending={true} />);
    expect(screen.getByText('Test Push')).toBeDisabled();
  });

  it('does not show configuration when disabled', () => {
    render(<PushProviderSettings {...defaultProps} enabled={false} />);
    expect(screen.queryByTestId('select-push-provider')).not.toBeInTheDocument();
  });
});
