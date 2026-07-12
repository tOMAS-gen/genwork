# Dev con datos reales, sobre túneles SSH (sin VPN dedicada)

Nada de terceros, nada de puertos nuevos en el router. Se reusa el SSH que
ya tenías andando (LAN: `192.168.1.10`, afuera: `207.191.165.97`, puerto 22
en ambos casos).

La app corre LOCAL en la notebook (`npm run dev`, puerto 3010). La DB local
es una COPIA de la real, refrescada a mano por SSH directo. Cuando querés
que `work.gen.net.ar` sirva lo que estás developeando, abrís un túnel SSH
inverso y nginx en el server apunta ahí en vez de al contenedor de
producción.

`genwork-work` (contenedor de producción) no se tocó — compose del server
sigue idéntico al original. Se para a mano solo mientras se developea así.

## 1. DB local (una vez)

```
docker compose -f deploy/docker-compose.dev.yml up -d postgres
```

## 2. Copiar datos reales a la DB local

```
./deploy/refresh-local-db-from-prod.sh
# afuera de casa: SERVER_HOST=207.191.165.97 ./deploy/refresh-local-db-from-prod.sh
```

## 3. `.env.local` (no versionado)

```
DATABASE_URL=postgresql://genwork:genwork-dev@localhost:5433/genwork
AUTH_SECRET=...        # cualquiera, no necesita matchear el del server
AUTH_URL=https://work.gen.net.ar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APP_ENCRYPTION_KEY=... # DEBE ser IDÉNTICO al del server: la DB es copia de la real
NEXTCLOUD_URL=...
NEXTCLOUD_ADMIN_USER=...
NEXTCLOUD_ADMIN_PASSWORD=...
```

```
npm run dev
```

## 4. Abrir el túnel (mientras developeás)

En otra terminal, dejar corriendo:
```
./deploy/dev-tunnel-up.sh
# afuera de casa: SERVER_HOST=207.191.165.97 ./deploy/dev-tunnel-up.sh
```
`autossh` lo mantiene vivo y reconecta solo si se corta la red. El forward
remoto usa el puerto **18010** (no 3010: ese ya está tomado en el server por
otro servicio, `web_cuyo_smart_sas`).

## 5. Redirigir work.gen.net.ar a la notebook

`sudo` en este server pide contraseña interactiva — correr esto directo en
una terminal propia (no funciona encadenado por `ssh host "comando"` de
otra sesión):
```
ssh usergen@192.168.1.10   # o 207.191.165.97 si estás afuera
cd /media/usergen/datos/empresa/genwork
docker compose stop genwork          # baja producción
sudo cp work.gen.net.ar.conf.dev /etc/nginx/sites-available/work.gen.net.ar.conf
sudo nginx -t && sudo nginx -s reload
```
`work.gen.net.ar` ahora sirve directo lo que corre en tu notebook.

## 6. Volver a producción

```
ssh usergen@192.168.1.10
cd /media/usergen/datos/empresa/genwork
sudo cp work.gen.net.ar.conf /etc/nginx/sites-available/work.gen.net.ar.conf
sudo nginx -t && sudo nginx -s reload
docker compose up -d genwork
```
Y en la notebook, `Ctrl+C` al túnel (`dev-tunnel-up.sh`).

## Refrescar datos cuando haga falta

```
./deploy/refresh-local-db-from-prod.sh
```
