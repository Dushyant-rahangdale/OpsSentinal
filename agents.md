# Agent Best Practices for OpsSentinal

This document outlines the coding standards, testing practices, and development guidelines that AI assistants should follow when working on the OpsSentinal project.

---

## 🎯 Core Principles

1. **Type Safety First**: This project uses TypeScript with strict mode enabled
2. **Test-Driven Development**: All features must have corresponding tests
3. **Code Quality**: Maintain zero linting errors and warnings
4. **Database Safety**: Always use Prisma migrations for schema changes
5. **Security**: Follow Next.js and authentication best practices

---

## 📝 Code Standards

### TypeScript Guidelines

- **Strict Mode**: Always respect TypeScript's strict mode settings
- **Explicit Types**: Avoid using `any` type unless absolutely necessary
  - When `any` is unavoidable, add `// eslint-disable-line @typescript-eslint/no-explicit-any` on the **same line**
  - Never place ESLint disable comments on separate lines as this causes syntax errors
- **Type Imports**: Use `import type` for type-only imports
- **Path Aliases**: Use `@/` alias for imports from the `src` directory
  ```typescript
  // Good
  import { something } from '@/lib/utils'
  
  // Avoid
  import { something } from '../../../lib/utils'
  ```

### Next.js Specific Guidelines

- **App Router**: This project uses Next.js 16+ App Router
- **Server Components**: Default to Server Components unless client interactivity is needed
- **Client Components**: Mark with `'use client'` directive only when necessary
- **API Routes**: Place in `src/app/api/` following Next.js conventions
- **Middleware**: Authentication and routing logic in `middleware.ts`

### React Best Practices

- **Hooks**: Follow React hooks rules (no conditional hooks)
- **Component Structure**: 
  - UI components in `src/components/ui/`
  - Feature components in `src/components/`
  - Shared logic in `src/hooks/`
- **State Management**: Use React hooks and context when needed
- **Performance**: Use memo, useMemo, useCallback appropriately

---

## 🧪 Testing Requirements

### Test Coverage Standards

**CRITICAL**: When modifying ANY production code, you MUST update or create corresponding tests.

#### When to Write Tests

1. **New Features**: Write tests BEFORE or ALONGSIDE the feature implementation
2. **Bug Fixes**: Add a failing test that reproduces the bug, then fix it
3. **Refactoring**: Ensure all existing tests pass; add new tests for edge cases
4. **Code Changes**: Update affected tests to reflect new behavior

#### Test Types

1. **Unit Tests**: For individual functions, utilities, and components
   ```typescript
   // File: src/lib/utils.ts
   // Test: tests/lib/utils.test.ts
   ```

2. **Integration Tests**: For API routes, database operations, and complex workflows
   ```typescript
   // File: src/app/api/services/route.ts
   // Test: tests/integration/services.test.ts
   ```

3. **Component Tests**: For React components
   ```typescript
   // File: src/components/ServiceCard.tsx
   // Test: tests/components/ServiceCard.test.tsx
   ```

### Test File Organization

```
tests/
├── lib/                      # Unit tests for src/lib/
├── components/               # Component tests
├── integration/              # Integration tests
│   ├── database.test.ts      # Database operations
│   ├── notification-flow.test.ts
│   └── auth.test.ts
├── setup.ts                  # Shared test setup
├── vitest.unit.config.ts     # Unit test configuration
└── vitest.int.config.ts      # Integration test configuration
```

### Testing Framework: Vitest

- **Test Runner**: Vitest (Jest-compatible)
- **React Testing**: `@testing-library/react`
- **Coverage**: Strictly enforce 100% code coverage

