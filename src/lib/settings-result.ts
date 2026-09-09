/** Shared optimistic-concurrency contract for settings server actions. */
export const SETTINGS_CHANGED_MESSAGE =
  'Settings changed elsewhere. Reload the latest settings before saving again.';

export type SettingsActionErrorCode =
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'PROVIDER_ERROR'
  | 'SETTINGS_CHANGED'
  | 'INTERNAL_ERROR';

export type SettingsActionState = {
  success: boolean;
  error: string | null;
  code?: SettingsActionErrorCode;
  updatedAt: string | null;
};

export class SettingsChangedMutationError extends Error {
  readonly code = 'SETTINGS_CHANGED';
  constructor() {
    super(SETTINGS_CHANGED_MESSAGE);
    this.name = 'SettingsChangedMutationError';
  }
}

export function isSettingsChangedError(error: unknown): boolean {
  return (
    error instanceof SettingsChangedMutationError ||
    (error instanceof Error && 'code' in error && error.code === 'SETTINGS_CHANGED')
  );
}

export function parseSettingsRevision(value: string | null | undefined): Date | null {
  if (!value) return null;
  const revision = new Date(value);
  if (Number.isNaN(revision.getTime())) {
    throw new Error('Invalid settings revision. Reload the page and try again.');
  }
  return revision;
}

export function settingsChangedState(updatedAt: string | null = null): SettingsActionState {
  return {
    success: false,
    code: 'SETTINGS_CHANGED',
    error: SETTINGS_CHANGED_MESSAGE,
    updatedAt,
  };
}
