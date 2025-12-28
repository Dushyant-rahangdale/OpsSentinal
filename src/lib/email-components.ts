/**
 * Reusable Email Components
 * Modern, responsive HTML components for email templates
 */

export interface EmailStyles {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headerGradient?: string;
}

/**
 * Email container with responsive layout and OpsSentinal branding
 * Fully optimized for mobile devices
 */
export function EmailContainer(content: string, styles: EmailStyles = {}): string {
    const backgroundColor = styles.backgroundColor || '#ffffff';
    const outerBackground = '#f3f4f6';

    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>OpsSentinal Notification</title>
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
        @media only screen and (max-width: 600px) {
            .mobile-padding { padding: 20px !important; }
            .mobile-text-center { text-align: center !important; }
            .mobile-full-width { width: 100% !important; max-width: 100% !important; }
            .mobile-hide { display: none !important; }
            .mobile-font-large { font-size: 24px !important; line-height: 1.3 !important; }
            .mobile-font-medium { font-size: 16px !important; }
            .mobile-font-small { font-size: 14px !important; }
            .mobile-button { width: 100% !important; display: block !important; }
            .mobile-button a { width: 100% !important; display: block !important; box-sizing: border-box !important; }
            .mobile-header-padding { padding: 32px 20px !important; }
            .mobile-logo-name { font-size: 24px !important; }
            .wrapper { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${outerBackground}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1f2937;">
    <center>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background-color: ${outerBackground};">
            <tr>
                <td align="center" style="padding: 40px 20px;" class="wrapper">
                    <!--[if mso]>
                    <table role="presentation" width="900" align="center" style="width:900px;">
                    <tr>
                    <td style="padding:0;">
                    <![endif]-->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" class="mobile-full-width" style="max-width: 900px; width: 100%; margin: 0 auto; background-color: ${backgroundColor}; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);">
                        <tr>
                            <td style="padding: 0;">
                                ${content}
                            </td>
                        </tr>
                    </table>
                    <!--[if mso]>
                    </td>
                    </tr>
                    </table>
                    <![endif]-->
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`.trim();
}

/**
 * Branded email header with OpsSentinal logo and red gradient
 * Mobile-responsive with flexible layout
 */
export function EmailHeader(title: string, subtitle?: string, styles: EmailStyles = {}): string {
    const headerGradient = styles.headerGradient || 'linear-gradient(135deg, #8b1a1a 0%, #b91c1c 40%, #c92a2a 70%, #dc2626 100%)';

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td class="mobile-header-padding" style="background: ${headerGradient}; padding: 48px 44px; text-align: left; position: relative;">
            <!-- Logo with Brand Name -->
            <div style="margin-bottom: 32px;">
                <!--[if mso]>
                <table role="presentation" align="left"><tr><td>
                <![endif]-->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin: 0;">
                    <tr>
                        <td style="padding-right: 12px; vertical-align: middle;">
                            ${getOpsGuardLogo(56)}
                        </td>
                        <td style="vertical-align: middle;">
                            <span class="mobile-logo-name" style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif; white-space: nowrap;">OpsSentinal</span>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
                <div style="clear: both;"></div>
            </div>
            
            <!-- Title -->
            <h1 class="mobile-font-large" style="margin: 0 0 ${subtitle ? '10px' : '0'} 0; color: #ffffff; font-size: 30px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.25;">
                ${title}
            </h1>
            
            ${subtitle ? `
            <!-- Subtitle -->
            <p class="mobile-font-small" style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 15px; font-weight: 500;">
                ${subtitle}
            </p>
            ` : ''}
        </td>
    </tr>
</table>`.trim();
}

/**
 * Content section with responsive padding
 */
export function EmailContent(content: string): string {
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td class="mobile-padding" style="padding: 52px 44px; background: #ffffff;">
            ${content}
        </td>
    </tr>
</table>`.trim();
}

/**
 * Status badge with icon - OpsSentinal branded
 */
export function StatusBadge(
    status: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
): string {
    const colors = {
        success: { bg: '#16a34a', text: '#ffffff', icon: getCheckIcon(16, '#ffffff'), shadow: 'rgba(22, 163, 74, 0.3)' },
        warning: { bg: '#f59e0b', text: '#ffffff', icon: getWarningIcon(16, '#ffffff'), shadow: 'rgba(245, 158, 11, 0.3)' },
        error: { bg: '#dc2626', text: '#ffffff', icon: getErrorIcon(16, '#ffffff'), shadow: 'rgba(220, 38, 38, 0.35)' },
        info: { bg: '#2563eb', text: '#ffffff', icon: getInfoIcon(16, '#ffffff'), shadow: 'rgba(37, 99, 235, 0.3)' }
    };

    const color = colors[type];

    return `
<div style="display: inline-flex; align-items: center; gap: 10px; background: ${color.bg}; color: ${color.text}; padding: 12px 24px; border-radius: 999px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; box-shadow: 0 4px 14px ${color.shadow}, 0 0 0 1px rgba(255, 255, 255, 0.1) inset;">
    <span style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff; box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);"></span>
    <span>${status}</span>
</div>`.trim();
}

/**
 * Call-to-action button with OpsSentinal red gradient
 * Optimized for mobile with large touch targets
 */
export function EmailButton(text: string, url: string, styles: EmailStyles = {}): string {
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" class="mobile-full-width mobile-spacing" style="margin: 32px auto; width: auto;">
    <tr>
        <td class="mobile-button" style="border-radius: 10px; background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); text-align: center; box-shadow: 0 8px 20px rgba(185, 28, 28, 0.3);">
            <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; line-height: 1.5; border-radius: 10px; min-width: 220px; text-align: center;">
                ${text}
            </a>
        </td>
    </tr>
</table>`.trim();
}

