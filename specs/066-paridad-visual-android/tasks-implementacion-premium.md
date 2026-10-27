# Tareas: `implementacion-premium` — piloto P09

Spec: [SPEC-implementacion-premium.md](SPEC-implementacion-premium.md) · Boceto: `despues/P09-detalle-tarea-admin-light-390-boceto.png` · Rama: `tOMAS-gen/paridad-visual-android`.

Cada tarea cierra con `dart analyze` sin issues y `flutter test` en verde (desde `mobile/`), y un commit propio. Archivo principal: `mobile/lib/features/tasks/task_detail_sheet.dart`.

## Decisiones

- **Solo Android:** la web no cambia (P09-01).
- **Las claves de los controles se conservan** cuando el control sigue existiendo con otra forma (`task_urgent`, `task_reminder`, `task_status_<id>`, `task_text_save`, `task_delete`, `task_move_*`, `task_promote`, `subtasks_reorder`, `task_subtask_<id>`), así los tests cambian lo mínimo. La única renombrada es `task_my_day_switch` → `task_my_day`, porque deja de ser un interruptor.
- **Las acciones del menú "⋯"** son ítems de `PopupMenuButton` con las mismas claves. Un test que antes las tocaba en la hoja ahora abre el menú (`task_more`) primero.
- **"+ Asignar"** usa `TasksRepository.suggest('#'|'@', query)` y guarda con `TaskActions.updateText`. En el contexto de sector no ofrece `#` (el campo de texto ya lo bloquea por la misma regla).

## Tarea 1: Barra con miga y menú "⋯", título en el cuerpo

**Descripción:** La barra muestra el cierre, la miga del contexto y el menú "⋯" (Mover a objetivo, Mover bajo otra tarea, Separar del padre, Historial de estados, Borrar tarea). El título pasa al cuerpo en 20/700, editable sin caja, con un botón de tilde para guardar. La sección Historial y el botón Borrar salen del cuerpo; el historial se abre en un diálogo.

**Criterios de aceptación:**
- [x] La barra muestra la miga (`Cartelería del local › Preparación y entrega`; `#Impresión` en una tarea de sector) y no el texto de la tarea.
- [x] "⋯" ofrece solo las acciones permitidas, con las mismas condiciones de hoy. Borrar va en rojo y sigue pidiendo confirmación.
- [x] El título se edita en el lugar y se guarda con el tilde (`task_text_save`) o con Enter.
- [x] Historial de estados abre un diálogo con la misma lista de hoy.

**Verificación:**
- [x] Test nuevo en `task_detail_premium_test.dart`: miga, menú con sus ítems según permisos, historial en diálogo.
- [x] `ui_phase3_test` y `objectives_parity_test` adaptados (Borrar y mover desde el menú; título fuera de la barra), con las mismas verificaciones.

**Depende de:** nada · **Archivos:** `task_detail_sheet.dart`, `test/features/task_detail_premium_test.dart` (nuevo), `test/ui_phase3_test.dart`, `test/features/objectives_parity_test.dart` · **Tamaño:** M

## Tarea 2: Fila de chips — estado, Mi día, Urgente y Recordatorio

**Descripción:** Debajo del título, una fila de chips de 32 dp: los estados (como hoy), Mi día (`FilterChip`, `task_my_day`), Urgente (`FilterChip`, `task_urgent`) y Recordatorio (`ActionChip`, `task_reminder`). `TaskNotificationControls` pasa a dar los dos chips. La cantidad de destinatarios de Urgente va en la descripción accesible del chip y en un aviso al activarlo; sin destinatarios, el chip explica por qué no avisa.

**Criterios de aceptación:**
- [x] Los cuatro controles hacen lo mismo que hoy, con los mismos permisos.
- [x] Sin permiso para Mi día, el chip no aparece (hoy el interruptor no aparece).
- [x] Ninguna fila con interruptor queda en la pantalla.

**Verificación:**
- [x] Tests nuevos: tocar cada chip llama a la acción correcta; aviso de destinatarios.
- [x] `notifications_test`, `daily_parity_test` y `ui_phase3_test` adaptados (`FilterChip.selected` en lugar de `SwitchListTile.value`; `task_my_day`).

**Depende de:** 1 · **Archivos:** `task_detail_sheet.dart`, `lib/features/notifications/task_notification_controls.dart`, tests · **Tamaño:** M

## Tarea 3: "Asignada a" y selector "+ Asignar"

**Descripción:** Un bloque "ASIGNADA A" con los chips que hoy aparecen sueltos (proyecto, sector, personas, objetivo, vencimiento y etiquetas) y un chip punteado "+ Asignar" que abre un diálogo con buscador y dos grupos, Sectores y Personas, cargados con `suggest`. Al elegir, agrega `#sector` o `@persona` al final del texto y guarda.

