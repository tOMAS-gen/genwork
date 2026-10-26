# Inventario de pantallas — comparativa web ↔ Android

Spec: [SPEC-comparativa.md](SPEC-comparativa.md). Validado el 2026-10-25 contra las 32 páginas web (`find src/app -name page.tsx`) y contra `mobile/lib/core/router/app_router.dart`.

## Condiciones de captura

| Dato | Valor |
|---|---|
| Emulador | AVD `Pixel_9a` (`emulator-5554`) |
| Tamaño físico | 1080 × 2424 px, densidad 420 |
| Tamaño en uso (override del AVD) | 1170 × 2532 px, densidad 480 → **390 × 844 dp, DPR 3** |
| Viewport web | 390 × 844 px CSS, DPR 3, táctil y móvil |
| Escala de texto Android | 1,0 |
| Servidor | `http://localhost:3010`, base `genwork_mobile_parity` |

Se mantiene el override del AVD (390 × 844 @3x) que ya estaba configurado. Es el ancho de referencia de la auditoría S01 y el DPR entero evita el problema de emular 2,625 en Chrome. El ancho de los nombres de archivo es `390`.

## Pantallas

Estado de cada captura: `—` pendiente · `par` web y Android hechas · `web` solo web (falta en Android).

| P | Pantalla | Web | Android | S | M | Rol | Recurso semilla | Claro | Oscuro |
|---|---|---|---|---|---|---|---|---|---|
| P01 | Acceso | `/login` | `/setup` (el login abre `/login` web en el navegador) | S01 | M03 | sin sesión | — | igual | igual |
| P02 | Servidores (solo Android) | patrón `/login` | `/servers`, `/servers/add` | S02 | M03 | admin | servidor `localhost:3010` | igual | igual |
| P03 | Navegación | sidebar/drawer de `(main)` | drawer de `HomeShell` | S04 | M03 | admin | — | igual | igual |
| P04 | Mi día | `/references` | `/my-day` | S05 | M04 | admin | tareas semilla | par | par |
| P05 | Proyectos | `/` | `/works` | S06 | M05 | admin | proyectos de QA produccion/publico/privado | igual | igual |
| P06 | Crear/editar proyecto | dialog en `/` | dialog en `/works` | S07 | M05 | admin | — | igual | igual |
| P07 | Detalle de proyecto | `/works/[id]` | `/works/:id` | S08 | M06 | admin | "Cartelería del local" | par | par |
| P08 | Plantillas | `/?filter=templates` | `/templates` | S09 | M08 | admin | — | par | par |
| P09 | Detalle de tarea | detalle en `/works/[id]` | pantalla de tarea (`task_detail_sheet`) | S10 | M07 | admin | tarea de "Preparación y entrega" | igual | igual |
| P10 | Tablero | `/board` | `/board` | S11 | M10 | admin | — | igual | igual |
| P11 | Sectores | `/sectors` | `/sectors` | S12 | M09 | admin | sectores "Impresión" | igual | igual |
| P12 | Detalle de sector | `/sectors/[id]` | `/sectors/:id` | S12 | M09 | admin | "Impresión" (QA produccion) | igual | igual |
| P13 | Grupos | `/groups` | `/groups` | S13 | M11 | admin | QA produccion/publico/privado | igual | igual |
| P14 | Detalle de grupo | `/groups/[id]` | `/groups/:id`, `/clients`, `/labels` | S13 | M11 | admin | QA produccion | par | par |
| P15 | Notas | `/notes` | `/notes` | S14 | M12 | admin | "Notas de producción" | igual | igual |
| P16 | Nota | `/notes/[id]` | `/notes/:id` | S14 | M12 | admin | "Notas de producción" | igual | igual |
| P17 | Documento del proyecto | pestaña Documentos de `/works/[id]` | `/works/:id/document` | S14 | M12 | admin | "Cartelería del local" | igual | igual |
| P18 | Archivos del proyecto | pestaña Archivos de `/works/[id]` | `/works/:id/files` | S15 | M13 | admin | "Cartelería del local" (Nextcloud local) | igual | igual |
| P19 | Actividad y clientes del proyecto | pestañas de `/works/[id]` | `/works/:id/activity`, `/works/:id/clients` | S21 | M17 | admin | "Cartelería del local" | igual | igual |
| P20 | Materiales | `/materials` | **falta en Android** | S16 | — | admin | sin GenStock: estado vacío | web | web |
| P21 | Recordatorios | `/reminders` | `/more/reminders`, `/new`, `/:id` | S17 | M14 | admin | "Revisar entregas" | par | par |
| P22 | Notificaciones | campanita de la barra web | `/more/notifications`, `/more/notification-settings`, `/more/due-today` | S17 | — | admin | avisos semilla | par | par |
| P23 | Cuenta y más | `/settings` | `/more`, `/more/account`; secciones Sistema y Cuenta de almacenamiento | S18 | M15 | admin | — | par | par |
| P24a | Vincular con Claude | `/settings/claude` | `/more/settings/module/mcp` y `module/activity` | S19 | M15 | admin | — | par | par |
| P24b | App móvil | `/settings/movil` | **falta en Android** | S19 | — | admin | — | web | web |
| P25 | Administración | `/admin` | `/more/settings` | S20 | M16 | admin | — | par | par |
| P26 | Usuarios y acceso | `/admin/users`, `/admin/access` | `module/users`, `module/access`, `module/emails` | S20 | M16 | admin | usuarios de prueba | par | par |
| P27 | Clientes | `/admin/clients` | `module/clients` | S21 | M16 | admin | `cliente@test.local` | par | par |
| P28 | Etiquetas y etapas | `/admin/labels`, `/admin/stages` | `catalog/labels`, `catalog/stages` | S22 | M16 | admin | — | par | par |
| P29 | Estados de tarea | `/admin/task-statuses` | `catalog/statuses` | S23 | M16 | admin | Pendiente / Terminado | par | par |
| P30 | Recordatorios del sistema | `/admin/reminders` | `module/reminders` | S24 | M16 | admin | — | par | par |
| P31a | Almacenamiento | `/admin/storage` | `module/storage`, `module/jobs` | S25 | M16 | admin | Nextcloud local | par | par |
| P31b | Integración con GenStock | `/admin/genstock` | **falta en Android** | S25 | — | admin | sin configurar | web | web |
| P32 | Errores | `/admin/errors`, `/admin/errors/[id]` | `module/errors`, `errors/:id` | S26 | M16 | admin | — | par | par |
| P33 | Portal | `/portal` | `/portal` | S27 | M18 | cliente | proyecto visible para `cliente` | par | par |
| P34 | Proyecto en portal | `/portal/works/[id]` | `/portal/works/:id`, `/document` | S27 | M18 | cliente | ídem | par | par |
| P35 | TV | `/tv` | `/tv` (`BoardScreen` de solo lectura) | S28 | M19 | lector | QA produccion | par | par |

