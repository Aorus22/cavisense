# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_SENSOR_WS_URL
ENV VITE_SENSOR_WS_URL=$VITE_SENSOR_WS_URL

RUN npx prisma generate

RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000 3010

ENV NODE_ENV=production

CMD ["npm", "run", "serve"]