# Starting OpsGuard in Production Mode

## Important: Standalone Mode

OpsGuard is configured to use Next.js standalone output mode for optimized production deployments. This requires a specific build and start process.

## Steps to Start

### 1. Build the Application

First, you must build the application:

```bash
npm run build
```

This creates the standalone server in `.next/standalone/`.

### 2. Start the Server

After building, start the server:

```bash
npm run start
```

This runs `node .next/standalone/server.js` which is the standalone server.

## Alternative: Development Mode

If you want to use the standard Next.js development server (without standalone mode), you can:

1. Temporarily remove `output: 'standalone'` from `next.config.ts`, OR
2. Use the development server directly:

```bash
npm run dev
```

## Docker Deployment

In Docker, the standalone server is automatically used. The Dockerfile:
1. Builds the application
2. Copies `.next/standalone` to the root
3. Runs `node server.js`

## Troubleshooting

**Error: "Cannot find module .next/standalone/server.js"**
- Make sure you've run `npm run build` first
- Check that `.next/standalone/server.js` exists

**Warning: "next start does not work with output: standalone"**
- This is expected. Use `npm run start` which uses the standalone server
- Or use `npm run dev` for development

## Environment Variables

Make sure you have a `.env` file or environment variables set:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

See `env.example` for all required variables.

