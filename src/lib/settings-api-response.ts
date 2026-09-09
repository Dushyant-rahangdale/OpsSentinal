import { NextResponse } from 'next/server';
import { createApiResponseContext } from '@/lib/api-response';
import { SETTINGS_CHANGED_MESSAGE } from '@/lib/settings-result';

/** Standard 409 response for optimistic settings-write conflicts. */
export function jsonSettingsChanged() {
  const context = createApiResponseContext();
  return NextResponse.json(
    {
      success: false,
      dataState: 'unavailable',
      error: SETTINGS_CHANGED_MESSAGE,
      code: 'SETTINGS_CHANGED',
      action: 'Reload the latest settings and reapply your changes.',
      retryable: false,
      requestId: context.requestId,
      timestamp: context.timestamp,
    },
    { status: 409, headers: { 'x-request-id': context.requestId } }
  );
}
