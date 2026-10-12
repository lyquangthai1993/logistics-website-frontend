# syntax=docker/dockerfile:1
ARG NODE_VERSION=22-slim

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# ============================================
# Stage 2: Build the Next.js application
# ============================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=true
# Increase Node.js heap to 4GB to prevent OOM during compilation on Railway
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Dynamic build arguments for Dev and Production environments (No hardcoded fallback - fails if missing)
ARG NEXT_PUBLIC_API_URL
ARG API_URL
ARG NEXT_PUBLIC_SENTRY_DISABLED=true

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV API_URL=${API_URL}
ENV NEXT_PUBLIC_SENTRY_DISABLED=${NEXT_PUBLIC_SENTRY_DISABLED}

RUN npm run build

# ============================================
# Stage 3: Production runner
# ============================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
RUN mkdir -p .next && chown -R node:node /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

CMD ["node", "server.js"]

