# Vínculo por QR y multi-servidor en la app móvil — diseño

Fecha: 2026-10-15 · Rama: `tOMAS-gen/Mobile-formato-de-coneccion-al-server`

## Objetivo

Hoy el primer inicio de la app móvil (Flutter, `mobile/`) pide escribir la URL del sistema y solo admite **un** servidor. Se quiere:

1. La web muestra un **QR de vinculación** que contiene únicamente la dirección del servidor (no credenciales).
2. El móvil, en el primer inicio, **escanea ese QR** en vez de tipear; luego sigue el login normal (Google PKCE).
3. El móvil guarda **varios servidores** (el usuario trabaja en ~22 lugares) y permite **cambiar de uno a otro sin cerrar sesión**. "Agregar servidor" vuelve a pedir un QR.

Éxito: cambiar de lugar = 2 toques, sin re-login; vincular un servidor nuevo = escanear QR + login.

## Decisiones cerradas

- QR visible para **todo usuario interno** (no es secreto: solo la dirección).
- Página web nueva **`/settings/movil`**, junto a `/settings/claude`.
- Multi-servidor con **lista de perfiles en el móvil** (enfoque A). Sin cambios de backend más allá de un campo en `/info`.
- Descartados: re-login al cambiar (B), cuenta central que agrupa servidores (C, YAGNI).
- Se mantiene la **escritura manual de URL** como respaldo (emulador, cámara denegada).

## Estado actual relevante

- `mobile/lib/core/config/server_config_store.dart`: un solo `server_url` en SharedPreferences.
- `mobile/lib/core/auth/token_store.dart`: un solo token + usuario en SecureStorage (`auth_token`, `auth_user`).
- `mobile/lib/core/auth/session_controller.dart`: `setServer`, `changeServer` (borra todo), `login`, `logout`, `handleUnauthorized`.
- `mobile/lib/core/router/auth_redirect.dart`: `NeedsServer` → setup, `SignedOut` → login.
- `mobile/lib/features/setup/server_setup_screen.dart`: campo de texto + validación contra `GET /api/auth/mobile/info`.
- `mobile/lib/features/auth/login_screen.dart:74`: único llamador de `changeServer()`.
- `src/app/api/auth/mobile/info/route.ts`: devuelve `{app, mobileApi, auth{...}}`.
- Web: sin lib QR; móvil: sin lib de escaneo.

## Diseño

### 1. Web — `/settings/movil`

- Ruta `src/app/(main)/settings/movil/page.tsx`, mismo patrón y acceso que `settings/claude` (cualquier usuario interno).
- QR generado en el servidor como SVG (dependencia `qrcode`) con el payload:
  `genwork://connect?server=<origen>` (valor URL-encoded). **El QR solo pasa la URL del servidor**: nada de nombre ni credenciales; el nombre visible lo da `/info`.
- Origen: se resuelve al implementar (variable de entorno de URL pública si existe; si no, el `host` de la request). Debe ser el origen público real, nunca `localhost` en producción.
- También se muestra la URL en texto con botón "Copiar" (respaldo manual) y un enlace en el menú de ajustes.
- `/api/auth/mobile/info` suma `name` (nombre del sistema). Campo opcional, compatible hacia atrás con apps viejas.

### 2. Móvil — modelo y almacenamiento

- `ServerProfile { id, url, name, userSummary? }`. `id` = hash estable del origen normalizado.
- `ServerRegistry` reemplaza a `ServerConfigStore`:
  - perfiles + `activeId` en SharedPreferences (JSON);
  - token y usuario **por perfil** en SecureStorage (`auth_token:<id>`, `auth_user:<id>`).
- `TokenStore` pasa a recibir el `id` del perfil (read/write/clear por perfil).
- **Migración** al primer arranque: si existe el `server_url` viejo (y `auth_token` global), se crea el primer perfil, se copian token/usuario a las claves por perfil y se borran las viejas. No se pierde ninguna sesión actual.
- `SessionController`:
  - `addServer(input)`: normaliza, valida con `/info`, guarda perfil (si ya existe, solo lo activa), pasa a `SignedOut`/`SignedIn` según tenga token.
  - `switchServer(id)`: cambia `activeId`, carga su token; sin token → login de ese servidor.
  - `removeServer(id)`: borra perfil y token (revoca en servidor si hay red, sin bloquear si falla). Si era el activo, pasa a otro o a `NeedsServer`.
  - `logout` y `handleUnauthorized` afectan solo el perfil activo (el perfil queda guardado, sin token).
  - `changeServer()` se elimina; `login_screen` ofrece "Cambiar de servidor" → selector.
- `NeedsServer` = lista de perfiles vacía. `authRedirect` casi no cambia; se agrega ruta de agregar servidor accesible estando logueado.

### 3. Móvil — UI

- **Instrucciones en la pantalla del escáner:** debajo del visor, pasos para mostrar el QR en la web (abrir genwork en una computadora › Configuración › App móvil › apuntar la cámara). Se ocultan en el modo de escritura manual, que explica dónde está la dirección.
- **Setup / Agregar servidor:** escáner de cámara (`mobile_scanner`) como acción principal; "Escribir dirección a mano" como secundaria. Acepta `genwork://connect?...` o URL plana. Parseo en una función pura `parseConnectPayload`.
- **Deep link `genwork://connect`:** abrir el QR con la cámara nativa abre la app y entra al mismo flujo (el scheme `genwork` ya existe para el callback de login; se agrega el host `connect`).
- **Selector de servidor** (en Cuenta/Más y accesible desde login): lista con nombre, URL, usuario y marca del activo. Tocar = cambiar; "Agregar servidor" = escáner; eliminar con confirmación.
- Permisos: `NSCameraUsageDescription` (iOS) y `CAMERA` (Android). Cámara denegada → cae a escritura manual con aviso.
- Pantallas las implementa Codex siguiendo el sistema de diseño existente; el núcleo (registry, migración, controller, parseo) lo hace Claude.

### 4. Errores y bordes

- QR inválido o de otro sistema → "No es un QR de genwork" (valida con `/info`: `app == "genwork"`).
- Servidor duplicado → se activa el existente, sin duplicar.
- Servidor caído al cambiar → entra con la sesión guardada; los errores de red se manejan como hoy.
- **Riesgo principal:** al cambiar de servidor hay que invalidar todo estado Riverpod con datos (repositorios, caché, conexión `core/live`) para no mezclar datos de dos sistemas. Se resuelve haciendo que esos providers dependan de `(serverUrl, token)` de la sesión activa y se reconstruyan al cambiar, con test que lo verifique.
- `http://` solo permitido como hoy (redes locales/desarrollo); el QR de producción usa `https`.

### 5. Testing

- Unit: `parseConnectPayload`, `normalizeServerUrl`, migración del storage viejo, `ServerRegistry` (alta/duplicado/baja/activo), `authRedirect`.
- Provider: cambiar de servidor reconstruye repositorios y cierra la conexión live anterior.
- Widget: setup con payload simulado, selector de servidores.
- Web: render de la página y payload exacto del QR.
- E2E manual: escanear con teléfono real; alternar entre dos servidores locales sin re-login.

## Fuera de alcance

- Permisos o roles distintos por servidor (cada servidor ya resuelve los suyos).
- Sincronizar la lista de servidores entre dispositivos.
- QR con credenciales o auto-login.
