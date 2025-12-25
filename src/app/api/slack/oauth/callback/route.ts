/**
 * Slack OAuth Callback
 * Handles the OAuth callback from Slack and stores the integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
    try {
        // Require authentication
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.redirect('/login?callbackUrl=' + encodeURIComponent(request.url));
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
            logger.error('[Slack] OAuth error', { error });
            return NextResponse.redirect(`/services?error=slack_oauth_error&message=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            return NextResponse.redirect('/services?error=slack_oauth_missing_params');
        }

        // Verify state
        const storedState = request.cookies.get('slack_oauth_state')?.value;
        if (!storedState || storedState !== state) {
            logger.warn('[Slack] Invalid OAuth state', { state, storedState });
            return NextResponse.redirect('/services?error=slack_oauth_invalid_state');
        }

        // Get service ID if provided
        const serviceId = request.cookies.get('slack_oauth_service_id')?.value || null;

        // Get OAuth config from database (fallback to env for backward compatibility)
        const config = await prisma.slackOAuthConfig.findFirst({
            where: { enabled: true },
            orderBy: { updatedAt: 'desc' }
        });

        const SLACK_CLIENT_ID = config?.clientId || process.env.SLACK_CLIENT_ID;
        const SLACK_CLIENT_SECRET = config ? decrypt(config.clientSecret) : process.env.SLACK_CLIENT_SECRET;
        const redirectUri = config?.redirectUri || process.env.SLACK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/slack/oauth/callback`;

        if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
            return NextResponse.redirect(`/services?error=slack_oauth_not_configured&message=${encodeURIComponent('Slack OAuth not configured. Please configure in Settings > Slack OAuth Configuration.')}`);
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.ok) {
            logger.error('[Slack] Token exchange failed', { error: tokenData.error });
            return NextResponse.redirect(`/services?error=slack_oauth_token_error&message=${encodeURIComponent(tokenData.error || 'Unknown error')}`);
        }

        // Get workspace info
        const teamInfo = tokenData.team;
        const botToken = tokenData.access_token;
        const scopes = (tokenData.scope || '').split(',');

        // Encrypt tokens before storing
        const encryptedBotToken = encrypt(botToken);
        const encryptedSigningSecret = tokenData.authed_user?.id ? encrypt(tokenData.authed_user.id) : null;

        // Store or update integration
        const integrationData = {
            workspaceId: teamInfo.id,
            workspaceName: teamInfo.name,
            botToken: encryptedBotToken,
            signingSecret: encryptedSigningSecret,
            installedBy: user.id,
            scopes,
            enabled: true
        };

        let integration;
        if (serviceId) {
            // Service-specific integration
            // Check if service already has an integration
            const service = await prisma.service.findUnique({
                where: { id: serviceId },
                include: { slackIntegration: true }
            });

            if (service?.slackIntegration) {
                // Update existing integration
                integration = await prisma.slackIntegration.update({
                    where: { id: service.slackIntegration.id },
                    data: integrationData
                });
            } else {
                // Check if workspace integration already exists
                const existing = await prisma.slackIntegration.findUnique({
                    where: { workspaceId: teamInfo.id }
                });

                if (existing) {
                    // Use existing integration
                    integration = existing;
                    // Update service to reference it
                    await prisma.service.update({
                        where: { id: serviceId },
                        data: { slackIntegrationId: integration.id }
                    });
                } else {
                    // Create new integration
                    integration = await prisma.slackIntegration.create({
                        data: integrationData
                    });
                    // Update service to reference it
                    await prisma.service.update({
                        where: { id: serviceId },
                        data: { slackIntegrationId: integration.id }
                    });
                }
            }
        } else {
            // Global integration (first workspace becomes default)
            const existing = await prisma.slackIntegration.findUnique({
                where: { workspaceId: teamInfo.id }
            });

            if (existing) {
                integration = await prisma.slackIntegration.update({
                    where: { id: existing.id },
                    data: integrationData
                });
            } else {
                integration = await prisma.slackIntegration.create({
                    data: integrationData
                });
            }
        }

        // Clear cookies
        const response = NextResponse.redirect(
            serviceId 
                ? `/services/${serviceId}/settings?slack_connected=true`
                : '/services?slack_connected=true'
        );
        response.cookies.delete('slack_oauth_state');
        response.cookies.delete('slack_oauth_service_id');

        logger.info('[Slack] Integration installed', {
            integrationId: integration.id,
            workspaceId: teamInfo.id,
            serviceId
        });

        return response;
    } catch (error: any) {
        logger.error('[Slack] OAuth callback error', {
            error: error.message,
            stack: error.stack
        });
        return NextResponse.redirect('/services?error=slack_oauth_error');
    }
}

