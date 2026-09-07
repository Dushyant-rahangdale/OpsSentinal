---
trigger: always_on
description: Design, layout, and rendering rules for transactional email templates
---

# Transactional Email Standards

1. **Email Architecture**:
   - Built with table-based HTML layouts wrapped in MSO conditional comments for universal compatibility across Outlook, Gmail, Apple Mail, and mobile clients.
   - Use `EmailContainer`, `EmailHeader`, `EmailContent`, `StatusBadge`, `InfoCard`, `EmailButton`, and `EmailFooter` from `@/lib/email-components`.

2. **Subtle & Clutter-Free**:
   - Do NOT include promotional popups, GitHub star buttons, or loud advertising banners in transactional alert emails.
   - Keep footers clean: `"This is an automated notification from OpsKnight Incident Management • OpsKnight • Open-Source Incident Response"` hyperlinked to `https://opsknight.com/`.

3. **Status-Driven Dynamic Styling**:
   - Header gradient, status badge, card accent border, and CTA button must dynamically align with the incident urgency or lifecycle state (Crimson, Amber, Emerald, Cobalt, Royal Violet).

4. **Structured Incident Description**:
   - Always enclose incident descriptions inside a dedicated `#f8fafc` card with a 4px status accent left border, formatted with `white-space: pre-wrap; word-break: break-word;` so multi-paragraph telemetry, bullet points, and code traces render with pristine clarity.
