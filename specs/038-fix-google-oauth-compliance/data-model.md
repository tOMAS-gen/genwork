# Data Model: Fix Google OAuth Compliance

## Entidades afectadas

No se crean ni modifican entidades en la base de datos. El modelo existente (`AccessConfig.storageConfig` JSON, `AccessConfig.storageProvider` enum) ya cubre todo lo necesario.

## Cambios de interfaz

### Endpoint `GET /api/admin/storage/google/authorize`

**Antes**: Redirige a Google sin validar credenciales. Si `GOOGLE_CLIENT_ID` está vacío, redirige con `client_id=` y Google devuelve error opaco.

**Después**: Valida `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` antes de redirigir. Si faltan, redirige a `/admin/storage?gdrive=error&detail=<mensaje>` con mensaje claro.

### Endpoint `GET /api/admin/storage/google/callback`

**Antes**: Solo maneja el caso exitoso (`?code=xxx`). Si Google envía `?error=xxx`, se cae al caso de "no code" con mensaje genérico.

**Después**: Intercepta `?error=xxx` de Google antes de intentar intercambiar el code. Mapea errores conocidos a mensajes en español. Redirige con `?gdrive=error&detail=<mensaje_mapeado>`.

### Panel de almacenamiento (`/admin/storage`)

**Antes**: Muestra solo "Conectar con Google" y un texto genérico de ayuda.

**Después**: Agrega:
- Redirect URI calculada (para copiar a Google Cloud Console).
- Guía colapsable de configuración de Google Cloud Console.
- Mensajes de error mapeados (ya se muestran por query params, solo cambia el contenido del `detail`).
