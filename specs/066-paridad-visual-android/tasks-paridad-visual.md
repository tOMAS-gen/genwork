# Tareas: `paridad-visual`

Plan: [plan-paridad-visual.md](plan-paridad-visual.md) · Spec: [SPEC-paridad-visual.md](SPEC-paridad-visual.md)

Cada tarea de Flutter cierra con `dart analyze` sin issues y `flutter test` en verde (desde `mobile/`). Cada tarea web cierra con los tests de TS de los archivos tocados, `npx tsc --noEmit` y `npx eslint` sobre esos archivos. Las tareas de pantalla dejan sus capturas en `.context/paridad-visual/despues/`, en claro y oscuro.

## Fase 0 — Herramientas

## Tarea 1: Marionette en debug

**Descripción:** Sumar `marionette_flutter` y usar `MarionetteBinding` en `main.dart` cuando `kDebugMode`, fuera de tests y de web, con el patrón de GenStock. Documentar en `quickstart.md` cómo sacar la URI del VM service del log de `flutter run` y conectarse.

**Criterios de aceptación:**
- [x] En debug, `mcp__marionette__connect` conecta con la app del emulador y `get_interactive_elements` lista los controles de `/works`.
- [x] En release no se inicializa el binding: `flutter build apk --release` compila y `main.dart` lo condiciona con `kDebugMode`.
- [x] Los tests siguen usando el binding de `flutter_test`.

**Verificación:**
- [x] `flutter test` en verde y `dart analyze` limpio.
- [x] Manual: conectar, tocar "Abrir menú" por Marionette y hacer un hot reload.

**Depende de:** nada · **Archivos:** `mobile/pubspec.yaml`, `mobile/pubspec.lock`, `mobile/lib/main.dart`, `specs/066-paridad-visual-android/quickstart.md` · **Tamaño:** S

## Fase A — Fechas

## Tarea 2: Fechas web — helper único y vistas de proyectos

**Descripción:** Crear en `src/lib/domain/dates/` un helper que formatee una fecha de entrega como día de calendario (`timeZone: "UTC"`), en los formatos que hoy usa cada vista (`dd/mm`, `dd/mm/aaaa`, corto). Primero el test que falla. Después usarlo en las vistas de proyectos.

**Criterios de aceptación:**
- [x] Un test que falla antes del cambio y pasa después, para: medianoche UTC (`2026-10-29T00:00:00.000Z` → 29/10), un valor con hora cerca del cambio de día (`2026-10-29T01:05:00.000Z` → 29/10) y un valor con hora tarde (`2026-10-29T23:30:00.000Z` → 29/10), corriendo con `TZ=America/Argentina/Buenos_Aires`.
- [x] `ProjectCard`, `ProjectListRow`, `DueDateBadge` y `StatusBar` usan el helper, y ninguna tiene su propio `Intl.DateTimeFormat` para la entrega.

**Verificación:**
- [x] `TZ=America/Argentina/Buenos_Aires npx vitest run tests/unit/due-date-format.test.ts`
- [x] Manual: en `/`, la card de "Cartelería del local" muestra el mismo día que el detalle `/works/<id>`.

**Depende de:** nada · **Archivos:** `src/lib/domain/dates/dueDate.ts` (nuevo), `tests/unit/due-date-format.test.ts` (nuevo), `src/components/dashboard/ProjectCard.tsx`, `src/components/dashboard/ProjectListRow.tsx`, `src/components/dashboard/DueDateBadge.tsx`, `src/components/works/StatusBar.tsx` · **Tamaño:** S

## Tarea 3: Fechas web — portal, tareas y urgencia

**Descripción:** Usar el helper en el portal y en las tareas. Pasar `getDueDateUrgency` a comparar días de calendario: el día UTC de la entrega contra el día de hoy en la zona del sistema.

**Criterios de aceptación:**
- [x] `PortalProjectCard`, `portal/works/[id]/page.tsx`, `PortalTaskItem` y `TaskItem` usan el helper. También el detalle de grupo (`groups/[id]/page.tsx`), que tenía el mismo formatter.
- [x] `getDueDateUrgency` da "Vence hoy" para una entrega del 29/10 cuando en Buenos Aires es 29/10 a las 22:00 (en UTC ya es 30). Hay un test en `dashboard-utils.test.ts`.

