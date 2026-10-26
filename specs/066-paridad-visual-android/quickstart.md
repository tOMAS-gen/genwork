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
node scripts/paridad-web.mjs P07-detalle /works/<id> admin --scroll=800,1600
```

Cada llamada genera el par claro y oscuro. La sesión por rol queda en `.context/paridad-visual/auth-<rol>.json` (0600). Si el login cambia, borrá ese archivo.

## 3. Captura Android

```sh
scripts/paridad-android.sh ui "Proyectos"   # buscar elementos: texto @ x y (dp)
scripts/paridad-android.sh tap 28 76        # abrir el menú
scripts/paridad-android.sh cap P05-proyectos-admin   # claro y oscuro de lo que hay en pantalla
scripts/paridad-android.sh vista            # captura reducida para mirar
```

- La app sigue el tema del sistema y `cap` alterna el modo oscuro del emulador.
- Cambiar el tema recrea la pantalla y cierra los menús abiertos. `cap` vuelve a abrir la misma pantalla; revisá que la captura oscura muestre lo mismo que la clara.
- Si el menú lateral está abierto, el botón atrás puede cerrar la app. Para cerrar el menú, tocá su ✕.

## 4. Reglas del par

- La web y Android tienen que estar en la **misma ruta y el mismo estado**: misma sección activa, mismo recurso, mismo desplazamiento.
- Nombre: `Pxx-<slug>-<rol>-<tema>-390[-sN]-{web|android}.png`, en `.context/paridad-visual/antes/`.
- La barra de estado de Android (24 dp) no se compara.

## 5. Comparador

```sh
node scripts/mobile-evidence.mjs .context/paridad-visual/antes
open .context/paridad-visual/antes/index.html
```

Después de cada tanda, actualizá el estado de las filas en `inventario.md`.
