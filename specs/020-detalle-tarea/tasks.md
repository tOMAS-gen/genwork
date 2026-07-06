# Tasks: Detalle visual de tarea

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Phase 1: Estilos CSS

- [x] T001 [P] [US1] [sonnet] Reemplazar estilos `.task-description` en `src/app/globals.css` por `.task-description-panel` con `border-left: 3px solid var(--accent)`, padding interno, y `.task-description-header` con `font-weight: 600`, `color: var(--accent)`, gap con ícono. Mantener estilos de textarea y readonly adaptados dentro del panel. Agregar regla dark mode.

## Phase 2: JSX TaskItem

- [x] T002 [US1] [sonnet] Actualizar bloque `{expanded && ...}` en `src/components/tasks/TaskItem.tsx`: reemplazar `<div className="task-description">` por `<div className="task-description-panel">` con encabezado `<div className="task-description-header"><FileText size={14} /><span>Descripción</span></div>` y contenido (textarea o readonly) debajo.

## Phase 3: Verificación

- [x] T003 [US1] [sonnet] Verificar visualmente el panel en tema claro y oscuro, con/sin descripción, modo edición/lectura. Confirmar barra azul, encabezado, y coherencia con el diseño general.

## Dependencies

T001 → T002 → T003 (secuenciales)

## Implementation Strategy

MVP: T001 + T002. Verificación: T003.
Total: 3 tareas, todas [sonnet].
