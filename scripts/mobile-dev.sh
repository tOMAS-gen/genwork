#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Una sola URL para web, Chrome en Android y flutter_web_auth_2.
mobile_port="${CONDUCTOR_PORT:-3010}"
export DATABASE_URL="postgresql://genwork:genwork-dev@localhost:5433/genwork_mobile_parity"
export AUTH_URL="http://localhost:${mobile_port}"
export DEV_AUTH=true
export AUTH_TRUST_HOST=true
export NEXTCLOUD_URL="http://localhost:8081"
export NEXTCLOUD_ADMIN_USER=ncadmin
export NEXTCLOUD_ADMIN_PASSWORD=ncadmin-dev
export ARCHIVE_DIR="$PWD/.context/mobile-parity/archives"
export GENWORK_DEV_OUTPUT=".context/mobile-parity/next"
mkdir -p .context/mobile-parity

case "${1:-web}" in
  setup)
    docker compose -f deploy/docker-compose.dev.yml up -d postgres nextcloud
    docker compose -f deploy/docker-compose.dev.yml exec -T postgres sh -c \
      'until pg_isready -U genwork; do sleep 1; done; psql -U genwork -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '\''genwork_mobile_parity'\''" | grep -q 1 || createdb -U genwork genwork_mobile_parity'
    npx prisma generate
    # Base descartable exclusiva de QA; nunca resetea ni acepta pérdida de datos.
    npx prisma db push --skip-generate
    node scripts/mobile-seed.mjs
    (cd mobile && flutter pub get)
    ;;
  web)
    exec npx next dev -H 0.0.0.0 -p "$mobile_port"
    ;;
  android)
    mobile_adb="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
    if command -v adb >/dev/null 2>&1; then mobile_adb="$(command -v adb)"; fi
    "$mobile_adb" -s "${ANDROID_DEVICE:-emulator-5554}" reverse "tcp:$mobile_port" "tcp:$mobile_port"
    printf 'Ingresá esta URL en la app: %s\n' "$AUTH_URL"
    cd mobile
    exec flutter run --no-pub -d "${ANDROID_DEVICE:-emulator-5554}" --host-vmservice-port="$((mobile_port + 1))" --dds-port="$((mobile_port + 2))" --vmservice-out-file=../.context/mobile-parity/vmservice.json
    ;;
  *) printf 'Uso: bash scripts/mobile-dev.sh setup|web|android\n' >&2; exit 2 ;;
esac
