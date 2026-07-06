# Implementation Plan: Detalle visual de tarea

**Branch**: `020-detalle-tarea` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

## Summary

Rediseñar el panel de descripción de tareas (agregado en spec 019) para que muestre una barra lateral azul, encabezado "Descripción" con ícono, y texto/textarea dentro de un contenedor visualmente diferenciado. Solo cambios CSS y JSX en TaskItem; sin cambios de API ni schema.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 15

**Primary Dependencies**: React (JSX), CSS vanilla (globals.css)

**Storage**: N/A (campo `description` ya existe en Prisma)

**Testing**: Verificación visual manual via preview

**Target Platform**: Web (desktop + mobile)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Tarea única | ✅ OK | No se duplica ni copia nada |
| II. Etiquetado inline | ✅ OK | No afecta el parser de etiquetas |
| III. Trabajo = Doc + Tareas | ✅ OK | La descripción vive dentro de la tarea, en la misma vista |
| IV. Estados simples | ✅ OK | No agrega estados nuevos |
| V. YAGNI | ✅ OK | Solo CSS + JSX, sin abstracciones nuevas |

## Architecture

### Archivos a modificar

1. **`src/components/tasks/TaskItem.tsx`** — Reestructurar el bloque `{expanded && ...}` para agregar encabezado "Descripción" con ícono y wrapper con clase CSS para la barra azul.

2. **`src/app/globals.css`** — Reemplazar estilos `.task-description` actuales por diseño con:
   - `border-left: 3px solid var(--accent)` en el contenedor
   - Encabezado con `font-weight: 600`, color acento, ícono alineado
   - Fondo sutil `var(--accent-soft)` o transparente
   - Adaptación dark mode

### Estructura JSX del panel expandido

```
<div className="task-description-panel">
  <div className="task-description-header">
    <FileText size={14} />
    <span>Descripción</span>
  </div>
  {canToggle ? (
    <textarea ... />
  ) : (
    <div className="task-description-readonly">...</div>
  )}
</div>
```

### Tokens CSS

- Borde izquierdo: `var(--accent)` (#2563eb)
- Fondo panel: transparente (solo el borde marca la diferencia)
- Encabezado: `var(--accent)` para ícono y texto
- Textarea/readonly: estilos existentes adaptados

## Complexity Tracking

| Item | Justificación |
|------|---------------|
| Ninguno | Solo CSS + JSX, sin entidades ni lógica nueva |

## Phases

### Phase 1: Estilos CSS del panel
Reemplazar `.task-description` por `.task-description-panel` con barra azul y encabezado.

### Phase 2: JSX de TaskItem
Actualizar el bloque expandido para usar la nueva estructura con encabezado.

### Phase 3: Verificación visual
Probar en tema claro/oscuro, con/sin descripción, modo edición/lectura.