### Test Commands

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run all tests once
npm run test:unit     # Run unit tests only
npm run test:int      # Run integration tests only
npm run test:coverage # Run with coverage report
npm run test:ci       # Run all tests in CI mode
```

### Test Best Practices

1. **Descriptive Test Names**: Use clear, descriptive test names
   ```typescript
   // Good
   it('should send email notification when service goes down', async () => {})
   
   // Bad
   it('works', async () => {})
   ```

2. **Arrange-Act-Assert Pattern**:
   ```typescript
   it('should create new service', async () => {
     // Arrange
     const serviceData = { name: 'Test Service', url: 'https://example.com' }
     
     // Act
     const result = await createService(serviceData)
     
     // Assert
     expect(result.name).toBe('Test Service')
   })
   ```

3. **Isolate Tests**: Each test should be independent
   - Use `beforeEach` for setup
   - Use `afterEach` for cleanup
   - Mock external dependencies

4. **Database Tests**:
   - Use `.env.test` for test database configuration
   - Clean up test data in `afterEach`
   - Use transactions when possible for faster tests

5. **Mock External Services**:
   ```typescript
   // Mock email service
   vi.mock('@/lib/email', () => ({
     sendEmail: vi.fn().mockResolvedValue({ success: true })
   }))
   ```

### Test Update Workflow

**MANDATORY PROCESS** when modifying code:

1. ✅ Run existing tests: `npm test`
2. ✅ Identify affected tests
3. ✅ Update test expectations to match new behavior
4. ✅ Add new tests for new functionality
5. ✅ Ensure all tests pass before committing
6. ✅ Check test coverage hasn't decreased

---


## 🗃️ Database and Prisma

### Schema Changes

**ALWAYS** use Prisma migrations for database schema changes:

```bash
# 1. Modify prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_migration_name

# 3. For production
npx prisma migrate deploy
```

### Automatic Migration Recovery (Containerized Deployments)

**FOR OPEN-SOURCE/CONTAINERIZED DEPLOYMENTS:**

OpsSentinal is designed for fault-tolerant containerized deployments where users pull new Docker images and restart. **Manual migration fixes are not expected**.

#### Self-Healing System

The application includes **automatic migration recovery** that runs on every startup:

1. **Detects** failed migrations in `_prisma_migrations` table  
2. **Verifies** actual database state (e.g., does enum value exist?)
3. **Resolves** migrations automatically based on reality
4. **Logs** all actions for transparency
5. **Continues** startup even if recovery has warnings

**Location**: [`instrumentation.ts`](file:///c:/Users/Dushyant.Rahangdale/Repo/OpsSentinal/instrumentation.ts) runs before application starts

#### How It Works

```typescript
// Automatically runs on server startup
export async function register() {
  // 1. Auto-recover failed migrations
  await autoRecoverMigrations();  // Self-healing!
  
  // 2. Start application services
  startCronScheduler();
}
```

#### What Gets Auto-Recovered

✅ **Enum migrations** - Checks if value exists, applies if needed, marks as resolved  
✅ **Idempotent operations** - Safe to run multiple times  
✅ **State validation** - Verifies database reality before resolving

⚠️ **Skipped for safety** - Unknown migration types log warnings but don't block startup

#### Testing Auto-Recovery

```bash
# Manually trigger auto-recovery (already runs on startup)
npm run prisma:auto-recover
```

#### For Developers

When creating new migrations that may fail:

1. **Make them idempotent** - Use `IF NOT EXISTS`, `IF EXISTS` clauses
2. **Add auto-recovery logic** - Update `scripts/auto-recover-migrations.ts` if needed
3. **Test failure scenarios** - Simulate failed migration and verify auto-recovery
4. **Document recovery** - Add comments explaining recovery logic

### Migration Safety Rules

**CRITICAL - Follow these rules to prevent production failures:**

#### Rule 1: Never Modify Database Directly
- ❌ **NEVER** run SQL directly against the database
- ❌ **NEVER** create "hotfix" SQL files outside the migration system
- ❌ **NEVER** manually edit `_prisma_migrations` table (except during recovery)
- ✅ **ALWAYS** use `npx prisma migrate dev` for schema changes
- ✅ **ALWAYS** commit migration files to version control

**Why**: Manual changes bypass migration tracking, causing inconsistencies between schema and database that block future migrations.

#### Rule 2: Enum Migrations Require Special Handling

**CRITICAL**: PostgreSQL's `ALTER TYPE ... ADD VALUE` cannot run inside transactions. This is the #1 cause of migration failures.

**Creating Enum Migration:**
```bash
# 1. Create migration (create-only, don't apply yet)
npx prisma migrate dev --create-only --name add_enum_value_name

# 2. MANUALLY VERIFY the generated SQL contains ONLY enum changes
# 3. If it contains other changes, you MUST split into separate migrations

# 4. Apply locally
npx prisma migrate dev

# 5. Test thoroughly before production
npm run test:run
```

**Enum Migration File Structure (MUST be standalone):**
```sql
-- Migration: 20250101000000_add_enum_value_name/migration.sql
-- Description: Add NEW_VALUE to ExampleEnum

