# Tareas: `comparativa`

Plan: [plan-comparativa.md](plan-comparativa.md) · Spec: [SPEC-comparativa.md](SPEC-comparativa.md)

## Tarea 1: Inventario validado

**Descripción:** Pasar la tabla provisional de la spec a `inventario.md` y validarla contra el código. Resolver las filas "a confirmar" (P20, P24, GenStock en P31), marcar las pantallas "falta en Android" y asignar a cada P-xx su rol y su recurso semilla.

**Criterios de aceptación:**
- [x] Las 32 rutas de `src/app/**/page.tsx` y todas las rutas de `routes.dart` aparecen en alguna fila o están excluidas con motivo.
- [x] Cada fila tiene ruta web, ruta Android (o "falta en Android"), S-ID, M-ID, rol, recurso semilla y columnas de estado para claro y oscuro.
- [x] Ninguna fila queda "a confirmar".

**Verificación:**
- [x] Contraste de conteos: `find src/app -name page.tsx | wc -l` (32) contra las rutas web listadas, y `grep -c "static" mobile/lib/core/router/routes.dart` contra las rutas Android listadas.

**Depende de:** nada · **Archivos:** `specs/066-paridad-visual-android/inventario.md` · **Tamaño:** S

## Tarea 2: El comparador acepta la carpeta

**Descripción:** `scripts/mobile-evidence.mjs` toma la carpeta como argumento opcional. Sin argumento sigue usando `.context/mobile-parity`.

**Criterios de aceptación:**
- [x] `node scripts/mobile-evidence.mjs` genera `.context/mobile-parity/index.html` igual que antes.
- [x] `node scripts/mobile-evidence.mjs .context/paridad-visual/antes` crea la carpeta si no existe y genera su `index.html`.

**Verificación:**
- [x] Correr los dos comandos y abrir los dos `index.html`.

**Depende de:** nada · **Archivos:** `scripts/mobile-evidence.mjs` · **Tamaño:** XS

## Tarea 3: Entorno QA y ancho lógico

**Descripción:** Levantar Postgres, Nextcloud, Next en :3010, el AVD `Pixel_9a` y la app con Marionette. Medir el ancho y el alto lógicos y el DPR. Activar el modo demo de la barra de estado. Abrir cada recurso semilla del inventario y anotar lo que falte.

**Criterios de aceptación:**
- [x] El tamaño en px, la densidad, el ancho/alto en dp y el DPR están anotados en `inventario.md`.
- [x] La web responde en `localhost:3010` como admin y la app está conectada a Marionette con el mismo usuario.
- [x] Hay una lista de pantallas sin datos suficientes, consultada con el usuario antes de tocar el seed.

**Verificación:**
- [x] `adb shell wm size` / `wm density` y `mcp__marionette__connect` funcionan. Una captura Android de prueba muestra la hora fija.

**Depende de:** nada · **Archivos:** `inventario.md` · **Tamaño:** S

## Tarea 4: Procedimiento y par piloto P05

**Descripción:** Escribir `quickstart.md` con los pasos exactos: parámetros de `emulate` de Chrome DevTools, navegación con Marionette, encuadre, nombres de archivo y cambio de rol. Con ese procedimiento, generar el par P05 Proyectos en claro y oscuro.

**Criterios de aceptación:**
- [x] Están `P05-proyectos-admin-{light,dark}-<ancho>-{web,android}.png` en `.context/paridad-visual/antes/`.
- [x] El ancho del PNG web dividido por el DPR es igual al ancho del PNG Android dividido por su densidad.
- [x] `quickstart.md` alcanza por sí solo para repetir el par.

**Verificación:**
- [x] Comparador generado. Se abre en el navegador y se muestra al usuario.

**Depende de:** 1, 2, 3 · **Archivos:** `quickstart.md` · **Tamaño:** S

## Checkpoint A: revisión del piloto
- [x] El usuario aprueba el encuadre, el ancho y la calidad del par P05, o pide ajustes al procedimiento.

## Tarea 5: Tanda 1 — P01–P12

**Descripción:** Capturar en claro y oscuro: acceso, servidores, navegación, Mi día, proyectos, crear/editar proyecto, detalle de proyecto, plantillas, detalle de tarea, tablero, sectores y detalle de sector.

**Criterios de aceptación:**
- [x] Cada P con equivalente tiene pares completos, más los desplazados necesarios.
- [x] El estado de esas filas está actualizado en `inventario.md`.

**Verificación:**
- [x] El comparador muestra los pares sin huérfanas de esta tanda.

**Depende de:** Checkpoint A · **Archivos:** `inventario.md` · **Tamaño:** M

## Tarea 6: Tanda 2 — P13–P24

**Descripción:** Capturar en claro y oscuro: grupos, detalle de grupo, notas, nota, documento, archivos, actividad y clientes, materiales (solo web si falta en Android), recordatorios, notificaciones, cuenta y conexiones.

**Criterios de aceptación y verificación:** los mismos que en la tarea 5. Las pantallas "falta en Android" llevan solo las capturas web.

**Depende de:** Checkpoint A · **Archivos:** `inventario.md` · **Tamaño:** M

## Checkpoint B: revisión intermedia
- [x] Se omitió: el usuario pidió seguir con todas las tandas después de aprobar el piloto. La revisión queda para el checkpoint final.

## Tarea 7: Tanda 3 — P25–P32 administración

**Descripción:** Capturar en claro y oscuro: administración, usuarios y acceso, clientes, etiquetas y etapas, estados de tarea, recordatorios del sistema, integraciones y errores.

**Criterios de aceptación y verificación:** los mismos que en la tarea 5.

**Depende de:** Checkpoint B · **Archivos:** `inventario.md` · **Tamaño:** M

## Tarea 8: Tanda 4 — portal y TV

**Descripción:** Cerrar sesión de admin en la app y en el navegador del emulador. Capturar P33–P34 como `cliente` y P35 como `lector`. Al final, volver a la sesión de admin.

**Criterios de aceptación:**
- [x] Pares en claro y oscuro de P33, P34 y P35, nombrados con su rol.
- [x] Se revocaron las sesiones temporales y se restauró la de admin.

**Verificación:**
- [x] Comparador sin huérfanas de esta tanda.

**Depende de:** Checkpoint B · **Archivos:** `inventario.md` · **Tamaño:** S

## Tarea 9: Cierre

**Descripción:** Regenerar el comparador completo, verificar los criterios de éxito de la spec y commitear los documentos y el script, sin capturas.

**Criterios de aceptación:**
- [x] Los cinco criterios de éxito de `SPEC-comparativa.md` se cumplen.
- [x] El commit incluye `MAP.md`, `SPEC-comparativa.md`, el plan, las tareas, `inventario.md`, `quickstart.md` y `mobile-evidence.mjs`, y nada de `.context/`.

**Verificación:**
- [x] `git status` limpio fuera de lo esperado y `git show --stat` sin imágenes.

**Depende de:** 7, 8 · **Archivos:** los de la lista · **Tamaño:** XS

## Checkpoint final
- [ ] El usuario aprueba el banco y se pasa a `SPEC-paridad-visual.md`.
