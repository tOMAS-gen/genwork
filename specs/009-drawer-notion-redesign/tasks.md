# Implementation Tasks: Rediseño Drawer/Sidebar estilo Notion

**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Phase 1: Estilos base del sidebar (CSS)

- [x] T001 [P] [US1] [US2] [sonnet] Reescribir estilos CSS del sidebar en globals.css: `.nav-group` → label de sección uppercase 11px muted, `.nav-sublist a` → pill hover con border-radius 6px y `var(--hover-soft)`, `.sidebar .brand` → 14px/600, `.theme-toggle` → sin borde. Incluir estados hover, focus-visible y tema oscuro.

## Phase 2: Componentes React

- [x] T002 [P] [US2] [sonnet] Refactorizar header en Shell.tsx: reducir `.brand` a texto compacto 14px, mantener botones de colapso/cerrar, eliminar margen inferior excesivo del header.

- [x] T003 [P] [US1] [US2] [sonnet] Refactorizar DrawerNav.tsx: (a) labels de sección como span uppercase muted (no clickeable) con chevron al lado, separar del contenedor de items; (b) agregar íconos de lucide-react a todos los ítems según DD-003 del plan (FileText para proyectos, Layers para sectores, Users para grupos, LayoutGrid/User/Star/Archive para los links especiales); (c) conservar link "ver todos" alineado a la derecha del label; (d) conservar toda la funcionalidad actual (expandir/colapsar, closeMobileDrawer, CAP limit).

## Phase 3: Integración visual

- [x] T004 [P] [US3] [haiku] Ajustar estilos del ThemeToggle en globals.css: quitar borde y reducir padding de `.theme-toggle` para integrarlo visualmente con el fondo del sidebar.

- [x] T005 [P] [US4] [haiku] Verificar que los estilos mobile del sidebar (`@media max-width: 767px`) aplican correctamente con los nuevos estilos: pill hover, labels muted, header compacto. Ajustar si hay conflictos.

## Phase 4: Accesibilidad y verificación

- [x] T006 [P] [US5] [sonnet] Verificar y corregir accesibilidad: focus-visible en todos los ítems interactivos del sidebar (links, botones, chevrons), contraste AA de texto muted sobre fondo en ambos temas, roles ARIA si la estructura semántica cambió.

## Dependencies

- T002, T003 dependen de T001 (CSS primero).
- T004, T005 son independientes, pueden paralelizarse después de T001.
- T006 después de T002+T003.
