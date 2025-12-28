import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';

// GET /api/settings/app-url
export async function GET() {
    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: 'default' },
            select: { appUrl: true }
        });

        return NextResponse.json({
            appUrl: settings?.appUrl || null,
            fallback: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch app URL' },
            { status: 500 }
        );
    }
}

// POST /api/settings/app-url
export async function POST(request: NextRequest) {
    try {
        await assertAdmin();
    } catch (error) {
        return NextResponse.json(
            { error: 'Unauthorized. Admin access required.' },
            { status: 403 }
        );
    }

    try {
        const { appUrl } = await request.json();

        // Validate URL format if provided
        if (appUrl && appUrl.trim() !== '') {
            try {
                const url = new URL(appUrl);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    return NextResponse.json(
                        { error: 'URL must use http:// or https:// protocol' },
                        { status: 400 }
                    );
                }
            } catch (e) {
                return NextResponse.json(
                    { error: 'Invalid URL format' },
                    { status: 400 }
                );
            }
        }

        // Upsert the settings
        await prisma.systemSettings.upsert({
            where: { id: 'default' },
            create: {
                id: 'default',
                appUrl: appUrl || null
            },
            update: {
                appUrl: appUrl || null
            }
        });

        revalidatePath('/settings/system');

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update app URL' },
            { status: 500 }
        );
    }
}
