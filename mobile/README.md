# genwork móvil

App Flutter (Android + iOS) de genwork. Plan y estado: [`PLAN.md`](PLAN.md).
Reglas para agentes: [`AGENTS.md`](AGENTS.md).

## Cómo funciona el ingreso

No hay pantalla de login propia: el ingreso es siempre el login web del
servidor, abierto en el navegador del sistema.

1. **Vincular el servidor**: en la web, **Configuración › App móvil** muestra un
   QR con la dirección del sistema (sin credenciales). La app lo escanea en el
   primer inicio (debajo del visor está «Escribir dirección a mano»), lo valida
   contra `GET /api/auth/mobile/info` y lo guarda en el acto. El QR también abre
   la app si se lee con la cámara del teléfono (`genwork://connect?server=…`,
   siempre con confirmación).
2. **Ingresar**: al vincular o elegir un servidor sin sesión se abre directo el
   login web de ese servidor (Google + lista de acceso) en el navegador. Al
   ingresar, el servidor vuelve a la app con `genwork://auth?code=…` y la app
   canjea ese código (PKCE) por un token propio, guardado en el Keychain /
   Keystore, y entra a Mi día. Si se cierra el navegador o el login falla (con
   un aviso), el servidor queda guardado «Sin sesión» en la lista de servidores.
3. **Lista de servidores** (drawer › «Cambiar de servidor», o **Mi cuenta ›
   Servidores**): muestra cada sistema vinculado con su estado («Sesión
   iniciada · email» o «Sin sesión») y marca el activo. Tocar uno con sesión
   entra sin volver a ingresar; uno sin sesión abre su login en el navegador.
   Cada servidor tiene su propia sesión, así que puede haber varios iniciados a
   la vez. «Agregar servidor» pide otro QR; quitar uno cierra su sesión y lo
   olvida.
4. **Sin sesión** la app cae en la lista de servidores. Al arrancar sin token, o
   si el servidor rechaza el token (401), el login del servidor activo se abre
   solo una vez (salvo un 401 dentro de los 30 s siguientes a ingresar, para no
   entrar en bucle). **Cerrar sesión** revoca el token solo del servidor activo
   y lleva a la lista sin abrir el navegador.

Variables del servidor relacionadas: `NEXTAUTH_URL` (o `AUTH_URL`) debe ser la
dirección pública del sistema, porque es la que lleva el QR. `SYSTEM_NAME` es
opcional: nombre que muestra la app para el servidor (por defecto, el host).

La app admite administrador, miembro, cliente y lector. Cada rol conserva los
permisos de la web: los clientes entran al portal y los lectores al tablero de
consulta. El espacio de trabajo interno es para administrador y miembro.

## Comparar web y app (M00–M21)

Desde la raíz, en terminales independientes:

```sh
bash scripts/mobile-dev.sh setup    # base local genwork_mobile_parity y fixtures
bash scripts/mobile-dev.sh web      # puerto de Conductor o 3010
bash scripts/mobile-dev.sh android  # adb reverse + Flutter con hot reload
node scripts/mobile-inventory.mjs   # todas las URL web/API
node scripts/mobile-check.mjs       # PKCE, roles y revocación contra la API
node scripts/mobile-evidence.mjs    # índice de capturas en .context/mobile-parity/
```

Ingresá en la app la URL que imprime el comando Android. Los botones de prueba
web permiten elegir admin/miembro/cliente/lector sin Google. El entorno usa una
base QA separada; el seed es idempotente y conserva las ediciones posteriores.
La guía de tareas está en `docs/web-mobile-implementation-guide.md`.

## Desarrollo

Requisitos: Flutter 3.44+, Android SDK; para iOS, Xcode completo.

```sh
cd mobile
flutter pub get
dart analyze
flutter test
flutter run
```

### Apuntar la app a un servidor de desarrollo

El teléfono o emulador tiene que poder llegar al servidor, y `AUTH_URL` tiene que
ser **esa misma URL**: el login redirige con ella.

| Dispositivo | URL en la app | Servidor |
|---|---|---|
| Emulador Android | `http://10.0.2.2:3010` | `AUTH_URL=http://10.0.2.2:3010 npm run dev` |
| Simulador iOS | `http://localhost:3010` | `npm run dev` (con el `AUTH_URL` de siempre) |
| Teléfono en la LAN | `http://192.168.x.x:3010` | `AUTH_URL=http://192.168.x.x:3010 npx next dev -H 0.0.0.0 -p 3010` |

Con `DEV_AUTH=true` el login web ofrece usuarios de prueba (sin Google). El
usuario "Lector" es rechazado a propósito.

`http://` solo se permite en builds de debug (Android) y para la red local (iOS).
En producción, siempre `https://`.

### UI y recursos de marca

Los tokens viven en `lib/core/theme/app_theme.dart`. Montserrat y Roboto Mono
se distribuyen con la app, junto a sus licencias. El logo proviene de
`../public/icon-192.png`.

```sh
# Verificaciones, incluyendo capturas con datos de prueba en ../.context/
dart analyze
flutter test --dart-define=UI_PREVIEWS=true

# Regenerar íconos/splash al actualizar la marca o la configuración del pubspec
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

La versión visible en Mi cuenta debe acompañar la versión de `pubspec.yaml`
al preparar una publicación. QA de iOS y lectores de pantalla: ver `PLAN.md`.

La navegación principal ahora usa un drawer lateral, accesible desde el botón de
menú de cada sección. El estado de las secciones se conserva al navegar. La
paridad restante con el menú y funciones de la web se implementa por pasos en
`PLAN.md`. Las capturas actuales son `../.context/drawer-light.png` y
`../.context/drawer-dark.png`.
