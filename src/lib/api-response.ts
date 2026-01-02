import { NextResponse } from 'next/server';
import { getUserFriendlyError } from './user-friendly-errors';

export function jsonError(message: string, status: number, meta?: Record<string, unknown>) {
  // Convert technical errors to user-friendly messages
  const friendlyMessage = getUserFriendlyError(message);
  return NextResponse.json({ error: friendlyMessage, meta }, { status });
}

export function jsonOk<T>(payload: T, status: number = 200, headers?: HeadersInit) {
  return NextResponse.json(payload, { status, headers });
}
