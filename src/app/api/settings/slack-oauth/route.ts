import { NextRequest, NextResponse } from 'next/server';
import { saveSlackOAuthConfig } from '@/app/(app)/settings/slack-oauth/actions';
import { assertAdmin } from '@/lib/rbac';

export async function POST(request: NextRequest) {
    try {
        await assertAdmin();
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.' },
            { status: 403 }
        );
    }

    try {
        const formData = await request.formData();
        const result = await saveSlackOAuthConfig(formData);
        
        if (result?.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to save configuration' },
            { status: 500 }
        );
    }
}

