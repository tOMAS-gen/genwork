# Login nativo con Google y atajo de desarrollo (app móvil) — diseño

Fecha: 2026-10-15 · Rama: `tOMAS-gen/Mobile-formato-de-coneccion-al-server`
Complementa: `2026-10-15-vinculo-qr-multiservidor-design.md` (QR + multi-servidor). Ese spec no cambia.

## Objetivo

Hoy el login móvil abre el navegador del sistema (PKCE → `/login` web → Google). Se quiere:

1. **Google nativo dentro de la app**, con el selector de cuentas del sistema, sin abrir el navegador.
2. **Atajo de desarrollo** que saltea Google (y el navegador) para probar sin credenciales.
3. La **web sigue igual**: el login con Google de NextAuth no cambia de comportamiento.

## Restricción que define el diseño

Cada servidor (hoy ~22) tiene **su propio proyecto de Google Cloud / `GOOGLE_CLIENT_ID`**. El Google nativo directo no escala así: en iOS el esquema de URL queda fijo en `Info.plist` (una versión de la app por cada servidor nuevo) y en Android habría que registrar la app (SHA-1) en cada proyecto.

**Decisión:** un **proyecto de Google Cloud único solo para la app móvil**, con clientes Android, iOS y web. Sus IDs van dentro de la app (iguales para todos los servidores). Un ID token de Google lo puede verificar cualquier servidor, sin importar su proyecto propio; cada servidor solo **acepta como audiencia** el cliente web del proyecto móvil (`MOBILE_GOOGLE_CLIENT_IDS`). La autorización sigue siendo la de cada servidor (lista de correos permitidos), así que un correo no autorizado no entra.

## Decisiones cerradas

- Servidores sin `MOBILE_GOOGLE_CLIENT_IDS` (o versiones viejas) siguen funcionando con el flujo de navegador actual: la app cae a él. Esto permite migrar los servidores de a uno.
- Endpoints viejos `/api/auth/mobile/start` y `/token` **no se tocan** (apps ya instaladas).
- Atajo de dev con **doble llave**: el servidor solo lo anuncia/acepta con `DEV_AUTH=true` y la app solo lo muestra en build debug (`kDebugMode`).
- La regla de acceso se **extrae** del callback `signIn` de NextAuth a una función compartida; el callback la usa con comportamiento idéntico.

## Servidor

### 1. Regla de acceso compartida — `src/server/google-access.ts`

`authorizeGoogleAccess({ email, name, image }): Promise<{ ok: true; userId: string } | { ok: false }>` con exactamente la lógica hoy inline en `callbacks.signIn` de `src/server/auth.ts` para el proveedor Google:
- normaliza el correo; vacío → `{ok:false}`;
- usuario existente: `canExistingUserSignIn` contra `accessConfig` + `allowedEmail`; si pasa, actualiza `image` y `firstLoginAt` (solo la primera vez);
- usuario nuevo: bootstrap (primer usuario → `SUPERADMIN`, crea `accessConfig` y su `allowedEmail`) o `isEmailAllowed`; crea el usuario (`MEMBER` salvo bootstrap, `firstLoginAt` ahora) y encola `CREATE_USER`.

`auth.ts` conserva el caso `dev` y pasa a: `const r = await authorizeGoogleAccess(...); return r.ok ? true : "/login?error=AccessDenied";`. **Cobertura obligatoria con tests** (existente permitido/denegado, nuevo permitido/denegado, bootstrap, correo vacío) escritos *antes* del refactor contra la lógica actual, para garantizar que la web no cambia.

### 2. Verificación del ID token — `src/server/google-id-token.ts`

`verifyGoogleIdToken(idToken, audiences): Promise<{ email: string; name: string; picture?: string } | null>` usando `google-auth-library` (`OAuth2Client.verifyIdToken`): valida firma, `iss` de Google, expiración, `aud ∈ audiences` y exige `email_verified === true`. Devuelve null ante cualquier falla. `audiences` sale de `MOBILE_GOOGLE_CLIENT_IDS` (lista separada por comas, vacía = nativo deshabilitado).

### 3. Emisión del token móvil

Se extrae de `redeemAuthCode` la creación de `mobileSession` + token a `issueMobileSession(userId, deviceName): Promise<{ token; user: MobileUser }>` (misma forma que devuelve `/token`). `redeemAuthCode` pasa a usarla (comportamiento idéntico).

### 4. `POST /api/auth/mobile/google`

