# Fix Custom Fields Error

## Problem
Error: `Unknown field customFieldValues for include statement on model Incident`

This happens because:
1. The database migration hasn't been applied yet, OR
2. The Prisma client hasn't been regenerated after the schema changes

## Solution

### Option 1: Quick Fix (Development)
1. **Stop your Next.js dev server** (Ctrl+C in the terminal where it's running)

2. **Apply the database migration:**
   ```bash
   npx prisma db push
   ```
   This syncs your database schema without creating migration files.

3. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

### Option 2: Proper Migration (Production)
1. **Stop your Next.js dev server**

2. **Apply the migration:**
   ```bash
   npx prisma migrate dev
   ```
   This will:
   - Apply the migration file
   - Regenerate the Prisma client

3. **Restart your dev server**

### If you get file lock errors (Windows/OneDrive)
1. Close all terminals/IDEs
2. Stop the Next.js dev server completely
3. Wait 10 seconds
4. Open a new terminal
5. Run `npx prisma generate` again

## Verification

After fixing, you should be able to:
- Access `/settings/custom-fields` (admin only)
- See custom fields in incident creation form
- See custom fields on incident detail pages

## Files Changed
- `prisma/schema.prisma` - Added CustomField and CustomFieldValue models
- `prisma/migrations/20241223000002_add_custom_fields/migration.sql` - Migration file





