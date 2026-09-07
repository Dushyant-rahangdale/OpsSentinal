---
name: opsknight-email-designer
description: Expert runbook for designing, modifying, and testing responsive OpsKnight email templates.
---

# OpsKnight Email Design Runbook

This skill provides step-by-step instructions for creating, updating, and previewing OpsKnight email templates.

## Architecture & Components
All templates are built using primitives from `src/lib/email-components.ts`:
- `EmailContainer(content, styles)`: Wraps content in a fluid responsive container with MSO tags and big-screen media queries (up to 1180px).
- `EmailHeader(title, subtitle, styles)`: Renders the gradient header with the authentic transparent OpsKnight logo and brand name hyperlinked to `https://opsknight.com/`.
- `StatusBadge(status, type)`: Rounded pill with glowing status dot.
- `InfoCard(items, styles)`: Tabular metrics display with alternating background rows.
- `EmailButton(text, url, styles)`: Primary CTA button with gradient background and subtle shadow.
- `EmailFooter(unsubscribeUrl, settingsUrl, brandUrl)`: Minimalist footer with `https://opsknight.com/` links.

## Testing & Previewing
1. **Unit Tests**:
   Verify templates with Vitest:
   ```bash
   npx vitest run tests/lib/email-templates.test.ts tests/lib/status-page-email-templates.test.ts
   ```

2. **Visual Verification**:
   Render HTML using Playwright or export to a local HTML file to inspect rendering across mobile (375px), tablet (768px), desktop (1024px), and 27-inch (1440px) viewports.
