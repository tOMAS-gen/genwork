# Feature Specification: Migración de Sectores a Tailwind, mismo diseño visual (piloto de migración)

**Feature Branch**: `047-tailwind-piloto-sectores`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Instalar y configurar Tailwind CSS en genwork (Next.js 15 App Router) como el arranque de migrar toda la app a Tailwind, empezando por la sección Sectores como piloto completo. Alcance: agregar Tailwind CSS de verdad al proyecto (dependencia, postcss.config, tailwind.config), mapear el theme de Tailwind contra los tokens de color YA existentes en globals.css (no la paleta default de Tailwind), respetar el mecanismo de dark mode por atributo `[data-theme=\"dark\"]`, y reescribir con clases utilitarias de Tailwind toda la sección Sectores (lista, tarjeta, diálogo de creación, y el detalle de sector que sigue siendo página completa, sin convertirse en panel lateral). Dirección visual: fondo plano sin sombra, borde de 1px, kicker de ámbito, badge con punto de color, barra de progreso fina de 4px, números tabulares monoespaciados; corregir que el badge de ámbito no aparece en la vista de tabla; mostrar nota en el estado vacío de un sector sin tareas en vez de ocultar el bloque de progreso. Explícitamente fuera de alcance: migrar cualquier otra página, borrar globals.css, cambiar lógica de permisos/datos/comportamiento, o agregar un framework de testing de componentes. Escopeado a Sectores como piloto porque migrar las 4266 líneas de globals.css de toda la app en una sola pasada es inabarcable — el resto de la app se migra en features posteriores."

## Clarifications

### Session 2026-07-12

- Q: `CreateSectorDialog` usa el componente compartido `src/components/ui/Dialog.tsx` (usado por otros diálogos de la app, no solo Sectores). ¿Se restylea también ese componente compartido, o se deja intacto y solo se restylea el contenido propio de `CreateSectorDialog`? → A: Restylear también `Dialog.tsx` — se acepta como única excepción explícita al límite "no filtrar cambios fuera de Sectores": el marco/backdrop de TODOS los diálogos de la app cambia de apariencia en esta feature, no solo los de Sectores.

### Session 2026-07-12 (corrección de rumbo, en implementación)

- Q: La primera implementación aplicó un lenguaje visual nuevo (estilo Vercel/Tailwind: bordes finos sin sombra, badge de ámbito con punto de color, barra de progreso de 4px en color de acento, kicker "ÁMBITO", nombre sin mayúscula forzada) — el usuario lo vio en el navegador y no le gustó ("no me gusta el diseño es muy diferente, solo quiero la migración a Tailwind"). ¿Se mantiene ese lenguaje visual nuevo o se revierte al diseño actual (el de antes de esta feature), migrado a Tailwind sin cambiar cómo se ve? → A: Revertir — el resultado visual debe ser el mismo que tenía la app antes de esta feature (tarjeta con sombra al hover en vez de borde de acento, pill de nombre con fondo de color y mayúscula, badge de ámbito plano sin punto, barra de progreso de 8px en color `--ok`/verde), solo que implementado con clases de Tailwind en vez de las clases de `globals.css`. Se mantienen únicamente las dos correcciones de la auditoría que agregan información faltante sin cambiar el estilo existente: el badge de ámbito también en la vista de tabla (US2) y la nota "Sin tareas todavía" en el estado vacío (US3) — ambas reutilizando el mismo look plano (sin punto de color) que ya tenía `.pc-scope-pill`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La lista de sectores se ve igual que siempre, ahora con Tailwind (Priority: P1)

Como usuario que abre la lista de Sectores, quiero verla exactamente igual que antes (misma tarjeta con pill de nombre coloreado, sombra al pasar el mouse, badge de ámbito plano, barra de progreso verde), para no tener que reaprender nada — la única diferencia es la herramienta con la que está construida por dentro.

**Why this priority**: Es el cambio central pedido — sin esto no hay migración a Tailwind creíble, y un resultado visual distinto al actual es exactamente lo que el usuario pidió evitar.

