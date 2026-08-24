# Implementation Plan — 060 Sectores agrupados por ámbito

**Branch**: `060-sectores-agrupados` | **Spec**: [spec.md](./spec.md)

## Summary

`/sectors` mostraba ~40 sectores en una grilla plana A-Z, con el grupo apenas como un chip en la
esquina de cada tarjeta. Se agrupan en secciones colapsables por ámbito (GLOBAL, un grupo por
sub-marca, PERSONAL), con el conteo de pendientes en cada encabezado y un modo de orden por
urgencia. Todo el trabajo es de cliente: `GET /api/sectors` ya devolvía el `scope` resuelto y
`metrics.pending`.

## Technical Context

**Language/Version**: TypeScript 5.8 · React 19 · Next.js 15 (App Router)
**Primary Dependencies**: Tailwind 3.4 (`preflight: false`) + `globals.css` legacy · lucide-react
**Storage**: sin cambios (Prisma/Postgres intactos) · `localStorage` para el plegado
**Testing**: Vitest, `environment: "node"` (sin jsdom); componentes vía `renderToString`
**Scale/Scope**: 5 archivos de producción modificados, 2 creados, 2 archivos de test nuevos. Sin
migraciones, sin cambios de API, sin cambios de permisos.

## Constitution Check

| Principio | Cómo se honra |
|---|---|
| **I — Information at a Glance** | Cada encabezado de sección muestra el total de pendientes del ámbito, con el mismo `Badge` y la misma métrica que el drawer, así que los números no se contradicen entre vistas. El plegado guarda lo cerrado justamente para que ningún grupo nuevo nazca escondido. |
| **II — Opinionated over Flexible** | Un solo criterio de orden gobierna secciones y sectores; no se agrega un segundo control. El modo "Más pendientes" está justificado por una decisión explícita de la fase clarify. |
| **III — Spec-Driven Delivery** | Esta carpeta. Rama `060-sectores-agrupados`. |
| **IV — Design System Consistency** | Se reusan `Badge`, el barrel `icons.tsx` (se suma `Globe`), los tokens semánticos y el vocabulario visual de `.nav-group`. Sin colores ni espaciados ad-hoc. |
| **V — Accessibility (WCAG AA)** | `<button>` nativo con `aria-expanded` / `aria-controls`; el panel referenciado existe siempre; el contenido plegado no se renderiza, así que sale del orden de tabulación; `min-h-11` de área táctil; el contador nunca depende solo del color. `:focus-visible` y `prefers-reduced-motion` ya son globales. |
| **VI — Test-Backed Changes** | El cambio es de sorting + aggregation: la lógica vive en una función pura con 22 tests unitarios, más 7 de render del encabezado. |
| **VII — Perceived Speed** | Sin requests nuevos: el color de grupo se resuelve en el `Promise.all` que el server component ya hacía. La agrupación es un `useMemo`. Solo se anima el chevron (transform), no la altura del panel. |

Sin violaciones. Sin dependencias de runtime nuevas.

## Project Structure

```
src/
├── app/(main)/sectors/page.tsx              # + groupColors desde prisma.group
├── components/
│   ├── sectors/
│   │   ├── groupSectorsByScope.ts           # NUEVO — helper puro (agrupar + ordenar)
│   │   ├── SectorSectionHeader.tsx          # NUEVO — contenido del encabezado
│   │   ├── SectorsView.tsx                  # secciones, plegado, persistencia, orden
│   │   └── SectorCard.tsx                   # pill de ámbito → pendientes
│   └── ui/icons.tsx                         # + Globe
└── lib/nav/drawerSort.ts                    # + export compareNameEs

tests/unit/
├── sectors-grouping.test.ts                 # NUEVO
└── sector-section-header.test.tsx           # NUEVO
```

## Decisiones de diseño

Las decisiones no obvias están documentadas en [research.md](./research.md):

- **R-001** — por qué no hay un `Accordion` genérico
- **R-002** — modo lista con dos `<tbody>` por sección
- **R-003** — se persiste el conjunto cerrado, no el abierto
- **R-004** — el color del grupo viaja desde el server component
- **R-005** — un solo criterio de orden para los dos niveles
- **R-006** — los cuatro hechos del repo que condicionaron la implementación
- **R-007** — el helper puro vive junto a la vista

## Fuera de alcance

- `DrawerNav.tsx` y su `CAP = 10` (decisión explícita del usuario).
- El esquema de datos, la API de sectores, los permisos y `/api/board`.
- Persistir el criterio de orden elegido (hoy no se persiste, igual que antes).
