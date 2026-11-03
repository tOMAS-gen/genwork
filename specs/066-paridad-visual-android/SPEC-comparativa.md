# Spec: `comparativa` — banco de comparación web móvil ↔ Android

Estado: **aprobada** el 2026-10-25, con las respuestas a las preguntas abiertas incorporadas. Módulo 1 de [MAP.md](MAP.md). Fecha: 2026-10-25.

## Objetivo

Que cada pantalla de genwork tenga un par de capturas web/Android comparable, para que `paridad-visual` pueda decir "esto es distinto" sin dudar de si la diferencia viene del ancho, los datos, el rol o el tema.

Quién lo usa: el agente y el usuario cuando trabajan `paridad-visual`, `auditoria-premium` y `bocetos-premium`. Las capturas Android de este banco son también la imagen de referencia de `/imagegen`.

Este módulo **no cambia código de la app**, ni web ni Flutter. Entrega inventario, procedimiento y capturas "antes".

### Historias

- Como agente, abro el inventario, elijo P-xx y sé qué ruta abrir en cada plataforma, con qué usuario y con qué recurso.
- Como usuario, abro el comparador y veo, pantalla por pantalla, la web y Android lado a lado, en claro y oscuro.
- Como agente de una fase posterior, puedo regenerar un par con el mismo procedimiento y obtener una captura equivalente.

## Supuestos

1. El emulador es el AVD `Pixel_9a`, que ya tiene un override de 1170 × 2532 px a densidad 480. Eso da **390 × 844 dp a 3x**, y la web se emula igual: 390 × 844 CSS px, DPR 3, en modo táctil y móvil. (Antes se esperaban ~412 dp; al medir, se mantuvo el override.)
2. Las capturas web se hacen con `scripts/paridad-web.mjs`: Playwright tomado de la caché de npx más el Chrome del sistema, sin sumarlo al repo. Chrome DevTools MCP queda descartado porque otra sesión tiene su perfil tomado. Las capturas Android se hacen con `scripts/paridad-android.sh` (adb + uiautomator). La app de genwork todavía no tiene el binding de Marionette (N10 de `mobile/PLAN.md`).
3. Los datos son los de la base QA `genwork_mobile_parity` sembrada por `scripts/mobile-seed.mjs`. Las dos plataformas apuntan al mismo servidor (`localhost:3010`, `adb reverse`).
4. Roles: `admin@test.local` (SUPERADMIN) para todo, porque ve todas las pantallas. Además, el portal (P33–P34) como `cliente` y la TV (P35) como `lector`. No se captura como miembro. La TV se captura al ancho del celular. Adaptar la app a la TV es una idea para más adelante (ver MAP.md).
5. Las capturas son locales y no se versionan (`.context/` está excluido). Lo que se commitea es el inventario y el procedimiento.

## Inventario provisional

La tarea 1 lo valida contra `find src/app -name page.tsx` (32 páginas) y `mobile/lib/core/router/routes.dart`, y lo pasa a [inventario.md](inventario.md) con una columna de estado por captura. "Solo Android" se compara con el patrón web más parecido. Las pantallas web sin equivalente en Android se marcan **"falta en Android"**: acá se captura solo la web y `paridad-visual` crea la pantalla.