Body `{ idToken, deviceName }` (zod). Flujo: audiencias vacías → 404; `verifyGoogleIdToken` null → 401 `INVALID_TOKEN`; `authorizeGoogleAccess` no ok → 403 `ACCESS_DENIED` («Tu correo no tiene acceso a este sistema.»); `canUseMobileApp(rol)` falso → 403 `FORBIDDEN`; si todo ok → `issueMobileSession` → `{ token, user }`.

### 5. `POST /api/auth/mobile/dev`

Body `{ user, deviceName }`. Sin `DEV_AUTH=true` → **404** (como si no existiera). Con él: busca `DEV_USERS[user]`, hace el mismo `upsert` que el `authorize` dev de NextAuth y responde `issueMobileSession` (`{ token, user }`). Clave desconocida → 400.

### 6. `GET /api/auth/mobile/info`

Suma, sin romper el contrato actual:
- `google: { native: boolean }` — true si `MOBILE_GOOGLE_CLIENT_IDS` no está vacía;
- `devLogin: [{ key, label }]` — solo con `DEV_AUTH=true`, tomado de `DEV_USERS` (`key` = `admin|miembro|lector|cliente`, `label` = nombre); ausente o vacío en cualquier otro caso.

## App móvil

- Dependencia `google_sign_in`. Configuración de build: `--dart-define=GOOGLE_SERVER_CLIENT_ID=<cliente web del proyecto móvil>`; en iOS `GIDClientID` + esquema de URL en `Info.plist`; en Android el cliente Android (paquete + SHA-1 de debug y release) en el proyecto móvil. Si el define está vacío, el nativo queda deshabilitado y se usa el navegador.
- `ServerInfo` (ya devuelto por `checkServer`) suma `googleNative` y `devUsers`. La pantalla de login lee el `ServerInfo` del servidor activo.
- `AuthRepository.loginWithGoogle()`: obtiene el ID token del selector nativo (con `serverClientId`) y hace `POST /api/auth/mobile/google`; cancelar el selector = `LoginCancelled`; 403 → mensaje de acceso denegado.
- `AuthRepository.loginDev(String key)`: `POST /api/auth/mobile/dev`.
- Pantalla de login: «Ingresar con Google» elige el camino por servidor — nativo si `googleNative` y hay `GOOGLE_SERVER_CLIENT_ID`; si no, el navegador actual. Debajo, solo con `kDebugMode` **y** `devUsers` no vacío: sección «Ingreso de prueba» con un botón por usuario.
- El resto (QR, lista de servidores, token por perfil) no cambia: `SessionController.login()` recibe el `StoredSession` de cualquiera de los tres caminos.

## Errores y bordes

- ID token vencido, de otra audiencia o con correo no verificado → 401, la app muestra «No se pudo verificar tu cuenta de Google. Volvé a intentar.».
- Correo fuera de la lista del servidor → 403 «Tu correo no tiene acceso a este sistema.» (mismo criterio que la web).
- Servidor con `DEV_AUTH=true` y app **release** → no hay botones de prueba (la llave de la app); servidor **sin** `DEV_AUTH` → el endpoint no existe aunque alguien lo llame (llave del servidor).
- Cambiar de servidor entre uno nativo y uno con navegador: el camino se decide en cada login según el `/info` de ese servidor.
- Google Play Services ausente / selector sin cuentas → error legible y el navegador queda como alternativa solo si el servidor lo permite (`googleNative` false); no se mezcla automáticamente.

## Testing

- Servidor (vitest): `authorizeGoogleAccess` (todos los casos, antes y después del refactor), `verifyGoogleIdToken` (con verificador inyectado: audiencia mala, correo sin verificar, vencido, ok), `/mobile/google` (404 sin audiencias, 401, 403, 200 con forma `{token,user}` y sesión creada), `/mobile/dev` (404 sin `DEV_AUTH`, 400, 200, upsert del usuario), `/info` (campos nuevos presentes/ausentes según env), `redeemAuthCode` sin regresión.
- Móvil: `AuthRepository.loginWithGoogle/loginDev` con Dio simulado; pantalla de login con `ServerInfo` simulado (nativo vs. navegador, botones de dev solo en debug y con `devUsers`); el camino de Google nativo se inyecta con un `GoogleIdTokenProvider` falso (el selector real no corre en tests).
- Manual: login real con Google en teléfono físico contra un servidor con `MOBILE_GOOGLE_CLIENT_IDS`; login por navegador contra uno sin ella; atajo de dev en debug.

## Fuera de alcance

- Crear el proyecto de Google Cloud móvil y sus clientes, y cargar `MOBILE_GOOGLE_CLIENT_IDS` en cada servidor (lo hace el dueño; hasta entonces todo funciona con navegador y atajo de dev).
- Eliminar los endpoints o el flujo de navegador (se mantienen como respaldo).
- Cambios al login web.