**Criterios de aceptación:**
- [x] Elegir un sector guarda `texto #Sector`; elegir una persona guarda `texto @persona`.
- [x] En una tarea de sector no aparece el grupo Sectores.
- [x] Sin permiso de editar el texto, "+ Asignar" no aparece.
- [x] Errores de carga o de guardado se muestran con el aviso de error de la app.

**Verificación:**
- [x] Tests nuevos con el arnés de API: lista, búsqueda, guardado del texto, permisos y contexto de sector.

**Depende de:** 1 · **Archivos:** `task_detail_sheet.dart`, `lib/features/tasks/task_assign_dialog.dart` (nuevo), tests · **Tamaño:** M

## Tarea 4: Descripción y subtareas como bloques principales

**Descripción:** La descripción va en una card con rótulo "DESCRIPCIÓN", campo de 6 líneas, "Guardado ✓" si no hay cambios y botón tonal "Guardar" si los hay. Las subtareas, en una card con rótulo, contador "hechas/total", botón de ordenar, filas de 48 dp con divisor y "Nueva subtarea…" adentro de la card.

**Criterios de aceptación:**
- [x] La descripción se guarda igual que hoy (vacía = sin descripción) y un borrador no se pierde al recargar.
- [x] El contador refleja las subtareas hechas.
- [x] Ordenar y crear subtareas funcionan igual que hoy.

**Verificación:**
- [x] Tests nuevos: "Guardado ✓" y botón según cambios; contador.
- [x] `daily_parity_test` (borrador de descripción y subtarea nueva) sigue verde sin cambios de lógica.

**Depende de:** 1 · **Archivos:** `task_detail_sheet.dart`, tests · **Tamaño:** S

## Tarea 5: Cierre del piloto

**Descripción:** Capturas de P09 en claro y oscuro, revisión contra el boceto, y actualización de `auditoria-premium.md` (hallazgos de P09 resueltos) y de `inventario.md`.

**Criterios de aceptación:**
- [x] `despues/P09-detalle-tarea-admin-{light,dark}-390-android.png` nuevas, con el oscuro verificado.
- [x] Los hallazgos P09-M que resuelve el piloto quedan marcados.

**Verificación:**
- [x] `dart analyze` limpio, `flutter test` en verde, comparador regenerado.

**Depende de:** 1–4 · **Archivos:** specs y capturas · **Tamaño:** S

## Checkpoint: piloto

- [x] Todos los tests pasan y la pantalla sigue el boceto en claro y oscuro.
- [x] El usuario revisa el piloto antes de planificar las fases siguientes (PS1–PS15). El 2026-10-26 aprobó todos los bocetos y pidió el plan completo.

---

# Fases 1–5: el resto de la auditoría

Plan: [plan-implementacion-premium.md](plan-implementacion-premium.md). Cada tarea cierra con `dart analyze` sin issues, `flutter test` en verde (desde `mobile/`) y un commit propio con los IDs en el mensaje. Las tareas que cambian el aspecto suman capturas `despues` en claro y oscuro de las pantallas que tocan, y marcan en `auditoria-premium.md` los hallazgos resueltos. Ningún color, radio ni espaciado literal en `features/` ni en `shared/`.

## Fase 1 — Bases

## Tarea 6: Oscuro con escalones, contorno a 3:1 e interruptor con tema

**Descripción:** En oscuro, los escalones pasan a subir siempre (D10): página `#0c0c0c`, card `#151515`, campo `#1c1c1c`, borde `#272727` y `#333` en controles. El verde y el ámbar se desaturan y mantienen 4,5:1. El contorno en reposo de campos y botones secundarios pasa a ≥3:1 en los dos temas, con un token nuevo (T11). El interruptor recibe un `switchTheme` para que el thumb no quede negro en oscuro (PS15).

**Criterios de aceptación:**
- [ ] En oscuro, ningún campo es más oscuro que la card que lo contiene (P05, P24a, P31b) y el borde de un botón contorneado se ve sobre la card (P26, P30, P31a).
- [ ] El contorno de campos y botones secundarios mide ≥3:1 contra su superficie en claro y en oscuro.
- [ ] El thumb del interruptor se ve en los dos temas (P07M, P09).

**Verificación:**
- [ ] `gen_colors_test` con los valores nuevos y el test de contraste con los pares de contorno (verificación nueva).
- [ ] Capturas oscuras de P05, P07, P24a, P30 y P31b.

**Depende de:** nada · **Archivos:** `core/theme/gen_colors.dart`, `core/theme/app_theme.dart`, `shared/widgets/workspace_input_theme.dart`, `shared/widgets/app_button_styles.dart`, `test/core/gen_colors_test.dart` · **Tamaño:** M

## Tarea 7: Escala tipográfica de cuatro pasos

