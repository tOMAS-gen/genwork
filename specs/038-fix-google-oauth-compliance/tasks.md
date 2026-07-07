# Tasks: Fix Google OAuth Compliance

**Input**: Design documents from `specs/038-fix-google-oauth-compliance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: No se solicitan tests explícitamente. Se valida manualmente con quickstart.md.

**Organization**: Tasks agrupadas por user story para implementación independiente.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias)
- **[Story]**: User story (US1, US2, US3)
- **[model]**: [haiku] mecánico, [sonnet] código normal, [opus] lógica compleja/seguridad
- File paths exactos incluidos

---

## Phase 1: User Story 1 — Fix flujo OAuth de Drive (Priority: P1) 🎯 MVP

**Goal**: Que el admin pueda conectar Google Drive sin Error 400, con validación pre-vuelo y captura de errores de Google.

**Independent Test**: Con credenciales correctas en Google Cloud Console, clic en "Conectar con Google" → flujo OAuth completo → vuelve a `/admin/storage?gdrive=connected`. Con credenciales vacías → mensaje claro sin redirigir a Google.

### Implementation for User Story 1

- [x] T001 [P] [US1] [sonnet] Agregar validación pre-vuelo en `src/app/api/admin/storage/google/authorize/route.ts`: verificar que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` no estén vacíos antes de redirigir a Google; si faltan, redirigir a `/admin/storage?gdrive=error&detail=<mensaje claro>` indicando qué variable falta
- [x] T002 [P] [US1] [sonnet] Modificar `src/app/api/admin/storage/google/callback/route.ts` para interceptar errores de Google: antes de verificar `code`, chequear si la URL tiene `?error=xxx`; si lo tiene, redirigir a `/admin/storage?gdrive=error&detail=<mensaje mapeado>` sin intentar intercambiar code

**Checkpoint**: Con estas dos tareas el flujo OAuth no falla silenciosamente. El admin ve mensajes claros en vez del error críptico de Google.

---

## Phase 2: User Story 2 — Guía de configuración (Priority: P1)

**Goal**: El admin ve la redirect URI correcta y una guía paso a paso para configurar Google Cloud Console desde el panel de almacenamiento.

**Independent Test**: Ir a `/admin/storage`, elegir Google Drive → ver la redirect URI calculada y una guía colapsable con los 8 pasos de configuración de Google Cloud Console.

### Implementation for User Story 2

- [x] T003 [P] [US2] [sonnet] Mostrar la redirect URI calculada en `src/app/(main)/admin/storage/page.tsx`: agregar un bloque que muestre `{window.location.origin}/api/admin/storage/google/callback` con un botón o estilo para copiar, visible cuando el proveedor es GDRIVE
- [x] T004 [P] [US2] [haiku] Agregar guía colapsable de configuración de Google Cloud Console en `src/app/(main)/admin/storage/page.tsx`: crear un `<details>/<summary>` con los 8 pasos documentados en research.md R5 (crear proyecto, consent screen, scope Drive, test users, OAuth client, redirect URI, copiar credenciales, reiniciar y conectar)

**Checkpoint**: El admin puede configurar Google Cloud Console desde cero siguiendo la guía en el panel.

---

## Phase 3: User Story 3 — Mensajes de error accionables (Priority: P2)

**Goal**: Cada error OAuth de Google se muestra con un mensaje en español que sugiere qué hacer, en vez del error críptico original.

**Independent Test**: Provocar errores OAuth (cancelar consentimiento, consent screen incompleto, redirect URI mal) → verificar que cada uno muestra un mensaje útil en el panel.

### Implementation for User Story 3

- [x] T005 [US3] [sonnet] Implementar mapeo de errores OAuth en `src/app/api/admin/storage/google/callback/route.ts`: crear función/mapa inline que traduzca `invalid_request`, `access_denied`, `invalid_scope`, `redirect_uri_mismatch` a mensajes en español con sugerencia de acción (ver research.md R2); incluir la redirect URI esperada en el mensaje de `redirect_uri_mismatch`; para errores no mapeados mostrar el error original de Google con sugerencia genérica

**Checkpoint**: Todo error OAuth de Google resulta en un mensaje accionable en español.

---

## Phase 4: Polish & Cross-Cutting

**Purpose**: Documentación y limpieza.

- [x] T006 [P] [haiku] Actualizar `deploy/.env.example` con comentarios claros para `GDRIVE_CLIENT_ID` y `GDRIVE_CLIENT_SECRET` como variables opcionales alternativas a `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` para separar credenciales de login y Drive
- [x] T007 [haiku] Validar el fix completo siguiendo los 5 escenarios de `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Sin dependencias — puede empezar inmediatamente
- **Phase 2 (US2)**: Sin dependencias de Phase 1 — archivos distintos (T003/T004 tocan solo page.tsx, T001/T002 tocan solo routes)
- **Phase 3 (US3)**: Depende de T002 (el mapeo se agrega en callback/route.ts que T002 ya modifica)
- **Phase 4 (Polish)**: Depende de todas las fases anteriores

### User Story Dependencies

- **US1 (P1)**: Independiente — solo toca authorize y callback routes
- **US2 (P1)**: Independiente — solo toca page.tsx
- **US3 (P2)**: Depende de US1 T002 (el interceptor de errores); T005 extiende lo que T002 inicia

### Parallel Opportunities

- T001 y T002 son [P] entre sí (archivos distintos)
- T003 y T004 son [P] entre sí (mismo archivo pero secciones independientes)
- US1 (T001+T002) y US2 (T003+T004) pueden correr en paralelo (archivos distintos)

---

## Parallel Example: Phase 1 + Phase 2

```text
# Todas estas tareas pueden correr en paralelo (archivos distintos):
T001: authorize/route.ts (validación pre-vuelo)
T002: callback/route.ts (interceptar errores)
T003: page.tsx (mostrar redirect URI)
T004: page.tsx (guía colapsable)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Completar T001 + T002 (fix del flujo OAuth)
2. **STOP and VALIDATE**: Probar conexión con Google Drive
3. Si funciona, el error original está resuelto

### Incremental Delivery

1. US1 (T001+T002) → Fix core del error OAuth → Validar
2. US2 (T003+T004) → Guía y redirect URI → Validar
3. US3 (T005) → Mensajes accionables → Validar
4. Polish (T006+T007) → Docs + validación final

---

## Notes

- T001 y T002 son el fix core: resuelven el error reportado
- T003/T004 previenen futuros errores de configuración
- T005 mejora UX de errores (puede hacerse después del fix core)
- Sin cambios en `google-auth.ts` (helpers ya correctos)
- Sin cambios en data model (AccessConfig.storageConfig ya tiene lo necesario)