-- AlterEnum (MUST be the ONLY operation in this file)
ALTER TYPE "ExampleEnum" ADD VALUE IF NOT EXISTS 'NEW_VALUE';
```

**What NOT to do:**
```sql
-- ❌ WRONG: Mixing enum with other operations
ALTER TYPE "MyEnum" ADD VALUE 'NEW_VALUE';
ALTER TABLE "MyTable" ADD COLUMN "new_column" TEXT;  -- This will fail!
```

**Correct approach:**
```sql
-- ✅ Migration 1: 20250101000000_add_enum_value/migration.sql
ALTER TYPE "MyEnum" ADD VALUE IF NOT EXISTS 'NEW_VALUE';
```
```sql
-- ✅ Migration 2: 20250101000001_add_table_column/migration.sql  
ALTER TABLE "MyTable" ADD COLUMN "new_column" TEXT;
```

#### Rule 3: Validate Before Deploying

```bash
# Run validation suite before production deployment
npm run prisma:validate    # Checks migration files for issues
npm run prisma:health      # Checks migration status in database
npm run test:run          # Ensures all tests pass

# Use safe deployment command (runs all checks automatically)
npm run prisma:migrate:safe
```

The validation script will detect:
- Enum migrations mixed with other operations
- Invalid migration timestamps (e.g., June 31st)
- Dangerous operations (DROP, TRUNCATE)
- Missing safety clauses (IF EXISTS)

#### Rule 4: Test Migrations in Staging First

Before applying to production:
1. Apply migration to staging/dev environment
2. Verify application functionality
3. Check for performance issues with new indexes/columns
4. Monitor for errors in application logs
5. Verify rollback procedure works
6. Only then apply to production

#### Rule 5: Always Have a Rollback Plan

Before applying any migration:
1. **Take database backup** (required for production)
2. Document rollback SQL if the migration is reversible
3. Have rollback procedure ready and tested
4. Know your recovery time objective (RTO)
5. Schedule deployment during low-traffic window if possible

### Pre-Deployment Migration Checklist

Before deploying ANY migration to production, verify:

- [ ] Migration tested locally successfully
- [ ] Migration reviewed by team member or AI
- [ ] Migration applied and tested in staging environment
- [ ] **Database backup taken** (critical!)
- [ ] Rollback procedure documented and tested
- [ ] Validation passes: `npm run prisma:validate`
- [ ] Health check passes: `npm run prisma:health`
- [ ] All tests pass: `npm run test:run`
- [ ] For enum migrations: Verified it's standalone (no other operations)
- [ ] For breaking changes: Documented migration strategy
- [ ] Deployment window scheduled (off-peak if possible)
- [ ] Monitoring/alerts configured for post-deployment
- [ ] Team notified of deployment

### Migration Failure Recovery

If a migration fails in production, follow this process:

#### Step 1: Assess the Situation

```bash
# Check migration status
npx prisma migrate status

# Or run health check
npm run prisma:health
```

This will show failed migrations (finished_at is NULL in `_prisma_migrations` table).

#### Step 2: Verify Schema State

Determine if changes were partially applied:

```sql
-- Connect to database
-- Check table/column exists
\d table_name  -- PostgreSQL

-- Check enum values
SELECT e.enumlabel 
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'YourEnumName';
```

#### Step 3: Choose Recovery Strategy

**Scenario A: Migration failed but changes WERE applied (e.g., enum already added)**

```bash
# Mark migration as successfully applied
npx prisma migrate resolve --applied 20250630_add_escalation_policy_enum

# Verify status
npx prisma migrate status
```

**Scenario B: Migration failed and changes were NOT applied**

```bash
# Mark as rolled back
npx prisma migrate resolve --rolled-back 20250630_add_escalation_policy_enum

# Fix the underlying issue (e.g., split enum migration)
# Then reapply
npx prisma migrate deploy
```

**Scenario C: Migration partially applied (rare)**

```sql
-- 1. Manually revert partial changes
-- 2. Delete migration record
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20250630_add_escalation_policy_enum';

-- 3. Fix the migration file
-- 4. Reapply
npx prisma migrate deploy
```

#### Step 4: Verify and Test

```bash
# Check status is clean
npx prisma migrate status

# Regenerate Prisma Client
npx prisma generate

# Run tests
npm run test:run

