#!/bin/sh
set -e
echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Running data migrations..."
npm run migrate:dates
echo "Starting server..."
exec npm start
