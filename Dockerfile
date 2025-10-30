# 1. Dependency Stage
FROM oven/bun:alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# 2. Build Stage
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV RUNTIME=custom

RUN bunx prisma generate
RUN bun run build

# 3. Runtime Stage
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prod-server.ts ./
COPY --from=builder /app/server-ws.ts ./

CMD ["bun", "prod-server.ts"]