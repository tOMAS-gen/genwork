# genwork móvil

App Flutter (Android + iOS) de genwork. Plan y estado: [`PLAN.md`](PLAN.md).
Reglas para agentes: [`AGENTS.md`](AGENTS.md).

## Cómo funciona el ingreso

1. **Primer inicio**: la app pide la URL del sistema (ej. `work.gen.net.ar`). La
   valida contra `GET /api/auth/mobile/info` y la guarda.
2. **Ingresar con Google**: abre el login web del servidor en el navegador del
   sistema. Al ingresar, el servidor vuelve a la app con `genwork://auth?code=…`
   y la app canjea ese código (PKCE) por un token propio, guardado en el
   Keychain / Keystore.
3. **Cerrar sesión** revoca el token en el servidor. "Cambiar servidor", en el
   login, vuelve al paso 1.

Solo pueden usar la app las cuentas internas (administrador y miembro). Las
cuentas de cliente y de lector siguen en la web.

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
