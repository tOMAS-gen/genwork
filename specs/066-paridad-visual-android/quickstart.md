# Quickstart — regenerar un par web/Android

Procedimiento de [SPEC-comparativa.md](SPEC-comparativa.md). Las condiciones (390 × 844 dp @3x) están en [inventario.md](inventario.md).

## 1. Entorno (una vez por sesión)

```sh
bash scripts/mobile-dev.sh setup          # Postgres 5433, Nextcloud 8081, seed QA, pub get

# Next necesita un secreto de Auth.js. En QA se usa uno local, que no se versiona.
f=.context/paridad-visual/auth-secret
[ -f $f ] || (mkdir -p .context/paridad-visual && openssl rand -base64 32 > $f && chmod 600 $f)
AUTH_SECRET="$(cat $f)" bash scripts/mobile-dev.sh web     # en segundo plano

ANDROID_DEVICE=emulator-5554 bash scripts/mobile-dev.sh android   # en segundo plano
scripts/paridad-android.sh demo           # barra de estado fija
scripts/paridad-android.sh adb shell cmd alarm set-timezone America/Argentina/Buenos_Aires   # misma zona que la web
```

- **Cámara:** la cámara del emulador es la webcam real. Antes de abrir `/setup`, revocá el permiso (`adb shell pm revoke ar.genwork.mobile android.permission.CAMERA`) y tocá "No permitir" si lo vuelve a pedir. Ninguna captura puede mostrar la cámara.
- **Ingreso en la app:** tocá "Escribir dirección a mano", escribí `http://localhost:3010`, tocá "Continuar" y después "Entrar como Admin de prueba" en la pestaña de Chrome.
- **Espacio:** la APK de depuración pesa ~180 MB. Si la instalación falla por falta de espacio, liberá lugar en el emulador. Flutter desinstala la versión anterior antes de reintentar.

## 2. Captura web

Playwright no es dependencia del repo. Se usa una copia ya instalada y el Chrome del sistema:

```sh
export PLAYWRIGHT_DIR=$(dirname "$(find ~/.npm/_npx -maxdepth 3 -type d -name playwright -path '*node_modules*' | head -1)")
node scripts/paridad-web.mjs P05-proyectos / admin
node scripts/paridad-web.mjs P03-navegacion / admin --click="Abrir menú"
node scripts/paridad-web.mjs P01-acceso /login sinsesion --sin-sesion
node scripts/paridad-web.mjs P07-detalle /works/<id> admin --scroll=700,1400
node scripts/paridad-web.mjs P06-crear-proyecto / admin --click="Crear un proyecto,Nuevo proyecto"
node scripts/paridad-web.mjs P09-detalle-tarea /works/<id> admin "--click=sel:.task-text:has-text('Preparar los originales')" --scroll=1150
```

`--click` busca botones, enlaces, pestañas, ítems de menú o texto exacto. Con `sel:` usa un selector de Playwright, por ejemplo para un botón sin nombre único. Si la página web no pasa de 844 px de alto, no hace falta `--scroll`.

Cada llamada genera el par claro y oscuro. La sesión por rol queda en `.context/paridad-visual/auth-<rol>.json` (0600). Si el login cambia, borrá ese archivo.

## 3. Captura Android

```sh
scripts/paridad-android.sh ui "Proyectos"   # buscar elementos: texto @ x y (dp)
scripts/paridad-android.sh nav "Todos los proyectos"   # vuelve atrás si hace falta, abre el menú y toca el ítem
scripts/paridad-android.sh tap 28 76        # tocar en dp
scripts/paridad-android.sh cap P05-proyectos-admin       # claro y oscuro de lo que hay en pantalla
scripts/paridad-android.sh scroll 700       # desplaza 700 dp (en tramos, desde la mitad de la pantalla)
scripts/paridad-android.sh cap P05-proyectos-admin -s2   # desplazada
scripts/paridad-android.sh vista            # captura reducida para mirar
```

- **Marionette (debug):** la app arranca con el binding de Marionette. `mobile-dev.sh android` deja la URI del VM service en `.context/mobile-parity/vmservice.json` (cambia en cada arranque). Con esa URI, `mcp__marionette__connect` y después `get_interactive_elements`, `tap` por `ValueKey` (`drawer_open`, `deliveries_button`…), `scroll_to` y `hot_reload` para ver un cambio de Dart sin relanzar. La versión de `marionette_flutter` tiene que coincidir con la del MCP (0.7). Las capturas siguen saliendo con `cap`, que cambia el tema del sistema.
- Para tocar por texto desde zsh: `xy=$(scripts/paridad-android.sh ui | grep -E "^Texto" | head -1 | grep -oE '[0-9]+ [0-9]+$'); scripts/paridad-android.sh tap ${=xy}`.
- `cap` oculta el teclado si quedó abierto: la web no lo muestra.
- En Configuración, `ui` encuentra dos "Sistema": el chip de tema y la sección. Para la sección, usá la segunda coordenada.
- La app sigue el tema del sistema y `cap` alterna el modo oscuro del emulador.
- Cambiar el tema no cierra menús ni dialogs, pero revisá igual que la captura oscura muestre lo mismo que la clara.
- Si el menú lateral está abierto, el botón atrás puede cerrar la app. Para cerrar el menú, tocá su ✕.

## 4. Cambio de rol en Android

1. En el menú lateral, tocá "Cerrar sesión".
2. Cerrá también la sesión de Chrome en el emulador: `scripts/paridad-android.sh adb shell am start -a android.intent.action.VIEW -d http://localhost:3010/api/auth/signout com.android.chrome` y tocá "Sign out".
3. Volvé a la app (`adb shell monkey -p ar.genwork.mobile 1`), tocá el servidor y elegí "Entrar como …" con el rol que corresponda.
4. Para P01 (`/setup` sin servidores): cerrá la sesión, quitá el servidor en Servidores, capturá y volvé a cargar `http://localhost:3010`. Si Chrome todavía tiene la sesión de admin, el ingreso vuelve directo como admin.

## 5. Reglas del par

- La web y Android tienen que estar en la **misma ruta y el mismo estado**: misma sección activa, mismo recurso, mismo desplazamiento.
- Nombre: `Pxx-<slug>-<rol>-<tema>-390[-sN]-{web|android}.png`, en `.context/paridad-visual/antes/`.
- La barra de estado de Android (24 dp) no se compara.

## 6. Comparador

```sh
node scripts/mobile-evidence.mjs .context/paridad-visual/antes
open .context/paridad-visual/antes/index.html
```

Después de cada tanda, actualizá el estado de las filas en `inventario.md`.
