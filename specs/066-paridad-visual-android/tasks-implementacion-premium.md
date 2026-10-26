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
- [ ] La barra muestra la miga (`Cartelería del local › Preparación y entrega`; `#Impresión` en una tarea de sector) y no el texto de la tarea.
- [ ] "⋯" ofrece solo las acciones permitidas, con las mismas condiciones de hoy. Borrar va en rojo y sigue pidiendo confirmación.
- [ ] El título se edita en el lugar y se guarda con el tilde (`task_text_save`) o con Enter.
- [ ] Historial de estados abre un diálogo con la misma lista de hoy.

**Verificación:**
- [ ] Test nuevo en `task_detail_premium_test.dart`: miga, menú con sus ítems según permisos, historial en diálogo.
- [ ] `ui_phase3_test` y `objectives_parity_test` adaptados (Borrar y mover desde el menú; título fuera de la barra), con las mismas verificaciones.

**Depende de:** nada · **Archivos:** `task_detail_sheet.dart`, `test/features/task_detail_premium_test.dart` (nuevo), `test/ui_phase3_test.dart`, `test/features/objectives_parity_test.dart` · **Tamaño:** M

## Tarea 2: Fila de chips — estado, Mi día, Urgente y Recordatorio

**Descripción:** Debajo del título, una fila de chips de 32 dp: los estados (como hoy), Mi día (`FilterChip`, `task_my_day`), Urgente (`FilterChip`, `task_urgent`) y Recordatorio (`ActionChip`, `task_reminder`). `TaskNotificationControls` pasa a dar los dos chips. La cantidad de destinatarios de Urgente va en la descripción accesible del chip y en un aviso al activarlo; sin destinatarios, el chip explica por qué no avisa.

**Criterios de aceptación:**
- [ ] Los cuatro controles hacen lo mismo que hoy, con los mismos permisos.
- [ ] Sin permiso para Mi día, el chip no aparece (hoy el interruptor no aparece).
- [ ] Ninguna fila con interruptor queda en la pantalla.

**Verificación:**
- [ ] Tests nuevos: tocar cada chip llama a la acción correcta; aviso de destinatarios.
- [ ] `notifications_test`, `daily_parity_test` y `ui_phase3_test` adaptados (`FilterChip.selected` en lugar de `SwitchListTile.value`; `task_my_day`).

**Depende de:** 1 · **Archivos:** `task_detail_sheet.dart`, `lib/features/notifications/task_notification_controls.dart`, tests · **Tamaño:** M

## Tarea 3: "Asignada a" y selector "+ Asignar"

**Descripción:** Un bloque "ASIGNADA A" con los chips que hoy aparecen sueltos (proyecto, sector, personas, objetivo, vencimiento y etiquetas) y un chip punteado "+ Asignar" que abre un diálogo con buscador y dos grupos, Sectores y Personas, cargados con `suggest`. Al elegir, agrega `#sector` o `@persona` al final del texto y guarda.

**Criterios de aceptación:**
- [ ] Elegir un sector guarda `texto #Sector`; elegir una persona guarda `texto @persona`.
- [ ] En una tarea de sector no aparece el grupo Sectores.
- [ ] Sin permiso de editar el texto, "+ Asignar" no aparece.
- [ ] Errores de carga o de guardado se muestran con el aviso de error de la app.

**Verificación:**
- [ ] Tests nuevos con el arnés de API: lista, búsqueda, guardado del texto, permisos y contexto de sector.

**Depende de:** 1 · **Archivos:** `task_detail_sheet.dart`, `lib/features/tasks/task_assign_dialog.dart` (nuevo), tests · **Tamaño:** M

## Tarea 4: Descripción y subtareas como bloques principales

**Descripción:** La descripción va en una card con rótulo "DESCRIPCIÓN", campo de 6 líneas, "Guardado ✓" si no hay cambios y botón tonal "Guardar" si los hay. Las subtareas, en una card con rótulo, contador "hechas/total", botón de ordenar, filas de 48 dp con divisor y "Nueva subtarea…" adentro de la card.

**Criterios de aceptación:**
- [ ] La descripción se guarda igual que hoy (vacía = sin descripción) y un borrador no se pierde al recargar.
- [ ] El contador refleja las subtareas hechas.
- [ ] Ordenar y crear subtareas funcionan igual que hoy.

**Verificación:**
- [ ] Tests nuevos: "Guardado ✓" y botón según cambios; contador.
- [ ] `daily_parity_test` (borrador de descripción y subtarea nueva) sigue verde sin cambios de lógica.

**Depende de:** 1 · **Archivos:** `task_detail_sheet.dart`, tests · **Tamaño:** S

## Tarea 5: Cierre del piloto

**Descripción:** Capturas de P09 en claro y oscuro, revisión contra el boceto, y actualización de `auditoria-premium.md` (hallazgos de P09 resueltos) y de `inventario.md`.

**Criterios de aceptación:**
- [ ] `despues/P09-detalle-tarea-admin-{light,dark}-390-android.png` nuevas, con el oscuro verificado.
- [ ] Los hallazgos P09-M que resuelve el piloto quedan marcados.

**Verificación:**
- [ ] `dart analyze` limpio, `flutter test` en verde, comparador regenerado.

**Depende de:** 1–4 · **Archivos:** specs y capturas · **Tamaño:** S

## Checkpoint: piloto

- [ ] Todos los tests pasan y la pantalla sigue el boceto en claro y oscuro.
- [ ] El usuario revisa el piloto antes de planificar las fases siguientes (PS1–PS15).
