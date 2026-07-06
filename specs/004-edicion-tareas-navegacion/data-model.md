# Data Model: Edición inline y navegación (feature 004)

**Fecha**: 2026-07-03 | **Plan**: [plan.md](plan.md)

**Sin cambios de schema ni entidades nuevas.** Todo opera sobre el modelo de la feature 001.

## Reglas de dominio ajustadas

- **Matching de etiquetas (nuevo, puro)** — `src/lib/domain/tags/matching.ts`:
  - `toTagForm(name: string): string` — nombre visible → forma etiquetable (espacios y símbolos
    no permitidos → `-`; conserva letras/números/`-`/`.`/`_`). Determinista.
  - `tagMatchesName(tag: string, name: string): boolean` — igualdad canónica donde
    espacio ≡ guion (usa `normalizeTagName` + colapso de `[-\s]+`).
  - Resolución (server): 1º igualdad canónica; 2º fallback prefijo único (exactamente un
    candidato cuyo nombre canónico empieza por la etiqueta). 0 o 2+ → unresolved (UI ofrece
    crear/corregir). Aplica a `/` (works) y `#`/`@` (sectores/usuarios).

- **Edición de tarea**: sin regla nueva — `PATCH /api/tasks/{id}` existente re-parsea `rawText`
  (FR-008/FR-007 de la 001). Texto vacío se rechaza en la UI (no llega al server, que además ya
  valida `min(1)`).

## Preferencias locales (no persistidas en DB)

| Clave localStorage | Valores | Uso |
|---|---|---|
| `gw:theme` | `light` \| `dark` \| `system` | Tema; default `system` (FR-311) |
| `gw:drawer-collapsed` | `"1"` \| ausente | Drawer oculto/visible global (FR-308) |

## Transiciones

Sin cambios: `PENDING ⇄ DONE` intacto; editar una tarea no altera su estado (FR-302).
