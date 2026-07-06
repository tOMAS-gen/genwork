# Implementation Plan: Mejora del sistema de detalle de tareas

**Branch**: `021-mejora-detalle-tarea` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

## Summary

Rediseñar la interacción del panel de descripción de tareas. Tres cambios principales: (1) en modo vista, mostrar la descripción directamente sin header si existe, ocultarla si no; (2) en modo edición, incluir el campo de descripción con placeholder dentro de TaskInlineEdit accesible via Tab; (3) quitar el header "Descripción" redundante del panel de vista. Solo cambios en CSS y JSX.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 15

**Primary Dependencies**: React (JSX), CSS vanilla (globals.css)

**Storage**: N/A (campo `description` ya existe, API PATCH ya existe)

**Testing**: Verificación visual manual via preview

**Target Platform**: Web (desktop + mobile)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Tarea única | ✅ OK | No duplica ni copia tareas |
| II. Etiquetado inline | ✅ OK | No afecta el parser de etiquetas |
| III. Trabajo = Doc + Tareas | ✅ OK | Descripción sigue dentro de la tarea en la misma vista |
| IV. Estados simples | ✅ OK | No agrega estados nuevos |
| V. YAGNI | ✅ OK | Solo CSS + JSX, sin abstracciones |

## Architecture

### Archivos a modificar

1. **`src/components/tasks/TaskItem.tsx`**
   - **Modo vista**: si `hasDescription` → mostrar panel con texto plano + barra azul, SIN header "Descripción", auto-expandido. Ícono FileText en la fila para toggle colapso.
   - **Modo edición**: pasar `task.description` y `handleDescriptionBlur` a `TaskInlineEdit`.
   - Quitar el `expanded` state para vista (la descripción se muestra siempre si existe). Mantener solo para colapso manual.

2. **`src/components/tasks/TaskInlineEdit.tsx`**
   - Agregar textarea de descripción debajo del `TagHighlightInput`.
   - Props nuevas: `description: string | null`, `onDescriptionBlur: (e) => void`.
   - El textarea tiene placeholder "Descripción" y es accesible via Tab desde el campo principal.
   - En `onKeyDown`: Tab (sin sugerencias) mueve foco a textarea de descripción.
   - El textarea de descripción guarda en blur (misma lógica que ya existe en `handleDescriptionBlur`).

3. **`src/app/globals.css`**
   - Quitar `.task-description-header` (ya no se usa).
   - Ajustar `.task-description-panel`: sin header, solo barra azul + texto.
   - Agregar `.task-edit-description`: textarea de descripción en edición con estilo sutil.
   - Agregar transición CSS para expand/collapse: `max-height` + `overflow: hidden` + `transition`.

### Flujo de interacción

```
MODO VISTA (no edición):
┌─────────────────────────────────────────────┐
│ ☑ Texto de la tarea #Sector    [📄] [✕]    │
│ │ Texto de la descripción en plano...       │  ← solo si hasDescription
│ │ (barra azul, sin header)                  │
└─────────────────────────────────────────────┘

MODO EDICIÓN (clic en texto):
┌─────────────────────────────────────────────┐
│ ☑ [═══ TagHighlightInput ═══════]     [✕]  │
│   ┌─────────────────────────────────────┐   │
│   │ Descripción (placeholder)           │   │  ← textarea con barra azul
│   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Complexity Tracking

| Item | Justificación |
|------|---------------|
| Tab entre campos | Necesario para UX fluida (spec FR-003), complejidad mínima: un onKeyDown en TagHighlightInput |

## Phases

### Phase 1: TaskInlineEdit con campo de descripción
Agregar textarea de descripción en TaskInlineEdit, accesible via Tab, con placeholder "Descripción".

### Phase 2: TaskItem vista sin header
Quitar header "Descripción" del panel, mostrar descripción auto-expandida si existe, incluir descripción en modo edición.

### Phase 3: CSS y transiciones
Actualizar estilos, quitar `.task-description-header`, agregar transición suave.

### Phase 4: Verificación
Probar todos los flujos: vista con/sin descripción, edición, Tab, tema claro/oscuro.