# Restart application
```

### Forbidden Migration Practices

❌ **NEVER DO THESE:**

1. **Manually edit applied migrations** - Once applied, migrations are immutable
2. **Delete migration files after applying** - Version control needs complete history  
3. **Create migrations with manual SQL files** - Use `npx prisma migrate dev --create-only`
4. **Skip migrations in sequence** - All migrations must be applied in order
5. **Apply migrations without testing** - Always test in dev/staging first
6. **Combine enum changes with other schema changes** - #1 cause of failures
7. **Deploy migrations without backup** - Critical for production
8. **Modify `_prisma_migrations` table** - Except during documented recovery procedures

### Migration Naming Conventions

Use descriptive, lowercase names with underscores:

✅ **Good names:**
- `add_user_role_column`
- `create_notification_settings_table`
- `add_escalation_policy_enum_value`
- `add_index_on_incident_status`

❌ **Bad names:**
- `migration` (not descriptive)
- `fix` (what are you fixing?)
- `update_db` (too vague)
- `AddUserRole` (use snake_case, not PascalCase)

### Database Best Practices

1. **Never** directly modify the database in production
2. **Always** test migrations locally first
3. **Include** rollback strategy for migrations
4. **Use** transactions for multi-step operations (note: not for enum changes)
5. **Add** indexes for frequently queried fields
6. **Document** schema changes in migration files with comments

### Prisma Client Usage

```typescript
// Good: Import from centralized client
import { prisma } from '@/lib/prisma'

// Use transactions for related operations
await prisma.$transaction(async (tx) => {
  await tx.service.create({ data: serviceData })
  await tx.notification.create({ data: notificationData })
})
```

---


## 🔒 Security Guidelines

1. **Authentication**: 
   - Always validate user session
   - Use NextAuth.js patterns
   - Never expose sensitive data in client components

2. **API Routes**:
   - Validate all inputs with Zod schemas
   - Check user permissions before operations
   - Return appropriate HTTP status codes

3. **Environment Variables**:
   - Never commit `.env` files
   - Document required env vars in `env.example`
   - Validate env vars at startup

4. **Input Validation**:
   ```typescript
   import { z } from 'zod'
   
   const schema = z.object({
     name: z.string().min(1).max(100),
     url: z.string().url()
   })
   
   const validatedData = schema.parse(input)
   ```

---

## 🎨 Code Quality

### ESLint and Linting

- **Zero Warnings Policy for Modified Files**: Files you modify must pass linting checks
- **Pre-commit Hooks**: Husky runs linting automatically
- **Fix Issues**: Use `npm run lint:fix -- file1 file2` to auto-fix issues in specific files
- **Scope**: Only fix lint errors in files you are actively working on, not the entire codebase

### Code Review Checklist

Before committing code, ensure:

- [ ] All tests pass (`npm run test:run`)
- [ ] No linting errors (`npm run lint:check`)
- [ ] TypeScript compiles without errors
- [ ] New features have tests
- [ ] Updated tests reflect code changes
- [ ] Documentation updated if needed
- [ ] No console.log statements (use proper logging)
- [ ] No commented-out code blocks
- [ ] Proper error handling implemented

---

## 📦 Dependencies

### Adding Dependencies

1. **Evaluate Necessity**: Is this dependency truly needed?
2. **Check Bundle Size**: Will it significantly increase build size?
3. **Security**: Check for known vulnerabilities
4. **Maintenance**: Is the package actively maintained?

### Dependency Types

- **dependencies**: Runtime dependencies
- **devDependencies**: Build and test tools
- **optionalDependencies**: Optional integrations (email, SMS providers)

---

## 🚀 Deployment and CI/CD

### Pre-deployment Checklist

- [ ] All tests pass in CI (`npm run test:ci`)
- [ ] Build succeeds (`npm run build`)
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] No breaking changes without migration plan

### Docker

- Development: `docker-compose.dev.yml`
- Production: `docker-compose.prod.yml`
- Always test Docker build before deployment

---

## 📂 File Organization

### Naming Conventions

- **Components**: PascalCase (`ServiceCard.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: PascalCase in `types/` directory
- **Tests**: Match source file with `.test.ts` suffix

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/             # Authenticated app routes
│   ├── (auth)/            # Authentication pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Utilities and business logic
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── contexts/             # React contexts
```

---

## 🐛 Debugging and Error Handling

### Logging Guidelines

**CRITICAL**: `console.log`, `console.error`, and `console.warn` are **FORBIDDEN** in production code. You MUST use the project's structured logger.

```typescript
import { logger } from '@/lib/logger'

// ✅ Good Usage
logger.info('User logged in', { userId: user.id })
logger.error('Failed to create service', { error, serviceName })
logger.debug('Processing webhook payload', { payload })

