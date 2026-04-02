FROM node:24-slim

# Prisma needs OpenSSL; slim image may not expose a detectable libssl path without this package.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json ./
# `npm ci` is strict about lockfile matching; use `npm install` to keep docker builds robust.
RUN npm install --no-audit --no-fund

# Copy Prisma schema + app sources.
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY src ./src
COPY tsconfig*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Docker runs on Linux; ensure entrypoint uses LF (strip potential CRLF from Windows).
RUN node -e "const fs=require('fs'); const p='docker-entrypoint.sh'; let c=fs.readFileSync(p,'utf8'); c=c.replace(/\\r\\n/g,'\\n').replace(/\\r/g,'\\n'); fs.writeFileSync(p,c,'utf8');"

# Dummy DATABASE_URL for `prisma generate` during build.
# Runtime DATABASE_URL is provided via environment variables (docker-compose).
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

RUN npx prisma generate
RUN npm run build

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]