**Descripción:** D2 deja cuatro pasos: 20/700 título, 15/600 título de card o sección, 13/400 cuerpo y 11/700 rótulo en mayúsculas con tracking de 0,06 em. Roboto Mono queda solo para cifras y códigos, con números tabulares. `screenTitle` pasa a 20 y se agrega el 15/600 de card.

**Criterios de aceptación:**
- [ ] `AppTextStyles` expone los cuatro pasos. Los estilos que quedan fuera de la escala se mapean a uno de ellos.
- [ ] `technical` usa números tabulares (`FontFeature.tabularFigures`).
- [ ] Ninguna pantalla usa Roboto Mono para un rótulo o una fecha escrita en palabras (P04, P05).

**Verificación:**
- [ ] `theme_tokens_test` con los valores nuevos. El test de overflow de `ui_phase3_test` sigue en verde.

**Depende de:** nada · **Archivos:** `core/theme/app_text_styles.dart`, `core/theme/app_theme.dart`, `test/core/theme_tokens_test.dart` · **Tamaño:** S

## Tarea 8: Margen único de 16 dp, título de barra alineado e insets

**Descripción:** Todo arranca en la misma línea de 16 dp (D8). El título de la barra empieza en x≈56 dp (`titleSpacing`). `GenPageScaffold` suma el inset inferior y lateral del sistema para que el final de las listas no quede bajo la barra de navegación (T6).

**Criterios de aceptación:**
- [ ] El margen de página es de 16 dp en todas las pantallas (hoy hay 12 y 16).
- [ ] El título de la barra arranca en x≈56 dp con la flecha (P02-M2).
- [ ] Con navegación de 3 botones, la última card de Configuración se puede tocar.

**Verificación:**
- [ ] Test nuevo: `GenPageScaffold` con `MediaQuery.padding.bottom = 48` deja la última fila visible y tocable.
- [ ] Capturas de P02, P05 y P25.

**Depende de:** nada · **Archivos:** `core/theme/app_geometry.dart`, `shared/widgets/gen_page_scaffold.dart`, `core/theme/app_theme.dart`, `test/shared/surfaces_test.dart` · **Tamaño:** M

## Tarea 9: Cabecera compacta en las raíces

**Descripción:** En las pantallas raíz (Mi día, Proyectos, Tablero, Sectores, Grupos, Notas, Materiales, Recordatorios, Vence hoy y Portal), la cabecera es un título de 20/700 sin tile, un subtítulo de una línea en 13/400 gris y sin regla. La acción principal va en el mismo renglón que el título. En Configuración no se repite el título de la pestaña. El contenido empieza antes de los 160 dp (D1).

**Criterios de aceptación:**
- [ ] Ninguna raíz muestra el tile de 38 dp ni la regla.
- [ ] La acción principal (por ejemplo, "+" en Proyectos y Plantillas o "+ Nuevo" en Recordatorios) queda alineada con el título.
- [ ] En las subpáginas de Configuración, el contenido arranca antes de los 180 dp (P27-M1).

**Verificación:**
- [ ] Test: en P05 a 360 × 800, el primer contenido empieza por encima de los 160 dp.
- [ ] Tests que buscan el texto del título siguen verdes.
- [ ] Capturas de las raíces.

**Depende de:** 7, 8 · **Archivos:** `shared/widgets/gen_section_header.dart`, `shared/widgets/page_intro.dart`, `shared/widgets/gen_page_scaffold.dart`, tests · **Tamaño:** M

## Tarea 10: Cabecera de subpantalla y de entidad con miga

**Descripción:** Las subpantallas del proyecto (Documento, Archivos, Actividad, Acceso cliente y Materiales) muestran una miga de 12/500 gris con el nombre del proyecto y un título de 20/700, sin tile (PS13). Proyecto, sector y grupo comparten un encabezado de entidad: título 20/700, metadatos 13 gris, color como punto de 8 dp y "⋯" (P14-M1). Las migas tienen 48 dp de área táctil (T4).

**Criterios de aceptación:**
- [ ] Cada subpantalla dice de qué proyecto es (P17–P19, P07M-M1).
- [ ] El encabezado de proyecto, sector y grupo es el mismo componente.
- [ ] La miga mide ≥48 dp de alto táctil.

**Verificación:**
- [ ] `androidTapTargetGuideline` en el detalle de proyecto y en una subpantalla.
- [ ] Capturas de P07, P12, P14, P17, P18 y P19.

**Depende de:** 9 · **Archivos:** `shared/widgets/breadcrumb.dart`, encabezado de entidad (nuevo o existente en `shared/widgets/`), `features/documents/document_screen.dart`, `features/files/files_screen.dart`, `features/works/work_access_screen.dart` · **Tamaño:** M

## Checkpoint 1: bases

- [ ] `dart analyze` limpio y `flutter test` en verde.
- [ ] Capturas `despues` de las 41 pantallas en claro y oscuro, con el comparador regenerado.
- [ ] El usuario revisa las bases antes de seguir con los componentes.