// ❌ Bad Usage - DO NOT USE
console.log('User logged in')
console.error('Failed to create service', error)
console.warn('Something happened')
```

#### Logger Features

- **Context aware**: Pass metadata as second argument
- **Child loggers**: Create scoped loggers for components/requests
  ```typescript
  const requestLogger = logger.child({ requestId: '123' })
  requestLogger.info('Request started')
  ```
- **Performance**: Use `measure` or `startTimer`
  ```typescript
  await logger.measure('db_query', async () => {
    return await db.query()
  })
  ```

### Error Handling Patterns

```typescript
// API Routes
try {
  // operation
  return NextResponse.json({ success: true })
} catch (error) {
  logger.error('Operation failed', { error, component: 'api-route' })
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  )
}

// Client Components
try {
  // operation
} catch (error) {
  logger.error('Client error', { error })
  // Show user-friendly error message
}
```

### Logging

- Use `logger.error()` for errors that require attention
- Use `logger.warn()` for non-critical issues (deprecations, retries)
- Use `logger.info()` for significant business events
- Use `logger.debug()` for development details (payloads, state)
- **NEVER** log sensitive data (passwords, tokens, PII)

---

## 🔄 Git Workflow

### Commit Messages

Follow conventional commits format:

```
feat: add email notification support
fix: resolve session leak in invite flow
test: add tests for notification preferences
docs: update API documentation
refactor: simplify auth middleware
```

### Branch Strategy

- `main`: Production-ready code (**PROTECTED**: No direct pushes)
- `develop`: Development branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `test/*`: Test improvements

### Pull Request (PR) Policy

**CRITICAL**: Direct pushes to `main` are **FORBIDDEN**.

1.  **Create Feature Branch**: Always create a new branch from `main` or `develop`.
2.  **Make Changes**: Commit your changes to the feature branch.
3.  **Open Pull Request**: Create a PR to merge your branch into `main`.
4.  **Review**: Wait for code review approval before merging.
5.  **Merge**: Squash and merge after checks pass.

### Pre-Push Workflow

**MANDATORY**: Before pushing ANY code to the repository, you MUST run the following checks:

#### 1. Run All Tests

```bash
npm run test:run
```

- All tests MUST pass
- Fix any failing tests before proceeding
- If tests fail due to intentional behavior changes, update the tests
- Never push code with failing tests

#### 2. Check Linting

```bash
# Check linting for specific files you modified
npx eslint src/path/to/your/file1.ts src/path/to/your/file2.tsx
```

- ZERO warnings or errors allowed **in files you modified**
- Fix linting issues in your files with `npx eslint --fix src/path/to/your/file.ts`
- Manually fix any issues that can't be auto-fixed
- Never push code with linting errors in your modified files
- You are NOT responsible for fixing pre-existing lint errors in other files

#### 3. Verify TypeScript Compilation

```bash
npx tsc --noEmit
```

- Ensure TypeScript compiles without errors
- Fix all type errors before pushing
- Never suppress type errors without good reason

#### 4. Build the Project

```bash
npm run build
```

- Ensure the project builds successfully
- Fix any build errors before pushing
- Verify that production build works, not just dev mode
- Never push code that fails to build

#### 5. Quick Pre-Push Command

Run all checks with a single command:

**For Linux/macOS (Bash):**
```bash
npm run test:run && npm run lint:check && npx tsc --noEmit && npm run build
```

**For Windows (PowerShell):**
```powershell
npm run test:run; if ($?) { npm run lint:check }; if ($?) { npx tsc --noEmit }; if ($?) { npm run build }
```

**Alternative (works on all platforms):**
```bash
# Run each command separately
npm run test:run
npm run lint:check
npx tsc --noEmit
npm run build
```

✅ If all checks pass → Safe to push

❌ If any check fails → Fix issues before pushing

#### 6. Git Pre-commit Hooks

This project uses **Husky** for pre-commit hooks that automatically run:
- Linting on staged files (via lint-staged)
- Format checking

The hooks will prevent commits if checks fail.

#### Pre-Push Checklist

Before running `git push`, verify:

- [ ] `npm run test:run` passes with 0 failures
- [ ] `npm run lint:check` passes with 0 warnings
- [ ] `npx tsc --noEmit` shows no type errors
- [ ] `npm run build` completes successfully
- [ ] All new code has corresponding tests
- [ ] All modified code has updated tests
- [ ] Commit messages follow conventional format
- [ ] No `.env` or sensitive files in commit
- [ ] Code has been reviewed (self-review at minimum)

#### What to Do If Checks Fail

**Tests Failing?**
1. Read the error messages carefully
2. Fix the failing tests or update them if behavior changed
3. Run `npm test` to debug in watch mode
4. Ensure test data is properly cleaned up

**Lint Errors?**
1. Run `npx eslint --fix src/path/to/your/file.ts` to auto-fix specific files
2. Review the changes made by auto-fix
3. Manually fix remaining issues in your files
4. Check ESLint error messages for guidance
5. Only fix lint errors in files you are working on, not unrelated files

**TypeScript Errors?**
1. Read the error messages and locations
2. Fix type mismatches or add proper types
3. Avoid using `any` unless absolutely necessary
4. Use proper type imports and definitions

**Build Failing?**
1. Check the build error output carefully
2. Ensure all imports and dependencies are correct
3. Verify environment variables are properly configured
4. Clear `.next` cache: `rm -rf .next` (or `Remove-Item -Recurse -Force .next` on Windows)
5. Try `npm run build` again after fixing errors

---

## 📚 Documentation

### When to Update Documentation

1. **API Changes**: Update API documentation
2. **New Features**: Add feature documentation
3. **Configuration Changes**: Update setup guides
4. **Breaking Changes**: Document migration path

### Code Comments

- **Do**: Explain WHY, not WHAT
- **Don't**: State the obvious
- **Do**: Document complex algorithms
- **Do**: Add JSDoc for public APIs

```typescript
/**
 * Sends notifications to all configured channels for a service incident
 * 
 * @param serviceId - The ID of the affected service
 * @param incidentType - Type of incident (down, degraded, recovered)
 * @returns Promise resolving when all notifications are sent
 */
