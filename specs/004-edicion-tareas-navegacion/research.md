# Research: Edición inline de tareas y navegación mejorada

**Fecha**: 2026-07-03 | **Spec**: [spec.md](spec.md)

## R1. Matching de etiquetas con nombres multi-palabra (fix US2)

- **Decision**: función pura `tagMatchesName(tag, name)` en `src/lib/domain/tags/matching.ts`:
  compara formas canónicas donde espacios y guiones son equivalentes (normalizar con
  `normalizeTagName` + colapsar `[-\s]+` a un separador único). Complemento `toTagForm(name)`:
  convierte un nombre visible a forma etiquetable (espacios→`-`, conserva letras/números/guiones).
  La resolución del servidor (`resolveTask`) y el suggest usan `tagMatchesName`; si la igualdad
  canónica no matchea, fallback a PREFIJO ÚNICO (un solo candidato cuyo nombre canónico empieza
  con la etiqueta → se usa; 2+ candidatos → unresolved, la UI ofrece elegir/crear). El
  autocompletado inserta `toTagForm(s.name)` en el texto.
- **Rationale**: el parser queda intacto (no acepta espacios en etiquetas — correcto). `/Tina`
  resuelve por prefijo único a "Tina - Remodelación de paneles"; el picker inserta
  `/Tina-Remodelacion-de-paneles` que matchea por equivalencia espacio≡guion. Cubre FR-305 sin
  ambigüedad silenciosa.
- **Alternatives considered**: permitir espacios en etiquetas del parser (ambiguo: dónde termina
  la etiqueta y empieza la tarea); chips tipo mention en el input (mejor UX pero requiere editor
  rico en cada fila — desproporcionado hoy); exigir nombres de proyecto sin espacios (rompe
  nombres reales tipo "Tina - Remodelación").

## R2. Edición inline de tareas (US1)

- **Decision**: `TaskItem` gana modo edición: click en el texto (zona de texto, no la casilla)
  cambia a `TaskInlineEdit` — un `<input>` con el `rawText` de la tarea, autoenfocado. Enter o
  blur → `PATCH /api/tasks/{id}` (existente, re-parsea); Escape → cancela; texto vacío → no
  guarda (restaura). El autocompletado `/#@` se comparte extrayendo la lógica de
  TaskListEditor/TaskInput a un hook `useTagAutocomplete` (detección del trigger, fetch suggest,
  selección e inserción con `toTagForm`). Las etiquetas sin resolver devuelven 409 → mismo panel
  "crear o corregir" que la captura.
- **Rationale**: PATCH ya existe y re-parsea (FR-008 de la 001); solo falta la superficie de UI.
  El hook evita 3 copias de la misma lógica (captura proyecto, captura sector, edición).
- **Alternatives considered**: contenteditable por fila (complejidad de caret/labels sin
  beneficio); editor TipTap por fila (peso desproporcionado para una línea).

## R3. Aviso "Tarea enviada a /X" (US2)

- **Decision**: componente `Toast` mínimo propio (portal, auto-dismiss 5 s, rol status
  aria-live="polite", enlace opcional). Tras crear/editar, si `task.workId` difiere del
  `contextWorkId` (o la suelta ganó workId), la vista quita la tarea (el refresh ya lo hace) y
  dispara el toast "Tarea enviada a /{nombre}" con link a `/works/{id}` si el usuario puede
  abrirlo (la respuesta del PATCH/POST incluye `work {id, name}`; si no puede abrirlo el server
  no lo expone → sin link).
- **Rationale**: FR-306; el design system pide toasts no bloqueantes con auto-dismiss 3-5 s.
- **Alternatives considered**: dejar que la tarea "desaparezca" sin aviso (confuso — es el origen
  del reporte del usuario); diálogo modal (interrumpe la carga en serie).

## R4. Dashboard con drawer colapsable (US3)

- **Decision**: el board para usuarios no-Lector se renderiza dentro del layout con drawer
  (mismo shell). El drawer de toda la app gana estado `collapsed` (localStorage
  `gw:drawer-collapsed`): colapsado = totalmente oculto, queda un botón fijo discreto
  (PanelLeft, esquina superior izquierda) para reabrirlo; el botón de colapsar vive en el header
  del drawer. `BoardNav` (hamburguesa flotante) se elimina. Para rol Lector el board sigue
  renderizándose sin shell (pantalla limpia, como hoy).
- **Rationale**: FR-307/308 — un solo mecanismo de colapso para toda la app resuelve también el
  pedido de TV ("ocultar y volver a mostrar"); elimina el elemento flotante que molesta.
- **Alternatives considered**: mini-rail de íconos al colapsar (más código, el usuario pidió
  ocultar); mantener página /board fuera del shell con drawer propio (duplica navegación).

## R5. Grupos expandibles + ícono admin (US4a/b)

- **Decision**: en `DrawerNav`, "Grupos" pasa a sublista expandible (mismo patrón que Proyectos/
  Sectores, datos de `/api/groups`, tope 10 + "ver todos", refresco por SSE). "Administración"
  con ícono `Settings` (ya exportado en icons.tsx).
- **Rationale**: FR-309/310; reusa el componente `group()` interno existente.

## R6. Tema claro/oscuro/sistema (US4d)

- **Decision**: variables CSS por tema: los tokens actuales quedan como claro; bloque
  `[data-theme="dark"]` redefine (--bg, --surface, --text, --muted, --border, --accent-soft,
  fondos de tags y estados) con contraste AA. Preferencia en localStorage `gw:theme`
  (`light|dark|system`); `ThemeToggle` en el pie del drawer (3 opciones con íconos Sun/Moon/
  Monitor). Script inline en `<head>` (layout raíz) aplica `data-theme` antes del primer paint
  (anti-FOUC); en modo system escucha `prefers-color-scheme` y actualiza en vivo. `color-scheme`
  CSS para controles nativos.
- **Rationale**: FR-311 + guía del design system (dark mode con variantes tonales, no inversión;
  pares de contraste verificados). localStorage alcanza (assumption: preferencia por
  dispositivo).
- **Alternatives considered**: next-themes (dependencia extra para lo que son 40 líneas);
  preferencia en servidor por usuario (fuera de alcance v1).

## R7. Mudanza de tareas sueltas de sector (US1 esc. 5)

- **Decision**: sin cambios de dominio: `saveTask` en PATCH ya resuelve `/proyecto` explícito
  (gana al contexto) y conserva el EXEC del sector hogar como vínculo al guardar desde esa vista.
  Verificación en quickstart; si el EXEC del sector hogar no se preserva al asignar work
  (sectorId hogar se anula), asegurar que la tarea quede con TaskLink EXEC al sector (regla
  FR-038 de la 001: tarea creada/editada desde un sector lleva EXEC a ese sector).
- **Rationale**: la semántica ya está especificada en 001; esto es verificación + ajuste menor si
  hace falta.
