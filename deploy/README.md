# Despliegue de genwork

genwork + Nextcloud "vienen juntos pero separados": un solo `docker compose up` levanta los 4
servicios (genwork, PostgreSQL, Nextcloud, Caddy). El módulo de conexión de genwork ya apunta al
Nextcloud incluido; también podés conectar un Nextcloud externo desde el panel admin.

## Requisitos

- Docker + Docker Compose v2
- Dos dominios apuntando al servidor (Caddy emite TLS automático):
  `genwork.midominio.com` y `nube.midominio.com`
- Proyecto en Google Cloud Console con **OAuth Client ID** (tipo Web):
  - Redirect URI: `https://genwork.midominio.com/api/auth/callback/google`

## Variables de entorno

| Variable | Descripción | Obligatoria | Default |
|----------|-------------|-------------|---------|
| DATABASE_URL | URL de conexión PostgreSQL | Sí | — |
| AUTH_SECRET | Secreto para firmar sesiones (next-auth) | Sí | — |
| AUTH_URL | URL pública de la aplicación (ej. https://genwork.example.com) | Sí | — |
| GOOGLE_CLIENT_ID | Client ID de Google OAuth | Sí | — |
| GOOGLE_CLIENT_SECRET | Client Secret de Google OAuth | Sí | — |
| NEXTCLOUD_URL | URL del servidor Nextcloud | No | — |
| NEXTCLOUD_ADMIN_USER | Usuario administrador de Nextcloud | No | — |
| NEXTCLOUD_ADMIN_PASSWORD | Contraseña del admin de Nextcloud | No | — |
| APP_ENCRYPTION_KEY | Clave para encriptar secretos almacenados | No* | — |

*APP_ENCRYPTION_KEY es obligatoria si se usa Nextcloud.

## Pasos

```bash
cd deploy
cp .env.example .env
# Completar: passwords, dominios, GOOGLE_CLIENT_ID/SECRET,
# AUTH_SECRET (openssl rand -base64 32) y APP_ENCRYPTION_KEY (openssl rand -hex 32)

docker compose up -d
docker compose ps        # esperar los 4 servicios healthy
```

Las migraciones de la base corren solas en cada arranque de genwork.

## Despliegue desde GHCR

Podés usar la imagen pública de genwork sin necesidad de clonar el repo.

### Mínimo (sin Nextcloud)

```bash
docker run -d --name genwork \
  -e DATABASE_URL="postgresql://user:pass@host:5432/genwork" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="https://genwork.example.com" \
  -e GOOGLE_CLIENT_ID="xxx" \
  -e GOOGLE_CLIENT_SECRET="xxx" \
  -p 3000:3000 \
  ghcr.io/tomas-gen/genwork:latest
```

### Completo (con Nextcloud)

```bash
docker run -d --name genwork \
  -e DATABASE_URL="postgresql://user:pass@host:5432/genwork" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="https://genwork.example.com" \
  -e GOOGLE_CLIENT_ID="xxx" \
  -e GOOGLE_CLIENT_SECRET="xxx" \
  -e NEXTCLOUD_URL="https://cloud.example.com" \
  -e NEXTCLOUD_ADMIN_USER="admin" \
  -e NEXTCLOUD_ADMIN_PASSWORD="xxx" \
  -e APP_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  -p 3000:3000 \
  ghcr.io/tomas-gen/genwork:latest
```

## Primer uso

1. Entrar a `https://genwork.midominio.com` e **iniciar sesión con Google**.
   El primer usuario queda como **super-admin**.
2. Panel **Administración → Control de acceso**: elegir modo (dominio corporativo o lista de
   correos) y autorizar al equipo.
3. Panel **Administración → Almacenamiento**: "Probar conexión" contra el Nextcloud incluido
   (preconfigurado por variables de entorno) o cargar la URL/credenciales de uno externo.
4. Cada usuario autorizado recibe su cuenta espejo en Nextcloud (si hay SMTP configurado en
   Nextcloud, le llega mail para definir su contraseña; si no, el admin se la resetea desde
   Nextcloud). Con esa cuenta instala el **cliente de escritorio de Nextcloud** y las carpetas
   de sus grupos se sincronizan solas.

## Desarrollo local

```bash
# 1. Levantar postgres (:5433) + Nextcloud (:8081)
docker compose -f deploy/docker-compose.dev.yml up -d

# 2. Configurar Nextcloud (una sola vez)
bash scripts/setup-nextcloud.sh

# 3. Migraciones + app
npm run db:migrate
npm run dev            # http://localhost:3010
```

Con `DEV_AUTH=true` en `.env` hay tres usuarios de prueba sin Google
(admin / miembro / lector) en la pantalla de login. Nunca activarlo en producción.

## Validación completa

Ver `specs/001-gestion-trabajos-sectores/quickstart.md` — escenarios end-to-end por user story.

## Tests

```bash
npm test    # dominio: parser de etiquetas, permisos, filtros, archivado, acceso
```
