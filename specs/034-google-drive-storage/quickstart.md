# Quickstart: Google Drive storage + subida de archivos

## Prerrequisitos (Google Cloud, una sola vez)

1. En Google Cloud Console: habilitar **Google Drive API** en el proyecto.
2. En el cliente OAuth (el mismo del login o uno nuevo `GDRIVE_CLIENT_ID/SECRET`): agregar el **redirect URI**
   `https://<tu-dominio>/api/admin/storage/google/callback` (y el de localhost para dev).
3. Pantalla de consentimiento: agregar el scope `.../auth/drive`. En producción, el scope Drive es sensible y puede requerir verificación de Google (para uso interno/testing basta la app en modo testing con usuarios de prueba).
4. Tener un **Shared Drive** (requiere Google Workspace) donde la plataforma guardará los archivos; anotar su ID (de la URL `drive/folders/<id>` o `drive/u/0/drive/<id>`).

Variables de entorno: `APP_ENCRYPTION_KEY` (ya requerida) para cifrar el refresh token. Opcional: `GDRIVE_CLIENT_ID`/`GDRIVE_CLIENT_SECRET` (si no, usa `GOOGLE_CLIENT_ID/SECRET`).

```bash
npm run dev   # http://localhost:3010
```

## Escenario 1 — Conectar Google Drive (US1, FR-001..005)

1. Como SUPERADMIN, ir a **Administración → Almacenamiento**.
2. Elegir proveedor **Google Drive**.
3. Pulsar **Conectar con Google** → autorizar en la pantalla de consentimiento (permiso de Drive).
4. Al volver, el panel muestra "Conectado como <email>". Ingresar el **Shared Drive ID** y guardar.
5. Pulsar **Probar conexión** → **Esperado**: éxito.
6. Crear un proyecto nuevo → **Esperado**: su carpeta se crea en el Shared Drive.

## Escenario 2 — Subir archivos (US2, FR-007..010)

1. Abrir un proyecto (con Drive activo), pestaña **Archivos**.
2. Pulsar **Subir archivo** (o arrastrar y soltar) y elegir un archivo.
3. **Esperado**: indicador de progreso; al terminar, el archivo aparece en el visor y se puede descargar.
4. Como usuario sin permiso de operar → **Esperado**: la subida se rechaza.
5. Subir un archivo con un nombre ya existente → **Esperado**: queda como copia adicional (no pisa el anterior).

## Escenario 3 — Ver/descargar (US3, FR-011)

1. En un proyecto con archivos en Drive, abrir el visor.
2. **Esperado**: se listan archivos/carpetas, se navega subcarpetas y se descargan.

## Escenario 4 — Archivar/eliminar (US4, FR-012)

1. Archivar un proyecto → **Esperado**: su carpeta se mueve/archiva en Drive sin perder archivos.
2. Eliminar un proyecto → **Esperado**: su carpeta se elimina del Drive.

## Escenario 5 — Storage opcional (FR-006)

1. Sin proveedor configurado → **Esperado**: subir/ver muestra "almacenamiento no disponible", sin romper.

## Checks automatizados

```bash
npm run lint
npm test        # resolución de provider (GDRIVE→provider/null), mapeo de config, parseo de respuestas Drive (fetch mockeado)
npm run build
```
