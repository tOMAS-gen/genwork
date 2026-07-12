# Data Model: Rediseño visual de Sectores con Tailwind

Esta feature **no agrega ni modifica modelos de Prisma, endpoints ni contratos de datos**. No hay migración
de base de datos ni cambios de API.

## Entidades existentes involucradas (sin cambios de esquema)

- **`Sector`** (`prisma/schema.prisma`): sin cambios. Se sigue leyendo con el mismo shape que ya consume
  `SectorCardData` (`src/components/sectors/SectorCard.tsx`): `id`, `name`, `color`, `scope { type, groupId?,
  groupName?, ownerId? }`, `metrics { total, done, pending }`. Esta feature solo cambia CÓMO se renderiza ese
  dato, no qué dato se pide ni de dónde sale.
- **`SectorView`** (shape ya definido en `src/app/(main)/sectors/[id]/page.tsx`): sin cambios — `sector`,
  `loose`, `byWork`, `refs`, `metrics`, `level`. Se mantiene igual.

## Valor nuevo (no persistido, puramente de configuración de build)

- **Mapeo de theme de Tailwind → custom properties de `globals.css`**: no es un dato de la aplicación, es
  configuración de la herramienta de estilos (`tailwind.config.ts`). Ver `research.md` Decisión 3 para el
  mapeo completo de tokens de color.

No se requieren nuevas tablas, índices, relaciones, ni cambios de contrato de API.
