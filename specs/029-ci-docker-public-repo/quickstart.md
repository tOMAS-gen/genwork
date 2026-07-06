# Quickstart: CI Docker & Repo Público

## Prerequisitos

- Repositorio pusheado a GitHub (branch `main`)
- GitHub Actions habilitado en el repositorio
- Repositorio con visibilidad pública (o permisos de paquetes configurados)

## Validación 1: Workflow CI construye imagen

1. Hacer push a `main`
2. Ir a la pestaña Actions del repositorio en GitHub
3. Verificar que el workflow "Docker Publish" se ejecuta
4. Verificar que la imagen aparece en la pestaña "Packages" del repositorio

**Resultado esperado**: Imagen publicada en `ghcr.io/<owner>/genwork:latest` y `ghcr.io/<owner>/genwork:<sha>`

## Validación 2: Tag semántico

1. Crear un tag: `git tag v1.1.0 && git push origin v1.1.0`
2. Verificar que el workflow etiqueta la imagen con `v1.1.0`

**Resultado esperado**: Imagen con tag `v1.1.0` en GHCR

## Validación 3: App funciona sin Nextcloud

1. Ejecutar la imagen sin variables de Nextcloud:
   ```bash
   docker run -e DATABASE_URL="..." -e AUTH_SECRET="..." \
     -e GOOGLE_CLIENT_ID="..." -e GOOGLE_CLIENT_SECRET="..." \
     -e APP_URL="http://localhost:3000" \
     -p 3000:3000 ghcr.io/<owner>/genwork:latest
   ```
2. Acceder a la app en el navegador

**Resultado esperado**: App arranca, login funciona, features de archivos no disponibles (sin error)

## Validación 4: App funciona con Nextcloud

1. Agregar variables de Nextcloud al comando anterior:
   ```bash
   -e NEXTCLOUD_URL="..." -e NEXTCLOUD_ADMIN_USER="..." \
   -e NEXTCLOUD_ADMIN_PASSWORD="..." -e APP_ENCRYPTION_KEY="..."
   ```
2. Crear un proyecto y verificar que se crea la carpeta en Nextcloud

**Resultado esperado**: Integración de archivos funcional

## Validación 5: Variables obligatorias faltantes

1. Ejecutar la imagen sin `DATABASE_URL`
2. Verificar que el contenedor falla con mensaje claro

**Resultado esperado**: Exit 1 con mensaje indicando qué variable falta

## Validación 6: Repo público

1. Acceder al repositorio desde un navegador sin autenticación
2. Verificar que el código es visible

**Resultado esperado**: Repositorio accesible públicamente, sin credenciales expuestas
