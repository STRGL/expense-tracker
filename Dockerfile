# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests and schema first so npm ci can trigger prisma generate postinstall
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

# Copy source and build
# DATABASE_URL and AUTH_SECRET are placeholder values: Next.js evaluates
# auth.ts at build time (page-data collection) and asserts AUTH_SECRET is
# set in production, and Prisma would attempt a real connection if any
# page accidentally ran a query. The real values come from the runtime
# environment in the runner stage.
COPY . .
RUN DATABASE_URL="file:/tmp/build-placeholder.db" \
    AUTH_SECRET="build-placeholder-secret-not-used-at-runtime" \
    NODE_OPTIONS="--max-old-space-size=4096" \
    npm run build


# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy manifests and schema - prisma generate postinstall fires during npm ci
COPY package*.json ./
COPY prisma ./prisma/
COPY next.config.mjs ./

RUN npm ci --omit=dev

# Copy migration scripts and their lib dependencies (run via tsx on container start)
COPY tsconfig.json ./
COPY lib ./lib/
COPY scripts ./scripts/

# Copy compiled app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy and enable entrypoint
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
