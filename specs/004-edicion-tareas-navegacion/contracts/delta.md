# Contrato — delta feature 004

**Fecha**: 2026-07-03 | Base: contratos de features 001-003

Sin endpoints nuevos. Cambios de comportamiento:

| Endpoint (existente) | Cambio |
|---|---|
| `POST /api/tasks` y `PATCH /api/tasks/{id}` | La resolución de `/` `#` `@` usa matching tolerante (espacio ≡ guion + prefijo único). La respuesta ya incluye `work {id, name}` — la UI lo usa para el aviso "Tarea enviada a /X" comparando contra el contexto. Sin cambios de shape. |
| `GET /api/tags/suggest` | El matching de sugerencias usa la misma tolerancia; la respuesta agrega `insertText` (forma etiquetable `toTagForm(name)`) para que la UI inserte texto parseable. Campo ADITIVO (no rompe clientes). |

## Contratos internos

- `toTagForm(name)` / `tagMatchesName(tag, name)` (`src/lib/domain/tags/matching.ts`): puros,
  deterministas, cubiertos por tests (`tests/unit/tag-matching.test.ts`).
- `useTagAutocomplete` (hook): unifica trigger `/#@`, fetch de sugerencias, navegación e
  inserción (`insertText`) para captura y edición inline.
- `Toast` (UI): `showToast({ message, href? })`, auto-dismiss 5 s, `aria-live="polite"`, no roba
  foco.
- Tema: `data-theme` en `<html>` (`light`/`dark`); script inline anti-FOUC; `gw:theme` en
  localStorage; modo `system` sigue `prefers-color-scheme` en vivo.
