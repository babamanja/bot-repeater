FROM node:22-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/

RUN npm ci --workspace @vocab-bot/shared --workspace vocab-bot-backend --include-workspace-root

COPY packages/shared packages/shared
COPY backend backend

RUN npm run build -w @vocab-bot/shared && npm run build -w vocab-bot-backend

WORKDIR /app/backend
CMD ["node", "dist/index.js"]