**Independent Test**: Se puede probar entrando a `/sectors` en la vista de grilla y comparando visualmente contra cómo se veía la app antes de esta feature: mismo pill de nombre con fondo de color y mayúscula, mismo badge de ámbito plano, misma barra de progreso verde de 8px, misma sombra al pasar el mouse por una tarjeta.

**Acceptance Scenarios**:

1. **Given** la lista de sectores con datos reales, **When** un usuario la abre en modo claro, **Then** cada tarjeta se ve igual que antes de esta feature: pill de nombre en mayúscula con fondo de color (o gris si el sector no tiene color), badge de ámbito plano con el nombre del ámbito (sin punto de color), barra de progreso verde, y sombra al pasar el mouse (no un borde de acento).
2. **Given** esa misma lista, **When** el usuario cambia el tema de la aplicación a oscuro, **Then** la tarjeta se ve correctamente en oscuro usando el mismo mecanismo de cambio de tema que ya usa el resto de la app (sin parpadeos ni un tema que no reacciona).
3. **Given** un sector con ámbito Global, **When** se muestra su tarjeta, **Then** el badge de ámbito se ve igual que el de un sector de Grupo o Personal (mismo estilo plano, solo cambia el texto) — no se introduce una diferenciación visual nueva que no existía antes.

---

### User Story 2 - Ver el ámbito del sector también en la vista de tabla (Priority: P2)

Como usuario que prefiere la vista de lista/tabla de Sectores, quiero seguir viendo a qué ámbito pertenece cada sector igual que en la vista de grilla, para no perder ese dato solo por cambiar de vista.

**Why this priority**: Es una inconsistencia real ya detectada (el badge de ámbito hoy solo aparece en la grilla) que el rediseño debe corregir de paso, pero no es el cambio principal.

**Independent Test**: Se puede probar cambiando el toggle de vista de "grilla" a "lista" en `/sectors` y confirmando que el ámbito de cada sector sigue visible en cada fila.

**Acceptance Scenarios**:

1. **Given** la lista de sectores en vista de tabla, **When** el usuario la mira, **Then** cada fila muestra el mismo badge de ámbito plano (mismo estilo que la píldora `.pc-scope-pill` de la grilla, sin punto de color) que se ve en la vista de grilla.

---

### User Story 3 - Distinguir un sector recién creado de uno con datos ocultos (Priority: P2)

Como usuario, quiero que un sector sin tareas todavía muestre una nota explícita ("Sin tareas todavía") en vez de que el bloque de progreso simplemente desaparezca, para no confundir un sector nuevo con un error de carga.

**Why this priority**: Corrige un hallazgo concreto de la auditoría (el bloque de progreso se oculta por completo cuando el total de tareas es cero), de bajo esfuerzo pero valor real de claridad.

**Independent Test**: Se puede probar creando (o usando) un sector sin ninguna tarea asignada y confirmando que la tarjeta muestra una nota en vez de un espacio vacío sin explicación.

**Acceptance Scenarios**:

1. **Given** un sector sin ninguna tarea asignada, **When** se muestra su tarjeta en la lista, **Then** aparece una nota indicando que todavía no tiene tareas, en el lugar donde normalmente iría la barra de progreso.

---

### User Story 4 - El detalle de un sector se ve igual que siempre (Priority: P3)

Como usuario que entra al detalle de un sector, quiero que se vea exactamente igual que antes (mismo tamaño de página, misma tipografía, mismo espaciado), sin perder ninguna de las funciones que ya tiene (editar color, menú de acciones, alternar lista/tablero, crear tareas, ver tareas agrupadas por trabajo, sección de Referencias).

**Why this priority**: Es la misma migración de herramienta aplicada a una segunda pantalla — valioso para consistencia, pero la lista (US1) es donde más impacta de entrada.

**Independent Test**: Se puede probar entrando al detalle de un sector con tareas, verificando visualmente que se ve igual que antes de esta feature, y confirmando que cada función existente (editar color, menú, toggle lista/tablero, crear tarea, Referencias) sigue funcionando exactamente igual que antes.

