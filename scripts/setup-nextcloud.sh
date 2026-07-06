#!/usr/bin/env bash
# Configura el Nextcloud de DESARROLLO (deploy/docker-compose.dev.yml) para genwork.
# En producción esto lo hace el servicio nextcloud-init de deploy/docker-compose.yml.
set -euo pipefail

NC_URL="${NEXTCLOUD_URL:-http://localhost:8081}"
COMPOSE_FILE="deploy/docker-compose.dev.yml"

echo "⏳ Esperando que Nextcloud esté listo en ${NC_URL}..."

MAX_WAIT=120
ELAPSED=0
until curl -sf "${NC_URL}/status.php" | grep -q '"installed":true'; do
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "❌ Nextcloud no respondió después de ${MAX_WAIT}s"
    echo "   ¿Está levantado? → docker compose -f ${COMPOSE_FILE} up -d"
    exit 1
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

echo "✅ Nextcloud respondiendo en ${NC_URL}"

occ() {
  docker compose -f "$COMPOSE_FILE" exec -T -u www-data nextcloud php occ "$@"
}

echo "📦 Deshabilitando apps innecesarias..."
for app in firstrunwizard recommendations weather_status dashboard; do
  occ app:disable "$app" 2>/dev/null || true
done

echo "📂 Activando files_sharing..."
occ app:enable files_sharing 2>/dev/null || true

echo "🔧 Configurando trusted domains..."
occ config:system:set trusted_domains 1 --value="localhost:8081"
occ config:system:set trusted_domains 2 --value="localhost:3010"

echo ""
echo "✅ Nextcloud de desarrollo listo para genwork."
echo "   URL:   ${NC_URL}"
echo "   Admin: ncadmin / ncadmin-dev (ver ${COMPOSE_FILE})"