## Exclusiones

| Ruta | Plataforma | Motivo |
|---|---|---|
| `/admin/mcp` | web | Redirige a `/settings/claude` (P24a). |
| `/splash` | Android | Transición de arranque, sin contenido propio. |
| `/portal/account`, `/tv/account` | Android | Es la misma `AccountScreen` de P23. Se compara una vez. |

## Pantallas que faltan en Android

`paridad-visual` las implementa: **P20 Materiales**, **P24b App móvil** y **P31b Integración con GenStock**. En `antes/` solo tienen captura web.

## Resultado de la captura (2026-10-25)

234 imágenes en `.context/paridad-visual/antes/`: 34 filas con par web/Android en claro y oscuro, más desplazamientos (`-s2`, `-s3`). El comparador está en `antes/index.html`.

**Imágenes sin pareja, todas esperadas:**

- **Solo web (falta en Android):** P20 Materiales, P24b App móvil y P31b Integración con GenStock.
- **Solo Android:** P22 `notificaciones` y `ajustes-notificaciones`, que en la web no tienen pantalla (la web solo tiene el panel "Vence hoy"). También P23 `sistema` y `almacenamiento`, que en la web son partes de `/settings` y en Android son pantallas propias.
- **Desplazamientos de una sola plataforma:** P23-cuenta, P26, P28-etiquetas, P30 y P31a tienen `-s2` solo en Android, porque la web entra en una pantalla. P24a tiene `-s3` solo en la web.

**Cómo se armó cada par:**

- **P02:** la captura web es la misma que P01 (`/login`), que es el patrón más parecido.
- **P09:** la web no tiene una pantalla de detalle de tarea. Al tocar el texto, la tarea se edita en el lugar. La captura web muestra ese estado y la de Android, la pantalla de detalle.
- **P17–P19:** en la web son pestañas de `/works/[id]` y la captura se desplazó hasta la pestaña abierta. En Android son pantallas propias.
- **P22:** la web abre el panel "Vence hoy" desde el menú lateral, y Android usa `/more/due-today`.
- **P14:** las subpantallas de Android `clients` y `labels` no se capturaron por separado. En la web son secciones de `/groups/[id]` y se comparan en `paridad-visual`.
- **P18:** Archivos muestra "Carpeta no habilitada" en las dos plataformas, porque el proyecto semilla no tiene carpeta.

## Hallazgos durante la captura

No son de diseño; quedan para `paridad-visual` o para la auditoría S01–S29.

1. **Fechas que no coinciden.** El mismo vencimiento aparece como 28/10/2026 en la lista web, 29/10/2026 en el detalle web y "29 oct" en Android. Parece un problema de zona horaria entre la lista web y el resto. Afecta a P05, P07 y P33.
2. **Web: el panel "Vence hoy" queda detrás del menú lateral en el celular** (P22): se abre debajo del menú y casi no se ve.
3. **Web: en el portal, el logo de la barra superior queda cortado a la izquierda** (P33–P34).
4. **Android: si el menú lateral está abierto, el botón atrás puede cerrar la app** en lugar de cerrar el menú. Pasó dos veces y no está confirmado como regla.