**Acceptance Scenarios**:

1. **Given** el detalle de un sector con tareas propias, tareas agrupadas por trabajo, y referencias, **When** un usuario con permiso de operar lo abre, **Then** ve el mismo diseño visual que tenía antes de esta feature y puede seguir editando el color, usando el menú de acciones, alternando entre vista lista/tablero, creando tareas y viendo la sección de Referencias, exactamente como podía antes.
2. **Given** ese mismo detalle, **When** un usuario sin permiso de operar lo abre, **Then** sigue viendo el contenido en modo solo lectura igual que antes (esta feature no cambia permisos).

---

### Edge Cases

- Un sector sin color asignado (`color: null`): la tarjeta usa el mismo tratamiento "sin color" que tenía antes de esta feature (pill de nombre con fondo gris neutro), sin cambios.
- El resto de la aplicación (cualquier pantalla fuera de Sectores) debe verse exactamente igual que antes de esta feature — la nueva herramienta de estilos no debe filtrarse visualmente a ninguna otra pantalla en esta pasada, salvo el marco de los diálogos (ver FR-011): un diálogo ajeno a Sectores (por ejemplo, crear un grupo) puede cambiar de marco/backdrop, pero no de contenido ni de comportamiento.
- El cambio de tema claro/oscuro debe seguir funcionando igual que hoy en toda la app, incluidas las pantallas de Sectores rediseñadas — sin introducir un segundo mecanismo de tema que compita con el actual.
- Un sector con un nombre muy largo no debe romper el layout de la tarjeta ni de la fila de tabla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar cada sector de la lista (vista grilla) con el mismo diseño de tarjeta que tenía antes de esta feature (fondo, borde de 1px, sombra al pasar el mouse, radio de esquina, espaciado) — sin introducir un lenguaje visual nuevo.
- **FR-002**: El sistema DEBE mostrar en cada tarjeta el mismo rótulo del ámbito del sector (Grupo/Personal/Global) que tenía antes: una píldora plana con el texto del ámbito, sin punto de color ni diferenciación especial para Global.
- **FR-003**: El sistema DEBE mostrar el progreso de tareas de un sector con la misma barra (altura, color `--ok`, esquinas redondeadas) y el mismo formato de números que tenía antes de esta feature.
- **FR-004**: El sistema DEBE mostrar el mismo badge de ámbito plano (FR-002, sin punto de color) en la vista de tabla/lista que ya muestra la vista de grilla (hoy ausente en tabla) — esta es información nueva que se agrega, no un cambio de estilo de lo que ya existía.
- **FR-005**: El sistema DEBE mostrar una nota explícita ("sin tareas todavía" o equivalente) en la tarjeta de un sector sin ninguna tarea asignada, en vez de ocultar el bloque de progreso sin explicación — esta es información nueva que se agrega, no un cambio de estilo de lo que ya existía.
- **FR-006**: El sistema DEBE mostrar el detalle de sector (`/sectors/[id]`) con el mismo diseño visual que tenía antes de esta feature (tamaño de página, tipografía, espaciado), que sigue siendo una página completa — no un panel lateral — sin quitar ninguna de sus funciones actuales (edición de color, menú de acciones con "Estados de tarea" y "Eliminar sector", alternar lista/tablero, creación de tareas, tareas agrupadas por trabajo, sección de Referencias).
- **FR-007**: El sistema DEBE seguir respetando el nivel de permiso (`read`/`operate`) ya existente sobre cada sector — esta feature no cambia quién puede ver o editar qué.
- **FR-008**: El sistema DEBE usar los mismos valores de color que la aplicación usa hoy (el azul de acento, los grises de fondo/texto/borde, etc.) tanto en tema claro como oscuro — el rediseño no introduce una paleta de colores nueva.
- **FR-009**: El sistema DEBE seguir cambiando entre tema claro y oscuro con el mismo mecanismo que ya usa el resto de la aplicación hoy, sin duplicar ni reemplazar ese mecanismo.
- **FR-010**: El sistema DEBE incorporar Tailwind CSS como herramienta de estilos del proyecto (dependencia instalada, configuración de build), configurada para usar los colores y el mecanismo de tema de la Regla FR-008/FR-009 en vez de una paleta de colores por defecto ajena a la aplicación.
- **FR-011**: El sistema DEBE limitar el uso de Tailwind CSS a los archivos de la sección Sectores en esta feature (lista, tarjeta, diálogo de creación, detalle) — ninguna otra pantalla de la aplicación debe cambiar de apariencia como resultado de esta feature, **con una única excepción explícita**: el componente compartido `Dialog.tsx` (marco/backdrop reutilizado por otros diálogos de la app) también se restylea con Tailwind en esta feature, por lo que el aspecto de TODOS los diálogos de la aplicación —no solo los de Sectores— cambia como efecto colateral aceptado.
- **FR-012**: El sistema DEBE seguir funcionando exactamente igual (mismos datos, misma navegación, mismas acciones) en todas las pantallas no tocadas por esta feature, incluyendo cualquier otro diálogo que use el componente compartido de FR-011 (cambia de apariencia, pero no de comportamiento).

