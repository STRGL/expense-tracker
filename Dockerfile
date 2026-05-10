# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests and schema first so npm ci can trigger prisma generate postinstall
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

# Copy source and build
# DATABASE_URL is set to a dummy value so Prisma doesn't attempt a real
# connection if any page accidentally runs a query at build time.
COPY . .
RUN DATABASE_URL="file:/tmp/build-placeholder.db" NODE_OPTIONS="--max-old-space-size=4096" npm run build


# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy manifests and schema - prisma generate postinstall fires during npm ci
COPY package*.json ./
COPY prisma ./prisma/
COPY next.config.mjs ./

RUN npm ci --omit=dev

# Copy compiled app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy and enable entrypoint
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
