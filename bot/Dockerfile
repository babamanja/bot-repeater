FROM node:22-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY bot/package.json bot/
COPY backend/prisma backend/prisma

RUN npm ci --workspace @vocab-bot/shared --workspace vocab-bot --include-workspace-root
RUN npx prisma generate --schema backend/prisma/schema.prisma

COPY packages/shared packages/shared
COPY bot bot

RUN npm run build -w @vocab-bot/shared && npm run build -w vocab-bot

WORKDIR /app/bot
CMD ["node", "dist/main.js"]
