#!/bin/sh
set -e

# Migraciones de Prisma en cada arranque (idempotente); CLI global de la imagen
prisma migrate deploy

exec node server.js
