#!/bin/sh
set -e

# Migraciones de Prisma en cada arranque (idempotente)
./node_modules/.bin/prisma migrate deploy

exec node server.js