## Fase 2 — Componentes

## Tarea 11: Filas de ajustes agrupadas de 56 dp

**Descripción:** Una card por grupo con rótulo 11/700 y filas de 56 dp (64 con dos líneas) separadas por divisores de 1 px, en lugar de una card por ítem. Íconos de 20 dp en gris y chevron en las filas que navegan. `listTileTheme.minTileHeight` pasa a 48 (T4).

**Criterios de aceptación:**
- [ ] Cuenta (P23) y Configuración (P25) entran en una pantalla con sus grupos.
- [ ] Ninguna fila tocable mide menos de 48 dp.

**Verificación:**
- [ ] `settings_parity_test` y `accessibility_audit_test` en verde, con las mismas aserciones.
- [ ] Capturas de P23 y P25.

**Depende de:** 9 · **Archivos:** `features/settings/settings_screen.dart`, `core/theme/app_theme.dart`, `shared/widgets/` (fila de ajuste) · **Tamaño:** M

## Tarea 12: Acciones de fila en "⋯" y botones de guardar con forma

**Descripción:** Las acciones secundarias y destructivas de una fila van a un menú "⋯" de 20 dp gris, con la destructiva en rojo adentro (D6). Guardar es un botón relleno o tonal alineado a la derecha del grupo que guarda (D7), nunca un enlace suelto ni un contorneado a todo el ancho.

**Criterios de aceptación:**
- [ ] Usuarios (P26u-M1), Clientes (P27-M4) y Acceso cliente (P19-M4) llevan sus acciones en "⋯".
- [ ] Ningún botón de guardar es un enlace de texto.

**Verificación:**
- [ ] Tests que tocaban esas acciones abren el menú primero (mismas claves).
- [ ] Capturas de P26, P27 y P19.

**Depende de:** 11 · **Archivos:** `shared/widgets/app_button_styles.dart`, `features/settings/settings_screen.dart`, `features/works/work_access_screen.dart`, tests · **Tamaño:** M

## Tarea 13: Una sola receta de campo

**Descripción:** Todos los campos usan la misma receta: rótulo arriba en 12/600 gris, relleno de campo, radio 6, 44 dp y valor en 14/400. Se acaban el rótulo flotante y la sugerencia que parece un valor. El rótulo queda asociado al campo para TalkBack (T1). "Copiar" va como ícono dentro del campo (P24a-M1). Los desplegables llevan el mismo chevron gris de 20 px.

**Criterios de aceptación:**
- [ ] `LabeledField` y `ToolbarFilterField` anuncian su rótulo.
- [ ] El interruptor "Solo insumos" y la casilla de grupo tienen nombre accesible.
- [ ] Ningún campo usa rótulo flotante (P09, P28, P32).

**Verificación:**
- [ ] `labeledTapTargetGuideline` en el alta de proyecto, los filtros y los materiales (verificación nueva).
- [ ] Capturas de P06, P24a, P28 y P31b.

**Depende de:** 6 · **Archivos:** `shared/widgets/labeled_field.dart`, `shared/widgets/list_toolbar.dart`, `shared/widgets/app_dropdown_decoration.dart`, `shared/widgets/field_suffix.dart`, `shared/widgets/workspace_input_theme.dart` · **Tamaño:** M

## Tarea 14: Un solo estado vacío

**Descripción:** Todos los vacíos tienen la misma forma: card de radio 8 anclada a 48 dp de la cabecera, ícono de 32 dp en `brandFill`, título 15/600 y texto 13/400 gris. Si hay una acción, va como botón tonal.

**Criterios de aceptación:**
- [ ] P18, P19, P20, P22, P24a, P28, P29 y P32 usan el mismo componente.
- [ ] El vacío sigue anunciándose con `liveRegion`.

**Verificación:**
- [ ] `state_views_test` cubre ícono, título, texto y acción.
- [ ] Capturas de P18, P20 y P22.

**Depende de:** 7 · **Archivos:** `shared/widgets/state_views.dart`, `shared/widgets/app_state_block.dart`, `test/shared/state_views_test.dart` · **Tamaño:** S

## Tarea 15: Color con significado

**Descripción:** El progreso va siempre en azul de marca, con barra de 4 dp, y en verde solo al 100 %. El plazo es neutro si hay margen, ámbar a 3 días o menos y rojo si venció, sin itálica. Los estados usan el mismo color en todas las pantallas: Pendiente neutro, En curso azul y Terminado verde. El verde deja de marcar "recordatorio individual" (D5).

**Criterios de aceptación:**
- [ ] La misma barra y los mismos colores en card, detalle, sector y portal.
- [ ] El plazo cambia de color por días restantes y nunca va en itálica.

