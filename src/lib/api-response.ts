import { NextResponse } from 'next/server';

export function jsonError(message: string, status: number, meta?: Record<string, unknown>) {
    return NextResponse.json({ error: message, meta }, { status });
}

export function jsonOk<T>(payload: T, status: number = 200) {
    return NextResponse.json(payload, { status });
}

