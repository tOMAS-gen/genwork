# Implementation Plan: Rediseño Drawer/Sidebar estilo Notion

**Branch**: `009-drawer-notion-redesign` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

## Summary

Rediseño visual completo del sidebar/drawer de genwork para adoptar estética Notion: header compacto, íconos en todos los ítems, hover/selección tipo pill redondeado, labels de sección en tipografía muted/uppercase. Solo cambios de presentación — sin lógica de negocio ni endpoints.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 19 / Next.js 15

**Primary Dependencies**: lucide-react (íconos), CSS vanilla con variables (design tokens)

**Storage**: N/A (no cambia)

**Testing**: Verificación visual + vitest (tests existentes no se tocan)

**Target Platform**: Web (desktop + mobile responsive)

**Project Type**: web-app (componentes React + CSS)

**Constraints**: 220px sidebar width, temas claro/oscuro, WCAG AA contraste

## Constitution Check

| Principio | Estado | Nota |
|-----------|--------|------|
| I. Tarea única, múltiples vistas | ✅ N/A | No toca lógica de tareas |
| II. Etiquetado inline | ✅ N/A | No toca parser ni input |
| III. Trabajo = Doc + Tareas | ✅ N/A | No toca páginas de trabajo |
| IV. Estados simples | ✅ N/A | No toca estados |
| V. Simplicidad primero | ✅ OK | Solo CSS + JSX visual, sin entidades ni capas nuevas |

## Project Structure

### Documentation (this feature)

```text
specs/009-drawer-notion-redesign/
├── spec.md
├── plan.md              # This file
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (files a modificar)

```text
src/
├── components/
│   ├── nav/
│   │   ├── DrawerNav.tsx    # Agregar íconos, refactorizar labels de sección
│   │   └── Shell.tsx        # Header compacto, ajustar marca
│   └── ui/
│       └── ThemeToggle.tsx  # Posible ajuste de estilo (integración visual)
└── app/
    └── globals.css          # Reescribir estilos .sidebar, .nav-group, .nav-sublist
```

## Design Decisions

### DD-001: Pill hover con CSS variables existentes

Usar `var(--hover-soft)` para hover y `var(--accent-soft)` para selección activa, con `border-radius: 6px`. Aprovecha tokens existentes sin agregar nuevos.

### DD-002: Labels de sección como texto uppercase muted

Reemplazar `.nav-group` clickeable actual por dos elementos separados:
1. Un label de sección (span, no clickeable) en uppercase, 11px, color muted.
2. El chevron se mantiene como trigger de expandir/colapsar junto al label.

El link "ver todos" se mantiene alineado a la derecha del label de sección.

### DD-003: Íconos de lucide-react

| Sección / Ítem | Ícono |
|-----------------|-------|
| Proyectos (lista) | FileText |
| Todos los proyectos | LayoutGrid |
| Mis proyectos | User |
| Favoritos | Star |
| Archivados | Archive |
| Sectores (lista) | Layers |
| Grupos (lista) | Users |
| Dashboard | LayoutDashboard (ya existe) |
| Administración | Settings (ya existe) |
| + Nuevo proyecto | Plus (ya existe) |

### DD-004: Header compacto

Reducir `.brand` de 18px/700 a 14px/600. Sin logo/avatar — solo texto "genwork" en una línea con los botones de colapso/cerrar.

### DD-005: Tema toggle integrado

Quitar el borde del `.theme-toggle` y reducir padding para fundirlo con el fondo del sidebar.

## Complexity Tracking

Sin violaciones a Constitution. Cambio puro de presentación.