**Verificación:**
- [ ] `count_progress_test` y `chips_notices_test` cubren el verde al 100 % y los tres plazos.
- [ ] Capturas de P05, P07, P11, P21 y P33.

**Depende de:** 6 · **Archivos:** `shared/widgets/card_progress.dart`, `shared/widgets/progress_line.dart`, `shared/widgets/status_chip.dart`, `features/reminders/reminder_scope_color.dart`, tests · **Tamaño:** M

## Tarea 16: El nombre como título de la card de entidad

**Descripción:** El nombre de proyecto, sector o grupo es el título de su card en 15/600 y en su caja original, hasta dos líneas, y no un chip gris en mayúsculas (D4). Los chips quedan para metadatos.

**Criterios de aceptación:**
- [ ] P05, P11, P13 y P33 muestran el nombre como título.
- [ ] El color de sector o grupo aparece como punto de 8 dp.

**Verificación:**
- [ ] `works_dashboard_test`, `groups_parity_test` y `sector_summary_test` en verde.
- [ ] Capturas de P05, P11, P13 y P33.

**Depende de:** 15 · **Archivos:** `shared/widgets/name_pill.dart`, `features/works/work_card.dart`, `features/portal/portal_screen.dart`, cards de sector y grupo · **Tamaño:** M

## Tarea 17: Franja de KPI de 72 dp

**Descripción:** Los cuatro KPI pasan a una sola card con divisores verticales, con la cifra en 20/700 mono y el rótulo en 11/700, sin "· %". Si el total es 0, la franja no se muestra (P08-M1).

**Criterios de aceptación:**
- [ ] P05 y P08 muestran la franja de ~72 dp, y P35 la de 3 valores.
- [ ] Sin datos, no hay franja.

**Verificación:**
- [ ] `stat_cards_test` con la nueva forma.
- [ ] Capturas de P05, P08 y P35.

**Depende de:** 7 · **Archivos:** `shared/widgets/stat_cards.dart`, `shared/widgets/kpi_tile.dart`, `test/shared/stat_cards_test.dart` · **Tamaño:** S

## Tarea 18: Fila de tarea con una sola acción visible

**Descripción:** La fila muestra la casilla, el título y, como mucho, el sol si la tarea está en Mi día. "Agregar subtarea" y "Eliminar" pasan a un "⋯" de 48 dp. El contador "1/2" pasa a texto de 12 gris debajo del título. El sol activo va en azul de marca y el inactivo en gris (P04-M5).

**Criterios de aceptación:**
- [ ] A 360 dp, el texto de la tarea tiene ≥160 dp de ancho (T3).
- [ ] Las tres acciones siguen disponibles con los mismos permisos.

**Verificación:**
- [ ] Aserción nueva en `ui_phase3_test`: ancho del texto ≥160 dp a 360 dp.
- [ ] `task_widgets_test` y `daily_parity_test` abren el menú para las acciones movidas.
- [ ] Capturas de P04, P07 y P12.

**Depende de:** 6 · **Archivos:** `shared/widgets/task_tile.dart`, `test/shared/task_widgets_test.dart`, `test/ui_phase3_test.dart`, `test/features/daily_parity_test.dart` · **Tamaño:** M

## Tarea 19: Compositor de 48 dp con el teclado en cuenta

**Descripción:** El compositor del detalle de proyecto y de sector pasa a una sola barra de 56 dp: campo "Nueva tarea en…" con el destino como chip dentro y botón de enviar de 40 dp (P07-M1). "Descripción y ayuda" va al "⋯" de la entidad (P12-M5). El alto máximo se calcula con el espacio que deja el teclado (T8).

**Criterios de aceptación:**
- [ ] Sin foco, el compositor ocupa ≤56 dp.
- [ ] Con el teclado abierto en horizontal, no tapa toda la lista ni desborda.

**Verificación:**
- [ ] Test con `viewInsets.bottom` en 800 × 360: sin overflow.
- [ ] Capturas de P07 y P12.

**Depende de:** 18 · **Archivos:** `shared/widgets/task_composer.dart`, `features/works/work_detail_screen.dart`, `features/sectors/sector_detail_screen.dart`, tests · **Tamaño:** M

## Tarea 20: Pestañas de Configuración legibles

**Descripción:** La pestaña activa se lleva al centro y la primera abre completa, con 16 dp en los extremos y un degradado de 24 dp del lado que tiene más contenido. La pestaña y el título dicen lo mismo ("Configuración", "Producción" ↔ "Etapas").

**Criterios de aceptación:**
- [ ] Ninguna pestaña abre cortada (P28L-M1).
- [ ] Cada pestaña y su título usan el mismo nombre.

**Verificación:**
- [ ] `settings_tabs_test` cubre la pestaña activa visible.
- [ ] Capturas de P25, P27 y P28.

