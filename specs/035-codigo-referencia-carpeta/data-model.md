# Data Model: Código de referencia del proyecto

## Sin cambios de schema

El código se **calcula**, no se persiste. Insumos ya existentes en `Work`:
- `folderSeq Int @default(autoincrement())` — el número del código.
- relación `group` → `group.name` — la primera parte (o `PERSONAL` si no hay grupo).
- `name` — la última parte.

## Función pura (`src/lib/domain/works/projectCode.ts`)

```ts
/** Normaliza un segmento: MAYÚSCULAS, espacios→_, solo [A-Z0-9_]. */
export function normalizeSegment(s: string): string;

/**
 * Código de referencia del proyecto:
 *   NOMBRE_DEL_GRUPO-NÚMERO-NOMBRE_DEL_PROYECTO   (todo MAYÚSCULAS)
 * groupName null/undefined → "PERSONAL".
 */
export function buildProjectCode(
  groupName: string | null | undefined,
  folderSeq: number,
  workName: string,
): string;
```

Reglas de `normalizeSegment`:
1. `trim()` + `toUpperCase()`.
2. Espacios (uno o varios) → un `_`.
3. Quitar acentos (NFD) y cualquier carácter fuera de `[A-Z0-9_]`.
4. Colapsar `_` repetidos; sin `_` al inicio/fin.

`buildProjectCode` = `${normalizeSegment(groupName ?? "PERSONAL")}-${folderSeq}-${normalizeSegment(workName)}`.

## Uso

| Punto | Uso |
|-------|-----|
| `POST /api/works` (route.ts) | Tras crear el work, resolver `groupName` y encolar `CREATE_WORK_FOLDER` con `workName = buildProjectCode(...)` → la carpeta se llama con el código. |
| `GET /api/works/[id]` | Incluir `code: buildProjectCode(group?.name ?? null, work.folderSeq, work.name)` en el DTO. |
| `works/[id]/page.tsx` | Mostrar `work.code` en un apartado + botón copiar. |

## Reglas / invariantes

- **Determinismo**: mismo (grupo, seq, nombre) → mismo código (FR-009).
- **Estabilidad**: `folderSeq` no cambia nunca; el grupo rara vez; el nombre puede cambiar (FR-007) — la parte `GRUPO-SEQ` permanece.
- **Unicidad**: `folderSeq` es único por proyecto → el código es único (FR-001, SC-003).
- **Solo nuevos**: la carpeta se nombra con el código al crearse; los existentes no se renombran (FR-006).
