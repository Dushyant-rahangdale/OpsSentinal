# Prisma Setup for Search Presets Feature

## Required Steps

The `SearchPreset` model has been added to the Prisma schema, but you need to:

### 1. Stop the Development Server
Stop your Next.js dev server (Ctrl+C) to release file locks.

### 2. Generate Prisma Client
```bash
npx prisma generate
```

This will regenerate the Prisma client with the new `SearchPreset` and `SearchPresetUsage` models.

### 3. Run Database Migration
Apply the migration to create the new tables:

**Option A: Using Prisma Migrate (Recommended for Production)**
```bash
npx prisma migrate deploy
```

**Option B: Using Prisma DB Push (For Development)**
```bash
npx prisma db push
```

### 4. Restart Development Server
```bash
npm run dev
```

## Troubleshooting

If you get an `EPERM` error during `prisma generate`:
1. Make sure all Node.js processes are stopped (dev server, build processes, etc.)
2. Close any IDEs or editors that might be locking the Prisma client files
3. Try running `npx prisma generate` again

If the migration fails:
- Check your `DATABASE_URL` in `.env` is correct
- Ensure you have proper database permissions
- Check that the database connection is active

## Verification

After setup, verify the models are available:
- The `/incidents` page should show the preset selector dropdown
- Visit `/settings/search-presets` to manage presets
- Check that you can create and use search presets