**Depende de:** 9 · **Archivos:** `features/settings/settings_tabs.dart`, `shared/widgets/gen_tab_bar.dart`, `test/features/settings_tabs_test.dart` · **Tamaño:** S

## Checkpoint 2: componentes

- [ ] `dart analyze` limpio y `flutter test` en verde.
- [ ] Capturas de todas las pantallas que cambiaron; el usuario revisa P05, P07, P23 y P28.

## Fase 3 — Pantallas

Cada tarea aplica lo que le queda a cada pantalla después de las fases 1 y 2, con su boceto como referencia, y marca en la auditoría qué resolvió el componente y qué la pantalla.

## Tarea 21: Acceso y Servidores (P01, P02)

**Criterios de aceptación:**
- [ ] P01: visor QR cuadrado de 240 dp con esquinas de encuadre y el error adentro; "Escaneá el QR de tu sistema" como título; "Escribir dirección a mano" como botón tonal (relleno si falla la cámara); pasos numerados en círculos.
- [ ] P02: fila de 72 dp con la sesión como punto verde y texto; lengüeta de 3 px en el activo y "⋯" en lugar del tacho.

**Verificación:** `server_setup_test` y `servers_screen_test`. Capturas sin cámara real: el permiso sigue revocado y el visor muestra el error. · **Tamaño:** M

## Tarea 22: Navegación (P03)

**Criterios de aceptación:**
- [ ] Ítems y subítems en 14/500 sobre un solo eje; contadores de 18 dp sin borde, en mono.
- [ ] El nombre del proyecto va primero y el grupo como sufijo.
- [ ] Sin `Tooltip` duplicado en los ítems (T9), con filas de ≥48 dp (T4).

**Verificación:** `navigation_parity_test` con `androidTapTargetGuideline` en el drawer. Captura del drawer en claro y oscuro. · **Tamaño:** S

## Tarea 23: Mi día y Tablero (P04, P10)

**Criterios de aceptación:**
- [ ] P04: "Lunes 26 de octubre · 3 de 9 completadas" en una línea con barra de 4 dp. El grupo dice proyecto › objetivo, sin "☀ Mi día". El origen de la tarea tiene 48 dp táctiles (T4).
- [ ] P10: tareas agrupadas por proyecto dentro de la columna, anillo de estado de 16 dp y `CountBadge`.

**Verificación:** `daily_parity_test` y `qa10_roles_a11y_test` adaptados al nuevo formato de fecha, con la misma verificación. Capturas. · **Tamaño:** M

## Tarea 24: Proyectos, Crear proyecto y Plantillas (P05, P06, P08)

**Criterios de aceptación:**
- [ ] P05: controles de 40 dp con relleno; "3 PROYECTOS" como rótulo de la lista; meta "29 oct · 3 días".
- [ ] P06: diálogo centrado en los dos temas, velo al 60 %, contador alineado al campo y "Cancelar" como botón de texto.
- [ ] P08: "+" de 40 dp en la cabecera y vacío con el ícono de plantillas.

**Verificación:** `works_dashboard_test` y `create_work_dialog_test`. Capturas. · **Tamaño:** M

## Tarea 25: Detalle de proyecto y su pestaña Materiales (P07, P07M)

**Criterios de aceptación:**
- [ ] P07: una card con Descripción, Avance, Fecha límite, Etiquetas y Código separados por divisores; Lista/Tablero como segmentado en una fila de 40 dp.
- [ ] P07M: buscador a ancho completo; "Solo insumos" como fila con interruptor; el vacío ofrece "Agregar material" con el alta que ya existe (`_add`).

**Verificación:** `materials_test` y `work_summary_test`. Capturas. · **Tamaño:** M

## Tarea 26: Sectores y grupos (P11–P14)

**Criterios de aceptación:**
- [ ] P11: buscador y filtros sin card contenedora; cabecera de grupo como rótulo con chevron.
- [ ] P12: Lista/Tablero como dos íconos de 36 dp junto a "Tareas"; "AVANCE" con cifra mono.
- [ ] P13: una card con filas de 56 dp y chip neutro "Pública".
- [ ] P14: filas de 56 dp; "MIEMBROS 2" con "Agregar" tonal; avatares de iniciales; sin violeta propio.

**Verificación:** `groups_parity_test` y `sector_summary_test`. Capturas. · **Tamaño:** M

## Tarea 27: Notas y Documento (P15–P17)

**Criterios de aceptación:**
- [ ] P15: fecha en el renglón del título, extracto de dos líneas y sin ícono.
- [ ] P16 y P17: barra de formato con radio 6 y relleno dentro del margen; un solo indicador "Guardado ✓"; ✓ tonal solo si hay cambios.

**Verificación:** `documents_parity_test`. Capturas. · **Tamaño:** M

## Tarea 28: Archivos, Actividad y Acceso cliente (P18, P19)

