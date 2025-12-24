# syntax=docker/dockerfile:1

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat openssl openssl-dev && \
    rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts --legacy-peer-deps && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat openssl openssl-dev && \
    rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci --ignore-scripts --legacy-peer-deps && \
    npm cache clean --force

# Copy application source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application with production optimizations
# Pages that need database access are marked as dynamic, so build works without DB
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install security updates and required runtime packages
RUN apk update && apk upgrade && \
    apk add --no-cache curl openssl openssl-dev && \
    rm -rf /var/cache/apk/* && \
    rm -rf /tmp/*

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user with specific UID/GID for consistency
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs && \
    mkdir -p /app && \
    chown -R nextjs:nodejs /app

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Copy Prisma and all its dependencies from builder (needed for migrations)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check with improved error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {let data='';r.on('data',(c)=>data+=c);r.on('end',()=>{const res=JSON.parse(data);process.exit(res.status==='healthy'?0:1)});}).on('error',()=>process.exit(1))"

# Start the application
CMD ["node", "server.js"]