/**
 * Information card with label and value
 */
export function InfoCard(items: Array<{ label: string; value: string; highlight?: boolean }>): string {
    const rows = items.map(item => `
        <tr>
            <td style="padding: 12px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600; color: #6b7280; width: 140px;">
                ${item.label}
            </td>
            <td style="padding: 12px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #1f2937; ${item.highlight ? 'font-weight: 600;' : ''}">
                ${item.value}
            </td>
        </tr>
    `).join('');

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    ${rows}
</table>`.trim();
}

/**
 * Alert box for important messages with OpsSentinal colors
 */
export function AlertBox(
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
): string {
    const colors = {
        success: { bg: '#dcfce7', border: '#16a34a', title: '#14532d', text: '#15803d' },
        warning: { bg: '#fef3c7', border: '#f59e0b', title: '#92400e', text: '#b45309' },
        error: { bg: '#fee2e2', border: '#dc2626', title: '#991b1b', text: '#b91c1c' },
        info: { bg: '#dbeafe', border: '#2563eb', title: '#1e3a8a', text: '#1d4ed8' }
    };

    const color = colors[type];

    return `
<div style="background: ${color.bg}; border-left: 4px solid ${color.border}; padding: 24px; border-radius: 12px; margin: 24px 0;">
    <h3 style="margin: 0 0 12px 0; color: ${color.title}; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;">
        ${title}
    </h3>
    <p style="margin: 0; color: ${color.text}; font-size: 15px; line-height: 1.7;">
        ${message}
    </p>
</div>`.trim();
}

/**
 * Footer with OpsSentinal branding
 */
export function EmailFooter(unsubscribeUrl?: string): string {
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="padding: 36px 40px; background: #f3f4f6; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This is an automated notification from <strong style="color: #d32f2f;">OpsSentinal</strong> Incident Management.
            </p>
            ${unsubscribeUrl ? `
            <p style="margin: 12px 0 0 0; font-size: 13px;">
                <a href="${unsubscribeUrl}" style="color: #d32f2f; text-decoration: none; font-weight: 600;">Unsubscribe from these emails</a>
            </p>
            ` : ''}
        </td>
    </tr>
</table>`.trim();
}

/**
 * SVG Icons (inline for email compatibility)
 */


/**
 * Header specifically for Status Page Subscribers
 * Shows the Organization Name prominently instead of OpsSentinal
 * Maintains the premium OpsSentinal aesthetic
 */
export function SubscriberEmailHeader(pageName: string, title: string, subtitle?: string, styles: EmailStyles = {}): string {
    const headerGradient = styles.headerGradient || 'linear-gradient(135deg, #8b1a1a 0%, #b91c1c 40%, #c92a2a 70%, #dc2626 100%)';

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td class="mobile-header-padding" style="background: ${headerGradient}; padding: 48px 44px; text-align: left; position: relative;">
            <!-- OpsSentinal Logo -->
            <div style="margin-bottom: 32px;">
                <!--[if mso]>
                <table role="presentation" align="left"><tr><td>
                <![endif]-->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin: 0;">
                    <tr>
                        <td style="padding-right: 12px; vertical-align: middle;">
                            ${getOpsGuardLogo(44)}
                        </td>
                        <td style="vertical-align: middle;">
                            <span class="mobile-logo-name" style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif; white-space: nowrap;">OpsSentinal</span>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
                <div style="clear: both;"></div>
            </div>

            <!-- Organization Name (The Sender) -->
            <h1 class="mobile-font-large" style="margin: 0 0 14px 0; color: #ffffff; font-size: 30px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.25;">
                ${pageName}
            </h1>
            
            <!-- Update Type Badge -->
            <div style="margin-bottom: 24px;">
                <span style="display: inline-block; padding: 6px 14px; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 10px; color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">
                    ${title}
                </span>
            </div>

            ${subtitle ? `
            <p class="mobile-font-medium" style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 500; line-height: 1.5;">
                ${subtitle}
            </p>
            ` : ''}
        </td>
    </tr>
</table>`.trim();
}

/**
 * Footer providing "Powered by" marketing while handling Unsubscribe
 */
export function SubscriberEmailFooter(unsubscribeUrl: string, pageName: string): string {
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="padding: 36px 20px; background: #f8fafc; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                You received this email because you are subscribed to <strong>${pageName}</strong> updates.
            </p>
            
            <p style="margin: 0 0 32px 0; font-size: 13px;">
                <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from updates</a>
            </p>

            <!-- OpsSentinal Marketing -->
            <div style="opacity: 0.8;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
                    Powered by
                </p>
                <a href="https://OpsSentinal.com" target="_blank" style="text-decoration: none; display: inline-block; margin-top: 8px;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        ${getOpsGuardLogo(24)}
                        <span style="color: #1f2937; font-size: 16px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em;">OpsSentinal</span>
                    </div>
                </a>
            </div>
        </td>
    </tr>
</table>`.trim();
}

/**
 * SVG Icons (inline for email compatibility)
 */

function getOpsGuardLogo(width: number): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://OpsSentinal.com';
    return `<img src="${appUrl}/logo.png" width="${width}" height="${width}" alt="OpsSentinal" style="display: block; width: ${width}px; height: ${width}px; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />`;
}

function getCheckIcon(size: number, color: string): string {
    return `
<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="${color}"/>
</svg>`.trim();
}

function getWarningIcon(size: number, color: string): string {
    return `
<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fill="${color}"/>
</svg>`.trim();
}

function getErrorIcon(size: number, color: string): string {
    return `
<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="${color}"/>
</svg>`.trim();
}

function getInfoIcon(size: number, color: string): string {
    return `
<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fill="${color}"/>
</svg>`.trim();
}