**Criterios de aceptación:**
- [ ] P18: "Recargar" oculto mientras la carpeta no está habilitada.
- [ ] P19: explicación de dos líneas con "Clientes del grupo" como enlace; filas de 56 dp con avatar y chip de estado.

**Verificación:** tests de archivos y acceso. Capturas. · **Tamaño:** S

## Tarea 29: Materiales y Recordatorios (P20, P21)

**Criterios de aceptación:**
- [ ] P20: sin buscador mientras no haya materiales; ícono propio en el vacío.
- [ ] P21: celdas de 44 dp sin líneas y hoy en un círculo de 28 dp; mes y grilla en una card; alcance como chip de texto; segmentado sin check; botón del mes de 48 dp (T4).

**Verificación:** `reminders_advanced_test` con `androidTapTargetGuideline`. Capturas. · **Tamaño:** M

## Tarea 30: Vence hoy, Cuenta, Vincular con Claude y App móvil (P22–P24b)

**Criterios de aceptación:**
- [ ] P22: una sola cabecera "Vence hoy · 0", sin el bloque "Avisos pendientes".
- [ ] P23: perfil de 72 dp, columna de íconos fija y "Sistema · v1.0.0" en una fila.
- [ ] P24a: "TUS TOKENS" con "Generar token" a la derecha del grupo; pasos numerados.
- [ ] P24b: QR con `qr_flutter` en una card de 200 dp; dirección con copiar adentro; aviso ámbar con `app_inline_notice`.

**Verificación:** `connect_link_test` y test nuevo del QR (codifica la dirección del sistema). Capturas. · **Archivos extra:** `pubspec.yaml` (`qr_flutter`) · **Tamaño:** M

## Tarea 31: Configuración, Acceso, Usuarios y Clientes (P25–P27)

**Criterios de aceptación:**
- [ ] P25: tema como segmentado de 3 opciones de 32 dp, sin "Tema: Sistema".
- [ ] P26: modo de acceso como chip con "Editar"; rol como chip; avatares de iniciales y cards del mismo alto.
- [ ] P27: nombre 15/600 con chip "Sin ingresar"; "Agregar cliente" relleno junto al título.

**Verificación:** `settings_parity_test` y `qa10_roles_a11y_test`. Capturas. · **Tamaño:** M

## Tarea 32: Catálogos: Etapas, Etiquetas y Estados (P28, P29)

**Criterios de aceptación:**
- [ ] Desplegable de ámbito y botón "Agregar" separados; el botón deja de ir a todo el ancho.
- [ ] Filas de 56 dp con punto de color y "⋯" en lugar de cuatro `IconButton`; subir y bajar dentro del menú o con el reordenar de siempre.
- [ ] P29: secciones "EN CURSO" y "FINAL · 1" como explicación.

**Verificación:** tests de catálogos con el menú. Capturas con datos de ejemplo (excepción de la spec). · **Archivos:** `features/settings/catalog_settings_screen.dart`, tests · **Tamaño:** M

## Tarea 33: Sistema: Recordatorios, Almacenamiento, Genstock y Errores (P30–P32)

**Criterios de aceptación:**
- [ ] P30: "ZONA HORARIA" con "Cambiar" en la misma fila; Gmail con chip "Sin conectar" y botón relleno.
- [ ] P31a: chip "Activo", pares SERVIDOR y USUARIO, y "Probar conexión" y "Editar" lado a lado.
- [ ] P31b: chip "Sin configurar", "Probar conexión" y "Guardar" alineados a la derecha.
- [ ] P32: segmentado "Abiertos · Resueltos · Todos" y filas de 64–72 dp.

**Verificación:** `genstock_settings_test` y `settings_parity_test`. Capturas. · **Tamaño:** M

## Tarea 34: Portal y TV (P33–P35)

**Criterios de aceptación:**
- [ ] P33: un solo ícono de tema y "Mis proyectos" sin tile; pie con fecha mono y chip de plazo.
- [ ] P34: sin miga; descripción de 3 líneas con "Ver más"; resumen de dos columnas ENTREGA y AVANCE; subtareas con sangría y divisores.
- [ ] P35: agrupada por proyecto con subencabezado una vez; chips de estado iguales en los dos temas.

**Verificación:** tests del portal y de TV. Capturas con los roles `cliente` y `lector`. · **Tamaño:** M

## Checkpoint 3: pantallas

- [ ] `dart analyze` limpio y `flutter test` en verde.
- [ ] Las 41 pantallas con captura `despues` en claro y oscuro, al lado de su boceto en el comparador.
- [ ] Los 152 hallazgos marcados en `auditoria-premium.md` como resueltos, en parte o descartados con su motivo.
- [ ] El usuario revisa en el comparador.

## Fase 4 — Técnico

## Tarea 35: Listas virtualizadas (T2)

