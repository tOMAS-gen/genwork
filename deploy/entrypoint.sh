#!/bin/sh
set -e

# Validación de variables de entorno obligatorias
required_vars="DATABASE_URL AUTH_SECRET AUTH_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET"
missing_vars=""

for var in $required_vars; do
  eval "value=\$$var"
  if [ -z "$value" ]; then
    echo "ERROR: Variable de entorno requerida: $var"
    missing_vars="$missing_vars $var"
  fi
done

if [ -n "$missing_vars" ]; then
  exit 1
fi

# Migraciones de Prisma en cada arranque (idempotente); CLI global de la imagen
prisma migrate deploy

exec node server.js