### Key Entities *(include if feature involves data)*

- **Sector**: sin cambios de datos en esta feature — se muestra con el mismo modelo (nombre, color, ámbito, métricas de tareas) ya existente; solo cambia su representación visual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede identificar el ámbito de cualquier sector (Grupo/Personal/Global) sin necesidad de abrir su detalle, tanto en la vista de grilla como en la de tabla, en el 100% de los casos, con el mismo estilo visual (badge plano) que ya existía en la grilla.
- **SC-002**: Cero pantallas fuera de la sección Sectores cambian de apariencia visual como consecuencia de esta feature, salvo el marco de los diálogos en cualquier pantalla (efecto colateral aceptado de restylear `Dialog.tsx`, FR-011) — verificable comparando capturas antes/después de al menos 3 pantallas no tocadas, y confirmando que el contenido interno de un diálogo ajeno a Sectores (p. ej. crear un grupo) no cambió, solo su marco.
- **SC-003**: El 100% de las funciones existentes del detalle de sector (editar color, menú de acciones, alternar lista/tablero, crear tarea, Referencias) siguen operando sin errores después del rediseño.
- **SC-004**: El cambio de tema claro/oscuro en las pantallas de Sectores migradas produce el mismo resultado visual que producía antes de esta feature, verificado en ambos temas.
- **SC-005**: Una comparación visual lado a lado (antes/después de esta feature) de `/sectors` y `/sectors/[id]` no muestra diferencias de diseño perceptibles más allá de las dos adiciones de información explícitamente aceptadas (US2, US3).

## Assumptions

- Esta feature es el primer paso de una migración más amplia a Tailwind CSS que el usuario ya definió como objetivo final; el resto de la aplicación se migra en features posteriores y explícitamente no en esta.
- La referencia de diseño es el estado de la aplicación **antes** de esta feature (las clases de `globals.css` que se venían usando: `.project-card`, `.pc-name-pill`, `.pc-scope-pill`, `.pc-progress-*`, `.dialog`, `.sheet`, `.segmented`, etc.) — no un mockup nuevo. El mockup de estilo Vercel/Tailwind explorado antes de escribir esta spec quedó descartado por el usuario una vez visto implementado.
- No se agrega ningún framework de testing de componentes React en esta feature (el repositorio no tiene uno hoy); la verificación de la UI es visual/manual, según ya se documentó en la investigación previa a esta spec.
- `globals.css` no se recorta ni se elimina en esta feature — el resto de la aplicación lo sigue usando tal cual hasta que se migre en otra feature. Las clases que dejan de usarse en los 5 archivos migrados de Sectores permanecen definidas en `globals.css` sin cambios (las siguen usando otras pantallas).
