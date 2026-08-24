# Data Model — 060 Sectores agrupados por ámbito

**No hay cambios de esquema.** No se agregaron migraciones, ni campos, ni índices. La feature es
100% de presentación: consume la respuesta que `GET /api/sectors` ya devolvía.

---

## Lo que ya existía y se aprovecha

`Sector` (`prisma/schema.prisma:181-206`) modela tres ámbitos mutuamente excluyentes con dos campos
nullables, tal como lo dejó la feature 046:

| `groupId` | `ownerId` | Ámbito |
|---|---|---|
| seteado | `null` | Grupo |
| `null` | seteado | Personal |
| `null` | `null` | Global |

`GET /api/sectors` (`src/app/api/sectors/route.ts:82-95`) ya resolvía eso en un `scope` listo para
consumir, junto con las métricas por sector:

```ts
scope:
  | { type: "GROUP"; groupId: string; groupName?: string }
  | { type: "PERSONAL"; ownerId: string }
  | { type: "GLOBAL" }

metrics: { total: number; done: number; pending: number }
```

`Group.color` (`schema.prisma:156`) ya existía y lo usaba `GroupCard`; acá se lee desde el server
component en vez de sumarlo a la API (ver `research.md` R-004).

---

## Entidad de vista nueva: `SectorSection`

Definida en `src/components/sectors/groupSectorsByScope.ts`. Existe solo en memoria del cliente; no
se persiste ni se serializa.

```ts
export type SectorSortKey = "name" | "pending" | "tasks" | "progress";
export type SectorSectionKind = "GLOBAL" | "GROUP" | "PERSONAL";

export interface SectorSection {
  key: string;                // "scope:global" | "scope:personal" | `group:${groupId}`
  kind: SectorSectionKind;
  title: string;              // "Global" | "Personal" | nombre del grupo
  groupId: string | null;
  sectors: SectorCardData[];  // ya ordenados según el criterio pedido
  count: number;              // sectors.length
  pending: number;            // Σ metrics.pending
  total: number;              // Σ metrics.total
  done: number;               // Σ metrics.done
  progress: number;           // done/total, o 0 si total === 0
}
```

### Identidad

`key` es la identidad estable de una sección y se deriva del ámbito, no del nombre:

- `scope:global` — único
- `scope:personal` — único
- `group:<uuid>` — uno por grupo

Esto hace que dos grupos homónimos produzcan dos secciones distintas, y que el estado plegado
guardado en `localStorage` sobreviva a un renombre de grupo.

`sectionDomId(key)` deriva el id de DOM para `aria-controls`, sanitizando los `:` y los guiones de
UUID a `[A-Za-z0-9_-]`.

### Reglas de derivación

- Un `scope` de tipo `GROUP` sin `groupId` (imposible según la API, pero el tipo lo permite) cae a
  la sección GLOBAL en vez de romper.
- Un `scope` de tipo `GROUP` sin `groupName` usa el título de reserva `"Sin grupo"`.
- Las secciones se generan desde los sectores presentes, así que nunca se produce una sección vacía.
- `progress` se calcula con guarda de división por cero.

---

## Estado persistido

| Clave | Formato | Contenido |
|---|---|---|
| `gw:sectors-sections-collapsed` | `string[]` (JSON) | Keys de las secciones **plegadas** |

Sigue el prefijo `gw:` de `gw:drawer-collapsed`, `gw:drawer-width` y `gw:theme`.

Se guarda lo cerrado y no lo abierto para que toda sección desconocida arranque abierta
(`research.md` R-003). En cada escritura se podan los keys que ya no existen.
