#!/bin/sh
# Corre DESDE LA NOTEBOOK. Copia genwork-work-db (server, datos reales) a la
# DB local de dev (deploy/docker-compose.dev.yml, puerto 5433).
# Manual, on-demand. Solo lectura sobre la DB del server (pg_dump).
set -e

SERVER_HOST=${SERVER_HOST:-192.168.1.10}   # o la IP tailscale, si no estás en la LAN de casa
SERVER_USER=${SERVER_USER:-usergen}

echo "Dump de genwork-work-db en $SERVER_HOST..."
ssh "$SERVER_USER@$SERVER_HOST" "docker exec genwork-work-db pg_dump -U genwork -Fc genwork" > /tmp/genwork-prod.dump

echo "Recreando schema local (evita conflictos de dependencias circulares)..."
docker compose -f deploy/docker-compose.dev.yml exec -T postgres \
  psql -U genwork -d genwork -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

echo "Restore en la DB local (docker-compose.dev.yml)..."
docker compose -f deploy/docker-compose.dev.yml exec -T postgres \
  pg_restore -U genwork -d genwork < /tmp/genwork-prod.dump

rm /tmp/genwork-prod.dump
echo "Listo. DB local actualizada con datos de producción."
