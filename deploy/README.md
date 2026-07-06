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
