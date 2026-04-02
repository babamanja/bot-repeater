#!/bin/sh

# Apply Prisma schema in the target database (simple deploy).
# Requires DATABASE_URL from environment.
# We enable --accept-data-loss because the schema may introduce new constraints/columns
# (e.g. Language.name becomes required + unique).
npx prisma db push --accept-data-loss

# Start Telegraf bot (see `npm run build` -> dist/main.js).
exec node dist/main.js