| P | Pantalla | Web | Android | S | M |
|---|---|---|---|---|---|
| P01 | Acceso | `/login` | `/setup`, login | S01 | M03 |
| P02 | Servidores (solo Android) | patrón `/login` | `/servers`, `/servers/add` | S02 | M03 |
| P03 | Navegación | sidebar/drawer web | drawer | S04 | M03 |
| P04 | Mi día | `/references` | `/my-day` | S05 | M04 |
| P05 | Proyectos | `/` | `/works` | S06 | M05 |
| P06 | Crear/editar proyecto | dialog en `/` | dialog en `/works` | S07 | M05 |
| P07 | Detalle de proyecto | `/works/[id]` | `/works/:id` | S08 | M06 |
| P08 | Plantillas | `/?filter=templates` | `/templates` | S09 | M08 |
| P09 | Detalle de tarea | detalle en proyecto | pantalla de tarea | S10 | M07 |
| P10 | Tablero | `/board` | `/board` | S11 | M10 |
| P11 | Sectores | `/sectors` | `/sectors` | S12 | M09 |
| P12 | Detalle de sector | `/sectors/[id]` | `/sectors/:id` | S12 | M09 |
| P13 | Grupos | `/groups` | `/groups` | S13 | M11 |
| P14 | Detalle de grupo | `/groups/[id]` | `/groups/:id` (+ etiquetas, clientes) | S13 | M11 |
| P15 | Notas | `/notes` | `/notes` | S14 | M12 |
| P16 | Nota | `/notes/[id]` | `/notes/:id` | S14 | M12 |
| P17 | Documento del proyecto | pestaña Documentos | `/works/:id/document` | S14 | M12 |
| P18 | Archivos del proyecto | pestaña Archivos | `/works/:id/files` | S15 | M13 |
| P19 | Actividad y clientes del proyecto | pestañas de `/works/[id]` | `/works/:id/activity`, `/clients` | S21 | M17 |
| P20 | Materiales | `/materials` | a confirmar | S16 | — |
| P21 | Recordatorios | `/reminders` | `/more/reminders` (+ alta, detalle) | S17 | M14 |
| P22 | Notificaciones | campanita web | `/more/notifications`, `/notification-settings`, `/due-today` | S17 | — |
| P23 | Cuenta y más | `/settings` | `/more`, `/more/account` | S18 | M15 |
| P24 | Conexiones | `/settings/claude`, `/settings/movil` | a confirmar | S19 | — |
| P25 | Administración | `/admin` | `/more/settings` | S20 | M16 |
| P26 | Usuarios y acceso | `/admin/users`, `/admin/access` | `module/users`, `module/access` | S20 | M16 |
| P27 | Clientes | `/admin/clients` | `module/clients` | S21 | M16 |
| P28 | Etiquetas y etapas | `/admin/labels`, `/admin/stages` | `catalog/labels`, `catalog/stages` | S22 | M16 |
| P29 | Estados de tarea | `/admin/task-statuses` | `catalog/statuses` | S23 | M16 |
| P30 | Recordatorios (admin) | `/admin/reminders` | `module/reminders` | S24 | M16 |
| P31 | Integraciones | `/admin/storage`, `/admin/genstock`, `/admin/mcp` | `module/storage`, `module/mcp`; genstock a confirmar | S25 | M16 |
| P32 | Errores | `/admin/errors`, `/admin/errors/[id]` | `module/errors`, `errors/:id` | S26 | M16 |
| P33 | Portal | `/portal` | `/portal` | S27 | M18 |
| P34 | Proyecto en portal | `/portal/works/[id]` | `/portal/works/:id` | S27 | M18 |
| P35 | TV | `/tv` | `/tv` | S28 | M19 |

## Reglas de captura

- **Ancho:** el ancho y el alto lógicos medidos en el emulador, iguales en las dos plataformas. Se anotan una vez en `inventario.md`.
- **Tema:** claro y oscuro elegidos explícitamente, no "sistema". Zoom del navegador al 100%, texto de Android al 100%.
- **Encuadre:** el viewport desde arriba. Si la pantalla es larga, capturas extra desplazadas (`-s2`, `-s3`) hasta el mismo elemento en las dos plataformas.
- **Barra de estado de Android:** en modo demo (`sysui_demo_allowed`), con la hora fija, para que no meta ruido. Se compara solo el contenido debajo de la barra.
- **Estado:** este módulo captura el estado "con datos". Vacío, carga y error se capturan en `paridad-visual`, pantalla por pantalla.
- **Nombre:** `Pxx-<slug>-<rol>-<tema>-<ancho>[-sN]-{web|android}.png`, por ejemplo `P05-proyectos-admin-dark-412-web.png`. El comparador arma los pares por ese sufijo.
- **Carpeta:** `.context/paridad-visual/antes/`. Más adelante `paridad-visual` usa `despues/` y `bocetos-premium` usa `bocetos/`.
- **Privacidad:** solo datos semilla. Nada de tokens, cookies, correos reales ni contenido de producción en pantalla.

## Comandos