**Verificación:**
- [x] `TZ=America/Argentina/Buenos_Aires npx vitest run tests/unit/dashboard-utils.test.ts tests/unit/due-date-format.test.ts`
- [x] Manual: en `/portal` como cliente, la fecha coincide con `/works/<id>` como admin.

**Depende de:** 2 · **Archivos:** `src/components/portal/PortalProjectCard.tsx`, `src/app/portal/works/[id]/page.tsx`, `src/components/portal/PortalTaskItem.tsx`, `src/components/tasks/TaskItem.tsx`, `src/lib/domain/works/dashboardUtils.ts`, `tests/unit/dashboard-utils.test.ts` · **Tamaño:** S

## Tarea 4: Fechas Android — `dueDate` como día de calendario

**Descripción:** Leer `dueDate` de proyectos, tareas y portal con `parseDay` en lugar de `parseDate`. Primero el test que falla, con la zona del dispositivo en UTC-3.

**Criterios de aceptación:**
- [x] `due_date_test.dart` (nuevo, junto a `models_test.dart`) cubre los tres casos de la tarea 2 en `Work`, `Task` y los modelos del portal, y el envío del día elegido como medianoche UTC. Con `TZ=America/Argentina/Buenos_Aires` falla antes del cambio y pasa después.
- [x] La urgencia de Android (si la calcula) usa el mismo día que muestra.

**Verificación:**
- [x] `TZ=America/Argentina/Buenos_Aires flutter test test/data/models_test.dart`
- [x] Manual: P05 y P07 en el emulador muestran el mismo día que la web.

**Depende de:** nada · **Archivos:** `mobile/lib/data/models/work.dart`, `mobile/lib/data/models/task.dart`, `mobile/lib/data/models/portal.dart`, `mobile/test/data/models_test.dart` · **Tamaño:** S

## Checkpoint A: fechas

- [x] La misma entrega muestra el mismo día en la lista web, el detalle web, el portal y Android (29/10 en todas; el emulador pasa a hora de Buenos Aires, donde Android también mostraba el 28).
- [x] Capturas `despues` de P05 y P07 en web y Android, y de P33 y P34 en web. Las de Android de P33 y P34 van con la tanda 6, para cambiar de rol una sola vez.
- [x] Con `/build auto` no hay pausa: el resultado se informa al final. Queda como diferencia de texto (P05/P07): Android muestra "29 oct" y la web "29/10/2026".

## Fase B — Base compartida

## Tarea 5: `diferencias.md`

**Descripción:** Comparar los 34 pares de `antes/` con la lista de "igual" de la spec y anotar cada diferencia como `Pxx-NN`, con su ítem (1–9). Marcar con **B** las que vienen de un componente compartido (las que aparecen en tres o más pantallas) y con **nativo** las que no cuentan. Al final, confirmar o ajustar las tareas 6 a 10.

**Criterios de aceptación:**
- [x] Las 34 pantallas `par` tienen su sección, aunque no tengan diferencias.
- [x] Cada diferencia tiene ID, ítem, descripción medible (por ejemplo, "título 24 px en Android, 20 px en la web") y destino (B, pantalla o nativo).
- [x] Al final hay un resumen por componente compartido, con las pantallas afectadas.

**Verificación:**
- [x] Manual: revisar el resumen contra el comparador `antes/index.html`.

**Depende de:** 1 · **Archivos:** `specs/066-paridad-visual-android/diferencias.md` (nuevo) · **Tamaño:** M

**Resultado (confirma las tareas 6 a 10, con estos ajustes):**
- **Tarea 6:** la escala tipográfica ya coincide (títulos de 24, cuerpo de 13 por "el más chico", rótulos de 11). Quedan dos tokens: el alto de la barra superior (48 dp, como la web) y el color de la urgencia de entrega (`warningText`/`dangerText`/`successText`, como `.due-*` de la web).
- **Tarea 7:** además del menú, el encabezado de página pasa a desplazarse con el contenido y la acción queda a la derecha del título (P04, P05, P08, P17).
- **Tarea 9:** suma los campos de formulario con rótulo arriba (P06, P11, P28, P29, P32) y el chip de estado con contorno del tablero (P10, P35).
- Los cambios de datos que aparecieron (progreso de objetivo y de sector contando subtareas, P07-06 y P12-02) van en sus tandas.