async function sendServiceNotifications(
  serviceId: string,
  incidentType: IncidentType
): Promise<void> {
  // Implementation
}
```

---

## ⚡ Performance Considerations

1. **Database Queries**: 
   - Use `select` to limit fields
   - Add indexes for common queries
   - Use pagination for large datasets

2. **React Components**:
   - Lazy load heavy components
   - Use Server Components when possible
   - Minimize client-side JavaScript

3. **API Routes**:
   - Implement caching where appropriate
   - Use streaming for large responses
   - Rate limit public endpoints

---

## 🎓 Learning Resources

- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **TypeScript**: https://www.typescriptlang.org/docs
- **Vitest**: https://vitest.dev/guide
- **React Testing Library**: https://testing-library.com/react

---

## 🤝 AI Assistant Guidelines

When working on this codebase:

1. **Always Check Tests**: Run tests before and after changes
2. **Update Tests**: Modify tests to match new behavior
3. **Follow Patterns**: Match existing code style and patterns
4. **Ask Questions**: When requirements are unclear, ask for clarification
5. **Incremental Changes**: Make small, testable changes
6. **Explain Changes**: Document why changes were made
7. **Verify Build**: Ensure TypeScript compiles without errors
8. **Lint Check**: Ensure linting passes with zero warnings

### Prohibited Actions

❌ **NEVER** do the following without explicit approval:

- Delete existing tests without replacement
- Disable ESLint rules globally
- Commit code that doesn't pass tests
- Make breaking changes without migration path
- Modify database schema without migrations
- Use `any` type without explicit comment
- Commit with linting errors
- Push directly to main branch

---

## 🔍 Common Patterns in This Project

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

const schema = z.object({
  // Define schema
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    // Business logic

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### Component Pattern

```typescript
'use client' // Only if needed

import { useState } from 'react'

interface Props {
  // Define props
}

export function MyComponent({ prop }: Props) {
  const [state, setState] = useState()

  // Component logic

  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('MyFunction', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  it('should do something specific', async () => {
    // Arrange
    const input = {}

    // Act
    const result = await myFunction(input)

    // Assert
    expect(result).toBeDefined()
  })
})
```

---

## ✅ Summary Checklist

For every code change, verify:

- [ ] Tests written/updated
- [ ] All tests pass
- [ ] No linting errors
- [ ] TypeScript compiles
- [ ] Documentation updated
- [ ] Changes follow project patterns
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Error handling implemented
- [ ] Code reviewed (by AI or human)

---

**Remember**: Quality over speed. It's better to make correct, well-tested changes than to rush and introduce bugs.