```sh
# Entorno (una terminal por comando, desde la raíz)
bash scripts/mobile-dev.sh setup      # Postgres 5433 + Nextcloud 8081 + seed QA + pub get
bash scripts/mobile-dev.sh web        # Next en :3010 contra genwork_mobile_parity
~/Library/Android/sdk/emulator/emulator -avd Pixel_9a
bash scripts/mobile-dev.sh android    # adb reverse + flutter run; VM service en .context/mobile-parity/vmservice.json

# Medir el ancho lógico del emulador
adb -s emulator-5554 shell wm size
adb -s emulator-5554 shell wm density

# Barra de estado fija
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0930

# Comparador HTML de una carpeta (cambio de este módulo: aceptar la carpeta como argumento)
node scripts/mobile-evidence.mjs .context/paridad-visual/antes

# Validar el inventario contra las rutas reales
node scripts/mobile-inventory.mjs
```

## Estructura del proyecto

```
specs/066-paridad-visual-android/
  MAP.md                    mapa de capacidades (aprobado)
  SPEC-comparativa.md       esta spec
  inventario.md             P-xx con rutas, rol, recurso semilla y estado de captura (se crea acá)
  quickstart.md             procedimiento paso a paso para regenerar un par (se crea acá)
scripts/mobile-evidence.mjs comparador; pasa a aceptar la carpeta como argumento
.context/paridad-visual/    capturas locales, sin versionar
  antes/  despues/  bocetos/
```

## Estilo de código

Hay un solo cambio de código: `scripts/mobile-evidence.mjs` toma la carpeta como argumento opcional y sin argumento sigue usando `.context/mobile-parity`. Respeta el estilo del script actual (ESM, `await` de primer nivel, sin dependencias):

```js
const root = path.resolve(process.argv[2] ?? '.context/mobile-parity');
```

Los documentos van en castellano rioplatense, con tablas cortas y los mismos IDs (P/S/M) en todas partes.

## Estrategia de pruebas

- **Script:** se corre sobre `.context/mobile-parity` sin argumento y sobre `antes/` con argumento, y en los dos casos tiene que generar `index.html`. No hay suite para estos scripts y no se agrega.
- **Inventario:** cada `page.tsx` y cada ruta de `routes.dart` aparece en alguna fila P-xx o queda marcada como excluida con motivo.
- **Capturas:** el comparador solo muestra sin pareja las imágenes de pantallas marcadas "falta en Android". Cada par usa el ancho medido, que se puede comprobar con las dimensiones del PNG divididas por el DPR.
- No se corren `flutter test`, `vitest` ni build, porque no cambia código de la app.

## Límites

- **Siempre:** usar solo `genwork_mobile_parity` · usar el mismo usuario, recurso, tema y ancho en cada par · nombrar según la regla · actualizar el estado en `inventario.md` · cerrar sesiones de prueba al terminar.
- **Preguntar antes:** agregar fixtures al seed más allá de lo que falte para mostrar una pantalla · sumar dependencias (Playwright u otras) · cambiar de AVD · capturar con un rol distinto a los del supuesto 4.
- **Nunca:** correr seed o `db push` contra otra base · modificar la web o la app Flutter en este módulo · commitear capturas · mostrar tokens o datos reales.

## Criterios de éxito

1. `inventario.md` cubre las 32 páginas web y todas las rutas de `routes.dart`, cada una en una fila P-xx o excluida con motivo. Las filas "a confirmar" quedan resueltas.
2. El ancho y el alto lógicos medidos, y el DPR, están anotados, y son los mismos en todas las capturas web.
3. Cada P-xx con equivalente en las dos plataformas tiene un par claro y un par oscuro en `antes/`, más los desplazados que hagan falta. Cada pantalla "falta en Android" tiene sus capturas web en claro y oscuro.
4. `node scripts/mobile-evidence.mjs .context/paridad-visual/antes` genera el comparador. Las únicas imágenes sin pareja son las de pantallas "falta en Android", que están listadas en `inventario.md`. El comando sin argumento sigue funcionando como antes.
5. `quickstart.md` permite que otra sesión regenere un par cualquiera sin preguntar nada.

## Decisiones (antes preguntas abiertas)

1. **Pantallas que no existen en Android** (Materiales, integración GenStock y las que encuentre la tarea 1): se implementan en `paridad-visual`. Acá se marcan como "falta en Android" y se captura su versión web.
2. **Roles:** admin para todo, cliente para el portal y lector para la TV. No hay capturas como miembro.
3. **Estados vacío/carga/error:** se capturan en `paridad-visual`, pantalla por pantalla.
