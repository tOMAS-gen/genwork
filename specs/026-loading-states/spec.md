# Feature Specification: Loading States

**Feature Branch**: `026-loading-states`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Cuando entra un proyecto, primero se ve la barra de estado de tareas y luego aparece la información. Ese segundo se ve visualmente mal. Debería tener un sistema de carga más adecuado para esas pantallas. Ajustar también los sistemas de carga de cada sector."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Skeleton coherente al cargar proyecto (Priority: P1)

El usuario navega a un proyecto. Mientras los datos se cargan, ve un skeleton que reproduce la estructura completa de la página (breadcrumb, título, descripción, barra de estado, tareas) en lugar de mostrar primero la barra de estado vacía y luego el contenido.

**Why this priority**: El salto visual al cargar un proyecto es el problema reportado. La barra de estado aparece sola antes que el resto, creando un parpadeo molesto.

**Independent Test**: Navegar a cualquier proyecto y verificar que durante la carga se ve un skeleton completo sin elementos reales parciales.

**Acceptance Scenarios**:

1. **Given** el usuario hace click en un proyecto, **When** la API aún no respondió, **Then** se muestra un skeleton con placeholders para breadcrumb, título, subtítulo, barra de estado y lista de tareas.
2. **Given** la API responde, **When** los datos llegan, **Then** el skeleton se reemplaza por el contenido real sin saltos visuales.
3. **Given** la API falla, **When** el timeout se cumple, **Then** se muestra un toast de error y el skeleton desaparece.

---

### User Story 2 - Skeleton al cargar sector (Priority: P1)

El usuario navega a la vista de un sector. Mientras los datos se cargan, ve un skeleton que reproduce la estructura de la página (título, input de tareas, filtros, lista de tareas) en lugar de solo "Cargando…".

**Why this priority**: Mismo problema que proyectos pero en sectores. Solo muestra texto plano "Cargando…" sin ningún feedback visual adecuado.

**Independent Test**: Navegar a cualquier sector y verificar que durante la carga se muestra un skeleton con la estructura de la página.

**Acceptance Scenarios**:

1. **Given** el usuario hace click en un sector, **When** la API aún no respondió, **Then** se muestra un skeleton con placeholders para título, área de tareas y filtros.
2. **Given** la API responde, **When** los datos llegan, **Then** el skeleton se reemplaza por el contenido real sin saltos.

---

### Edge Cases

- Red lenta: el skeleton se mantiene visible todo el tiempo de carga sin timeout prematuro.
- Navegación rápida: si el usuario cambia de página antes de que cargue, no hay errores ni estados huérfanos.
- Reducción de movimiento: el skeleton respeta `prefers-reduced-motion` (ya implementado en CSS existente).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La página de proyecto DEBE mostrar un skeleton de página completa mientras carga, cubriendo breadcrumb, título, subtítulo, barra de estado y lista de tareas.
- **FR-002**: La página de sector DEBE mostrar un skeleton de página completa mientras carga, cubriendo título, área de entrada de tareas y lista de tareas.
- **FR-003**: El skeleton DEBE usar la misma animación shimmer ya existente en el sistema (1.4s, gradiente lineal).
- **FR-004**: El skeleton DEBE respetar la preferencia de movimiento reducido del usuario.
- **FR-005**: NO deben verse componentes reales (barra de estado, botones funcionales) durante el estado de carga.
- **FR-006**: La transición de skeleton a contenido real DEBE ser instantánea, sin animaciones intermedias.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al navegar a un proyecto, no se observa ningún componente funcional (barra de estado, botones) antes de que los datos estén disponibles.
- **SC-002**: Al navegar a un sector, no se muestra texto plano "Cargando…" sino un skeleton visual.
- **SC-003**: El layout del skeleton coincide con el layout final del contenido para evitar saltos al renderizar.
- **SC-004**: Ambas pantallas (proyecto y sector) usan el mismo sistema de skeleton visual, manteniendo consistencia.

## Assumptions

- El componente `Skeleton` existente con sus tres variantes (text, card, circle) es suficiente para construir los skeletons necesarios.
- Los estilos CSS del skeleton shimmer ya existentes en `globals.css` no requieren modificación.
- El patrón de carga `useEffect` + `useState` se mantiene (no se migra a Server Components ni `loading.tsx`).
- La mejora es puramente visual — no hay cambios en la lógica de fetch ni en las APIs.