## Tarea 6: Escala tipográfica y tokens

**Descripción:** Ajustar `AppTextStyles` y los tokens de color, espaciado y radio a lo que relevó la tarea 5, con la regla "el más chico" y un piso de 11 px.

**Criterios de aceptación:**
- [x] Cada rol tipográfico tiene el tamaño y el peso del rol web, o el más chico si difieren. Ninguno queda por debajo de 11 px.
- [x] `theme_tokens_test` refleja los valores nuevos. `ui_phase3_test` y `design_tokens_guard_test` pasan sin tocar sus umbrales.

**Verificación:**
- [x] `flutter test test/core/theme_tokens_test.dart test/ui_phase3_test.dart test/design_tokens_guard_test.dart`

**Depende de:** 5 · **Archivos:** `mobile/lib/core/theme/app_text_styles.dart`, `mobile/lib/core/theme/app_theme.dart`, `mobile/lib/core/theme/gen_colors.dart`, `mobile/lib/core/theme/app_geometry.dart`, `mobile/test/core/theme_tokens_test.dart` · **Tamaño:** S

## Tarea 7: Encabezado de página y menú lateral (P03)

**Descripción:** Igualar el encabezado (`GenPageScaffold`, `PageIntro`, `GenSectionHeader`) y el menú lateral al de la web: orden de secciones, ítems, íconos, marca y pie. Con el menú abierto, el botón atrás lo cierra en lugar de cerrar la app (hallazgo 4).

**Criterios de aceptación:**
- [x] El menú tiene las mismas secciones e ítems, en el mismo orden que la web para el mismo rol.
- [x] Hay un test de widget: con el menú abierto, el atrás del sistema lo cierra y la ruta sigue igual.
- [x] Hay par `despues` de P03 y del encabezado de P05.

**Verificación:**
- [x] `flutter test test/features/navigation_parity_test.dart test/shared/surfaces_test.dart`
- [x] Manual: en el emulador, abrir el menú y tocar atrás.

**Depende de:** 5 · **Archivos:** `mobile/lib/features/shell/*`, `mobile/lib/shared/widgets/gen_page_scaffold.dart`, `mobile/lib/shared/widgets/page_intro.dart`, `mobile/lib/shared/widgets/app_drawer_scope.dart`, `mobile/test/features/navigation_parity_test.dart` · **Tamaño:** M

## Tarea 8: KPI, cards de proyecto y progreso

**Descripción:** Igualar `KpiTile`, la card de proyecto (`AppWorkBox` y afines), `CardProgress` y `ProgressLine` a la web: estructura, padding, tipografía, color de etiquetas y fecha de entrega.

**Criterios de aceptación:**
- [x] La card de "Cartelería del local" tiene los mismos bloques, en el mismo orden que la web.
- [x] Los tests de widget de estos componentes cubren el cambio de estructura.

**Verificación:**
- [x] `flutter test test/shared/count_progress_test.dart test/shared/surfaces_test.dart test/features/works_dashboard_test.dart`

**Depende de:** 6 · **Archivos:** `mobile/lib/shared/widgets/kpi_tile.dart`, `mobile/lib/shared/widgets/app_work_box.dart`, `mobile/lib/shared/widgets/card_progress.dart`, `mobile/lib/shared/widgets/progress_line.dart`, `mobile/test/shared/count_progress_test.dart` · **Tamaño:** M

## Tarea 9: Chips, filtros, buscador, orden y pestañas

**Descripción:** Igualar `GenFilterChipBar`, `WorkspaceSearchBar`, `WorkspaceFiltersDrawer`, `GenTabBar`, `StatusChip` y `NamePill`. Si la web usa un selector de orden o un cambio grilla/lista, Android usa la misma pieza (ítem 8 de la spec).

**Criterios de aceptación:**
- [x] Los controles de filtro de P05 son las mismas piezas que en la web, en el mismo orden.
- [x] La barra de pestañas del proyecto se ve como la web (las pantallas aparte se conservan, decisión 1).

**Verificación:**
- [x] `flutter test test/shared/search_filters_tabs_test.dart test/shared/chips_notices_test.dart`

