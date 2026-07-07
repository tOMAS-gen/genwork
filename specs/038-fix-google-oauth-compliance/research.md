# Research: Fix Google OAuth Compliance

## R1: Causa raíz del Error 400: invalid_request

**Decision**: El error se produce porque la app de Google Cloud Console no tiene el OAuth consent screen configurado correctamente para solicitar scopes sensibles como `https://www.googleapis.com/auth/drive`.

**Rationale**: Google requiere que toda app que pide scopes sensibles/restringidos tenga:
1. OAuth consent screen completado (nombre de app, email de soporte, logo opcional).
2. Scopes explícitamente agregados en la configuración del consent screen.
3. La app en uno de estos modos:
   - **Internal** (solo Google Workspace): todos los usuarios del dominio pueden usar la app.
   - **External + Testing**: solo hasta 100 test users explícitamente agregados.
   - **External + Published + Verified**: abierta al público (requiere revisión de Google, semanas).

Para genwork (app interna de taller), **Internal** o **External + Testing** son las opciones viables. La verificación formal no es necesaria.

**Alternatives considered**:
- Verificación formal de Google → descartada: proceso de semanas, requiere privacy policy, términos de servicio, video demo. Overkill para app interna.
- Scope más restringido (drive.file) → descartada: `drive.file` solo da acceso a archivos creados por la app, no permite listar Shared Drives ni operar sobre archivos subidos fuera de la app.
- Service account con domain-wide delegation → descartada: requiere Google Workspace admin y es más complejo. El flujo OAuth del admin ya implementado es correcto para el caso de uso.

## R2: Errores OAuth comunes y mapeo

**Decision**: Mapear los siguientes errores de Google a mensajes accionables:

| error (query param) | Causa | Mensaje en español |
|---------------------|-------|--------------------|
| `invalid_request` | Consent screen incompleto, redirect URI no coincide, o client_id mal | "Error de configuración OAuth: verificá que el OAuth consent screen esté completo en Google Cloud Console y que la URI de redirección coincida." |
| `access_denied` | El admin canceló el consentimiento o no es test user | "Se canceló la autorización, o tu cuenta no está como usuario de prueba en Google Cloud Console." |
| `invalid_scope` | El scope de Drive no está habilitado en el consent screen | "El permiso de Drive no está habilitado. Agregá el scope en Google Cloud Console > OAuth consent screen > Scopes." |
| `redirect_uri_mismatch` | La redirect URI enviada no coincide con la registrada | "La URI de redirección no coincide con la registrada en Google Cloud Console. Registrá: {expectedUri}" |
| (otro/genérico) | Error no mapeado | "Error de Google: {error}. Verificá la configuración en Google Cloud Console." |

**Rationale**: El callback actual (`callback/route.ts`) no intercepta errores de Google — solo maneja el código exitoso. Google redirige al callback con `?error=xxx&error_description=yyy` cuando falla.

**Alternatives considered**:
- Mostrar el error crudo de Google → descartada: es críptico y en inglés.
- Redirigir a una página de error genérica → descartada: pierde contexto de qué falló.

## R3: Redirect URI — mostrar en panel

**Decision**: Calcular y mostrar la redirect URI esperada en el panel de almacenamiento, para que el admin la copie a Google Cloud Console.

La URI es: `{origin}/api/admin/storage/google/callback`

En dev: `http://localhost:3010/api/admin/storage/google/callback`
En prod: `https://genwork.midominio.com/api/admin/storage/google/callback`

**Rationale**: El error más frecuente de OAuth es redirect_uri_mismatch. Mostrar la URI en el panel elimina la adivinanza.

## R4: Validación pre-vuelo

**Decision**: En el endpoint `authorize/route.ts`, validar ANTES de redirigir a Google:
1. `GOOGLE_CLIENT_ID` no vacío → error claro si falta.
2. `GOOGLE_CLIENT_SECRET` no vacío → error claro si falta (aunque no se usa en la URL de consentimiento, su ausencia garantiza que el callback va a fallar).

**Rationale**: Hoy, si el client_id está vacío, el endpoint redirige a Google con `client_id=` lo que produce un error opaco. Mejor fallar rápido con mensaje claro.

## R5: Guía de configuración — formato

**Decision**: Incluir una guía compacta inline en el panel de almacenamiento (colapsable o en tooltip/help text), con los pasos esenciales y enlace a Google Cloud Console.

**Rationale**: Una guía externa (README, wiki) requiere que el admin la busque. Inline es más accesible.

**Pasos de la guía**:
1. Ir a Google Cloud Console > APIs & Services > OAuth consent screen
2. Configurar: nombre de app, email de soporte
3. Agregar scope: `https://www.googleapis.com/auth/drive`
4. Si es External: agregar tu email como Test User
5. Ir a Credentials > Create OAuth Client ID (tipo Web application)
6. Agregar Authorized redirect URI: `{redirect_uri_mostrada}`
7. Copiar Client ID y Client Secret a las variables de entorno `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
8. Reiniciar la app y hacer clic en "Conectar con Google"