**Criterios de aceptación:**
- [ ] Proyectos, tareas del proyecto, tareas del sector y Mi día se arman con slivers perezosos, con el marco de panel dibujado con `DecoratedSliver`.
- [ ] La tabla de proyectos no usa `IntrinsicColumnWidth`.

**Verificación:** test con 300 tareas: solo se construyen las filas visibles. Medición en `--profile` antes y después con un proyecto de 200 tareas. · **Archivos:** `shared/widgets/workspace_panel.dart`, `features/works/works_list_screen.dart`, `features/works/work_table.dart`, `features/works/work_detail_screen.dart`, `features/sectors/sector_detail_screen.dart` · **Tamaño:** L (si no entra en una sesión, se parte en panel + proyectos y detalle + sector)

## Tarea 36: Atrás predictivo y arranque (T5, T13)

**Criterios de aceptación:**
- [ ] En Android, el `pop` usa `PredictiveBackPageTransitionsBuilder` y el `push` conserva el fundido; con animaciones desactivadas, corte.
- [ ] `enableOnBackInvokedCallback="true"` en el manifiesto; los `PopScope` con `canPop: false` siguen esperando el guardado.
- [ ] `runApp` no espera a Firebase.

**Verificación:** tests de `PopScope` existentes; manual en el emulador con el gesto atrás. · **Tamaño:** S

## Tarea 37: Tablet y ventanas anchas (T7)

**Criterios de aceptación:**
- [ ] A ≥840 dp, drawer fijo; a ≥600 dp, contenido limitado a ~720 dp y `WorkCard` en grilla.
- [ ] Sin overflow a 800 × 360 ni a 1024 × 768.

**Verificación:** el test de overflow corre también en esos dos tamaños (verificación nueva). · **Tamaño:** M

## Tarea 38: TalkBack: una parada por fila y colores con nombre (T9, T10)

**Criterios de aceptación:**
- [ ] Cada fila de la tabla de proyectos es una sola parada con una etiqueta compuesta.
- [ ] La paleta anuncia "Rojo", "Ámbar"… en lugar del hexadecimal, una sola vez.

**Verificación:** tests de semántica de la tabla y de `ColorPalette`. · **Tamaño:** S

## Checkpoint 4: Android completo

- [ ] Re-auditoría técnica en el emulador: 360 × 800, 800 × 360, tablet de 1280 × 800, letra al 1,3 y al 2,0, navegación de 3 botones.
- [ ] El usuario revisa Android antes de pasar a la web.

## Fase 5 — Web

Antes de tocar Next.js, leer `node_modules/next/dist/docs/` (AGENTS.md). El detalle de estas tareas se ajusta en el checkpoint 4 con lo que cambió de verdad en Android. Comandos: `npx vitest run`, `npx tsc --noEmit` y `npm run build`.

## Tarea 39: Web — tokens oscuros, contorno a 3:1 y margen de 16

**Criterios de aceptación:**
- [ ] Los tokens de `@gen/ui` coinciden con los de `GenColors` (escalones oscuros, verde y ámbar, contorno).
- [ ] `.main` usa 16 px de margen en móvil.

**Verificación:** tests de tokens de la web; capturas web de P05, P07 y P25 en los dos temas. · **Tamaño:** M

## Tarea 40: Web — cabeceras de raíz, subpantalla y entidad

**Criterios de aceptación:**
- [ ] Las mismas tres cabeceras que en Android, con el contenido empezando a la misma altura.

**Verificación:** capturas web de las raíces y las subpantallas. · **Tamaño:** M

## Tarea 41: Web — filas, acciones, campos y vacíos

**Criterios de aceptación:**
- [ ] Filas de ajustes agrupadas, acciones en "⋯", una receta de campo y un estado vacío, como en Android.

**Verificación:** tests de la web en verde; capturas de Configuración. · **Tamaño:** M

## Tarea 42: Web — cards de entidad, color, KPI, fila de tarea y pestañas

**Criterios de aceptación:**
- [ ] Nombre como título, progreso y plazo con el mismo criterio, franja de KPI, fila de tarea con una acción visible y pestañas legibles.

**Verificación:** tests de la web en verde; capturas de P05, P07 y P11. · **Tamaño:** M

## Tarea 43: Cierre — banco de capturas y documentación

**Criterios de aceptación:**
- [ ] Par web/Android de las 41 pantallas en claro y oscuro (banco `comparativa`), revisado.
- [ ] `inventario.md` y `auditoria-premium.md` actualizados; DESIGN.md con los tokens y la escala nuevos.

**Verificación:** comparador regenerado; `flutter test`, `npx vitest run` y `npm run build` en verde. · **Tamaño:** M

## Checkpoint final

- [ ] Android y la web coinciden en las 41 pantallas y siguen los bocetos.
- [ ] El usuario revisa antes de abrir un PR.