**Resultado:** `ListToolbar` compartida (buscador, Filtros con panel en línea, orden, grilla/lista, contador, filtros activos y Limpiar) aplicada a Proyectos, con la vista de tabla (`WorkTable`). Lo demás se mueve: los campos con rótulo arriba a la tarea 10 (van con los dialogs), el chip de estado del tablero a la tanda 2 (P10) y la barra de pestañas a la tanda 2 (P07) y la tarea 17.

**Depende de:** 6 · **Archivos:** `mobile/lib/shared/widgets/gen_filter_chip_bar.dart`, `mobile/lib/shared/widgets/workspace_search_bar.dart`, `mobile/lib/shared/widgets/gen_tab_bar.dart`, `mobile/lib/shared/widgets/status_chip.dart`, `mobile/test/shared/search_filters_tabs_test.dart` · **Tamaño:** M

## Tarea 10: Dialogs, hojas y vistas de estado

**Descripción:** Igualar `AppFormDialog`, `AdaptiveModal`, `ActionConfirmationDialog`, `StateViews`, `AppStateBlock` y `GenSkeleton` a la web: título, botones, orden de acciones, texto y forma del vacío, de la carga y del error.

**Criterios de aceptación:**
- [x] El dialog de crear proyecto (P06) tiene los mismos campos, el mismo orden de botones y el mismo copy.
- [x] Vacío, carga y error usan el mismo texto y la misma forma que la web en P05.

**Verificación:**
- [x] `flutter test test/shared/dialogs_test.dart test/shared/state_views_test.dart test/core/async_value_view_test.dart`

**Depende de:** 6 · **Archivos:** `mobile/lib/shared/widgets/app_form_dialog.dart`, `mobile/lib/shared/widgets/adaptive_modal.dart`, `mobile/lib/shared/widgets/state_views.dart`, `mobile/lib/shared/widgets/app_state_block.dart`, `mobile/test/shared/dialogs_test.dart` · **Tamaño:** M

## Checkpoint B: base compartida

- [x] `flutter test` en verde (486), con `ui_phase3_test` y `design_tokens_guard_test` sin cambios en sus umbrales (solo finders donde cambió la estructura).
- [x] Pares `despues` de P03, P05 y P06, y el comparador regenerado (P07 va con la tanda 2, junto con sus pestañas).
- [x] Con `/build auto` no hay pausa: la revisión del usuario queda para el resumen final.

## Fase C — Pantallas

En cada tanda, por pantalla: cerrar sus diferencias de `diferencias.md` (`corregida` o `aceptada (nativo)` con motivo), capturar el par `despues`, pasar la fila a `igual` en `inventario.md` y hacer un commit con su ID P/S.

## Tarea 11: Tanda 1 — P01–P04

**Descripción:** Acceso, servidores, navegación y Mi día. P02 es solo de Android: adopta el lenguaje de la web (decisión 2).

**Criterios de aceptación:**
- [x] P01–P03 quedan `igual`. P04 queda con una sola diferencia abierta (P04-01, la fecha del día): sacarla obliga a borrar el test QA10 y se le pregunta al usuario.
- [x] Ninguna captura de P01 muestra la cámara.

**Verificación:**
- [x] `flutter test test/features/auth_screens_test.dart test/features/server_setup_test.dart test/features/servers_screen_test.dart test/features/daily_parity_test.dart test/features/day_overview_test.dart`

**Depende de:** B · **Archivos:** `mobile/lib/features/setup/*`, `mobile/lib/features/my_day/*` y sus tests · **Tamaño:** M

## Tarea 12: Tanda 2 — P05–P10

**Descripción:** Proyectos, crear/editar, detalle, plantillas, detalle de tarea y tablero. P09 conserva su pantalla propia (decisión 1).

**Criterios de aceptación:**
- [x] P05, P06, P09 y P10 quedan `igual`. P07 espera la pestaña Materiales (tarea 17) y P08 queda con la barra sin Filtros ni grilla/lista (las plantillas se listan como filas).

**Verificación:**
- [x] `flutter test test/features/works_dashboard_test.dart test/features/mobile_parity_test.dart test/features/objectives_parity_test.dart test/shared/task_widgets_test.dart`

