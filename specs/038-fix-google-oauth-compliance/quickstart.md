# Quickstart: Fix Google OAuth Compliance

## Prerrequisitos

- Proyecto genwork corriendo localmente (`npm run dev` en `:3010`)
- Variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` configuradas en `.env`
- Cuenta de Google con acceso a Google Cloud Console
- Un proyecto en Google Cloud Console con:
  - OAuth consent screen configurado (nombre, email de soporte)
  - Scope `https://www.googleapis.com/auth/drive` agregado
  - Email del admin como Test User (si es External + Testing)
  - OAuth Client ID tipo Web application creado
  - Redirect URI: `http://localhost:3010/api/admin/storage/google/callback`

## Validación del fix

### Escenario 1: Credenciales vacías → error claro
1. Quitar `GOOGLE_CLIENT_ID` de `.env`
2. Reiniciar la app
3. Ir a `/admin/storage`, elegir Google Drive, clic en "Conectar con Google"
4. **Esperado**: mensaje en el panel indicando que faltan credenciales (no redirige a Google)

### Escenario 2: Flujo OAuth exitoso
1. Configurar credenciales correctas en `.env`
2. Reiniciar la app
3. Ir a `/admin/storage`, elegir Google Drive
4. Verificar que se muestra la redirect URI (para comparar con Google Cloud Console)
5. Clic en "Conectar con Google"
6. Autorizar en Google
7. **Esperado**: vuelve a `/admin/storage?gdrive=connected`, muestra email conectado

### Escenario 3: Error access_denied (cancelar consentimiento)
1. Clic en "Conectar con Google"
2. Cancelar en la pantalla de Google
3. **Esperado**: vuelve a `/admin/storage` con mensaje "Se canceló la autorización..."

### Escenario 4: Error invalid_request (consent screen mal)
1. Usar credenciales de un proyecto de Google Cloud Console sin consent screen configurado
2. Clic en "Conectar con Google"
3. **Esperado**: mensaje accionable indicando verificar el consent screen

### Escenario 5: Guía visible
1. Ir a `/admin/storage`, elegir Google Drive
2. **Esperado**: guía de configuración visible (colapsable) con pasos de Google Cloud Console
