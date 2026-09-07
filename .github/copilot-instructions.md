# GitHub Copilot & Codex Instructions for OpsKnight

OpsKnight is a modern, open-source incident management, on-call scheduling, and status page platform.

## Key Guidelines
- Follow the universal standards documented in `AGENTS.md`.
- **Framework**: Next.js 15 App Router (`src/app/`). Default to Server Components. Use Server Actions (`'use server'`) with Zod schema validation and RBAC checks (`getUserPermissions()`).
- **Database**: Prisma ORM (`prisma/schema.prisma`). Ensure transactions wrap multi-step incident/event creation.
- **Git**: Never merge directly to `main`. Always create feature branches and raise PRs for review.
- **Brand**: The OpsKnight logo is transparent and background-less (`/logo.png`). Hyperlink all OpsKnight brand marks to `https://opsknight.com/`.
- **Status Semantics**:
  - High / Critical: Crimson Red (`#881337` to `#e11d48`)
  - Medium / Ack: Warm Amber (`#78350f` to `#d97706`)
  - Resolved: Emerald Green (`#047857` to `#059669`)
  - Low / Info: Cobalt Blue (`#1e3a8a` to `#3b82f6`)
  - Shifts: Royal Violet (`#4c1d95` to `#7c3aed`)
- **Code Quality**: Always verify changes compile with `npx tsc --noEmit` and pass `vitest` unit tests.