**Depende de:** B · **Archivos:** `mobile/lib/features/works/*`, `mobile/lib/features/tasks/*`, `mobile/lib/features/board/*` y sus tests · **Tamaño:** M

## Tarea 13: Tanda 3 — P11–P19

**Descripción:** Sectores, grupos, notas, documento, archivos, actividad y acceso cliente del proyecto.

**Criterios de aceptación:**
- [x] P11–P13 y P15–P19 quedan `igual`. P14 queda con P14-03 ("Lectura para no miembros" como card con lápiz; la web usa una casilla). P11 sin el cambio grilla/lista.

**Verificación:**
- [x] `flutter test test/features/groups_parity_test.dart test/features/documents_parity_test.dart test/features/resource_operations_test.dart`

**Depende de:** B · **Archivos:** `mobile/lib/features/{sectors,groups,notes,documents,files}/*` y sus tests · **Tamaño:** M

## Tarea 14: Tanda 4 — P21–P24a

**Descripción:** Recordatorios, notificaciones, cuenta y Vincular con Claude. Notificaciones, Preferencias, Sistema y Cuenta de almacenamiento son solo de Android y adoptan el lenguaje de la web.

**Criterios de aceptación:**
- [x] P21, P22, P24a y P25 quedan `igual`. P23 queda en parte: "Usuarios permitidos" sigue en Control de acceso. Se suma la barra de configuración de la web (`SettingsTabs`) en todas las pantallas de Configuración.

**Verificación:**
- [x] `flutter test test/features/reminders_advanced_test.dart test/features/notifications_test.dart test/features/settings_parity_test.dart`

**Depende de:** B · **Archivos:** `mobile/lib/features/{reminders,notifications,account,settings}/*` y sus tests · **Tamaño:** M

## Checkpoint C1

- [x] P01–P25 revisados con pares `despues` (en modo automático la revisión del usuario queda para el resumen final).

## Tarea 15: Tanda 5 — P25–P32

**Descripción:** Administración: usuarios y acceso, clientes, etiquetas y etapas, estados, recordatorios del sistema, almacenamiento y errores.

**Criterios de aceptación:**
- [x] P26, P27, P29, P30, P31a y P32 quedan `igual` (las altas y ediciones siguen en diálogos, aceptado). P28 queda con el vacío "+ Nueva clave" (P28-02).

**Verificación:**
- [x] `flutter test test/features/settings_parity_test.dart test/features/qa10_roles_a11y_test.dart`

**Depende de:** C1 · **Archivos:** `mobile/lib/features/settings/*` y sus tests · **Tamaño:** M

## Tarea 16: Tanda 6 — P33–P35

**Descripción:** Portal como cliente y TV como lector. El cambio de rol se hace una sola vez, siguiendo el quickstart.

**Criterios de aceptación:**
- [x] P33–P35 quedan `igual`, sin diferencias abiertas.

**Verificación:**
- [x] `flutter test test/features/qa10_roles_a11y_test.dart` y los tests del portal y el tablero.

**Depende de:** C1 · **Archivos:** `mobile/lib/features/portal/*`, `mobile/lib/features/board/*` · **Tamaño:** S

## Fase D — Pantallas que faltan

En todas: leer la página web y su API antes de diseñar. Si la API no alcanza, preguntar antes de tocar el backend. Cada una lleva test de repositorio contra la respuesta real de la API y test de widget con datos, vacío, error y permisos (admin y miembro).

## Tarea 17: Pestaña Materiales del proyecto

**Descripción:** Agregar Materiales al detalle de proyecto en Android, como la sexta pestaña de la web (`MaterialsPanel`), contra `GET /api/works/[id]/materials`.

**Criterios de aceptación:**
- [x] El proyecto tiene las mismas 6 pestañas que la web, en el mismo orden.
- [x] Sin GenStock configurado se ve el mismo estado vacío que la web.

**Verificación:**
- [x] `flutter test test/features/materials_test.dart`
- [x] Manual: par `despues` de la pestaña.

**Depende de:** 12 · **Archivos:** `mobile/lib/data/models/material.dart`, `mobile/lib/data/repositories/materials_repository.dart`, `mobile/lib/features/works/…`, `mobile/test/features/materials_test.dart` · **Tamaño:** M

## Tarea 18: P20 Materiales

**Descripción:** Pantalla Materiales (`/materials` de la web), con su ítem en el menú para los roles que lo ven en la web, contra `GET /api/materials`. Reutiliza el modelo y el repositorio de la tarea 17.

**Criterios de aceptación:**
- [x] La ruta y el ítem del menú existen solo para los roles que lo ven en la web.
- [x] P20 tiene par `despues` y queda `igual`.

**Verificación:**
- [x] `flutter test test/features/materials_test.dart test/features/navigation_parity_test.dart`

**Depende de:** 17 · **Archivos:** `mobile/lib/features/materials/*` (nuevo), `mobile/lib/core/router/routes.dart`, `mobile/lib/features/shell/*`, `mobile/test/features/materials_test.dart` · **Tamaño:** M

## Tarea 19: P24b App móvil

**Descripción:** Sección App móvil de la cuenta (`/settings/movil` de la web), con lo que la API ya ofrece.

**Criterios de aceptación:**
- [x] P24b existe con dirección, Copiar, aviso de dirección local y pasos, y la pestaña App móvil en la barra de configuración. **Falta el código QR**: la web lo genera en el servidor y la app necesitaría `qr_flutter` (dependencia nueva: se le pregunta al usuario).

**Verificación:**
- [x] `flutter test test/features/settings_parity_test.dart`

**Depende de:** 14 · **Archivos:** `mobile/lib/features/account/*` o `settings/*`, `mobile/lib/core/router/routes.dart`, su test · **Tamaño:** S

## Tarea 20: P31b Integración con GenStock

**Descripción:** Módulo GenStock en Administración (`/admin/genstock` de la web), contra `GET`/`PUT /api/admin/genstock` y `POST /api/admin/genstock/test`. Solo admin.

**Criterios de aceptación:**
- [x] Ver, guardar y probar la conexión funcionan contra la API, y un miembro no ve el módulo.
- [x] La API de GenStock no maneja tokens: solo guarda la URL del servidor (nada sensible que mostrar ni registrar).
- [x] P31b tiene par `despues` y queda `igual`.

**Verificación:**
- [x] `flutter test test/features/genstock_settings_test.dart`

**Depende de:** 15 · **Archivos:** `mobile/lib/data/repositories/genstock_repository.dart`, `mobile/lib/features/settings/…`, `mobile/test/features/genstock_settings_test.dart` · **Tamaño:** M

## Checkpoint D

- [ ] Las cuatro piezas nuevas, con pares `despues` y probadas como admin y como miembro.
- [ ] El usuario las revisa.

## Fase E — Estados y cierre

## Tarea 21: Estados vacío, carga y error

**Descripción:** Para cada pantalla que los tenga, capturar vacío, carga y error en web y Android y corregir lo que difiera. El vacío se consigue con un recurso nuevo sin contenido (un grupo o un proyecto vacío creado en la base QA). La carga y el error, con el servidor demorado o caído.

**Criterios de aceptación:**
- [ ] `inventario.md` tiene la lista de estados por pantalla, y cada uno con par en `despues/`.
- [ ] Los textos de vacío y error coinciden con la web.

**Verificación:**
- [ ] `flutter test` completo.
- [ ] Manual: el comparador muestra los pares de estados.

**Depende de:** 11–20 · **Archivos:** `specs/066-paridad-visual-android/inventario.md` y los widgets de estado que hagan falta · **Tamaño:** M

## Tarea 22: Cierre

**Descripción:** Revisar los criterios de éxito de la spec, regenerar el comparador `despues` y dejar `inventario.md` y `diferencias.md` completos.

**Criterios de aceptación:**
- [ ] Las 34 filas `par` están `igual`, y P20, P24b, P31b y la pestaña Materiales tienen par.
- [ ] `node scripts/mobile-evidence.mjs .context/paridad-visual/despues` no muestra huérfanas fuera de las pantallas que solo existen en Android.
- [ ] `dart analyze` limpio y `flutter test` en verde.

**Verificación:**
- [ ] Recorrer los 6 criterios de éxito de la spec.

**Depende de:** 21 · **Archivos:** `specs/066-paridad-visual-android/{inventario,diferencias}.md` · **Tamaño:** XS

## Checkpoint final

- [ ] Criterios de éxito de la spec cumplidos y revisados con el usuario.
