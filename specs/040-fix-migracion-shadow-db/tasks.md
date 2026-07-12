---

description: "Task list template for feature implementation"
---

# Tasks: Arreglar orden de migraciones (shadow DB)

**Input**: Design documents from `/specs/040-fix-migracion-shadow-db/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md (todos presentes)

**Tests**: No aplica — es una corrección de infraestructura sin lógica de dominio;
la verificación es operacional (ver quickstart.md, tarea T003).

**Organization**: Una única historia de usuario (US1, P1) — no hay fases
Setup/Foundational separadas porque el prerrequisito (stack de datos levantado) ya es
una precondición documentada, no una tarea de código.

## Format: `[ID] [P?] [Story] [modelo] Description`

- **[modelo]**: `[haiku]` mecánico sin decisiones, `[sonnet]` trabajo normal, `[opus]`
  lógica riesgosa/compleja (migraciones de datos, ver criterio en el prompt de esta fase)
- Cada tarea incluye la ruta exacta de archivo

---

## Phase 1: User Story 1 - Correr `prisma migrate dev` sin errores de shadow DB (Priority: P1)

**Goal**: Que `prisma migrate dev` deje de fallar con `P3006`, sin romper la base de
datos de desarrollo ya migrada.

**Independent Test**: Correr los 3 pasos de `quickstart.md` (`migrate status`,
`migrate dev --create-only`, `migrate diff`) y confirmar los resultados esperados en
cada uno.

### Implementation for User Story 1

- [X] T001 [US1] [haiku] Renombrar (`git mv`) las 10 carpetas de `prisma/migrations/` según la tabla de `research.md` §3 — SOLO el nombre de carpeta, sin tocar el contenido de ningún `migration.sql`: `0001_init`→`20260703143511_init`, `0002_work_description`→`20260703143512_work_description`, `0003_ownership_labels`→`20260703143513_ownership_labels`, `0004_dashboard`→`20260703182355_dashboard`, `0005_sector_color`→`20260704025119_sector_color`, `0005_work_templates`→`20260705004323_work_templates`, `20260705_personal_stages`→`20260705173143_personal_stages`, `0031_labels_global_scope`→`20260706160007_labels_global_scope`, `0032_task_labels`→`20260706165732_task_labels`, `0033_colors_to_hex`→`20260706185921_colors_to_hex`
- [X] T002 [US1] [opus] Actualizar la tabla `_prisma_migrations` de la base de datos de desarrollo local (`DATABASE_URL` de `.env`) para que sus 10 filas correspondientes a las carpetas de T001 tengan el `migration_name` nuevo — antes de escribir, verificar con un `SELECT` que hay exactamente una fila por cada nombre viejo (ninguna duplicada, ninguna faltante) para no actualizar la fila equivocada; usar `UPDATE "_prisma_migrations" SET migration_name = '<nuevo>' WHERE migration_name = '<viejo>'` por cada par, dentro de una transacción, y confirmar el conteo de filas afectado (debe ser exactamente 1 por sentencia) (depende de T001 — el nombre nuevo debe existir como carpeta real en disco antes de registrarlo)
- [X] T003 [US1] [sonnet] Ejecutar los 3 pasos de `specs/040-fix-migracion-shadow-db/quickstart.md` (`prisma migrate status`, `prisma migrate dev --create-only --name verificacion_orden`, `prisma migrate diff`) y confirmar los resultados esperados documentados ahí; si `migrate dev` llegó a crear la carpeta de verificación, borrarla (depende de T001, T002)

**Checkpoint**: `prisma migrate status` reporta la base al día y un replay desde cero
(shadow DB) ya no falla con `P3006`.

---

## Dependencies & Execution Order

- T001 → T002 → T003 (estrictamente secuencial: renombrar carpetas primero, después
  sincronizar la tabla de la base real con los nombres nuevos, y recién al final
  verificar que todo quedó consistente)
- Sin oportunidades de paralelismo — las 3 tareas mutan el mismo estado compartido
  (carpetas de migración + tabla de tracking de la misma base de datos) y deben
  ejecutarse en orden.

## Implementation Strategy

Al ser una única historia con 3 pasos estrictamente secuenciales, no hay MVP parcial
posible: las 3 tareas se completan juntas en una sola pasada antes de dar el feature
por terminado.

## Notes

- No commitear el `UPDATE` de T002 como migración ni script versionado — es una
  corrección puntual sobre el estado de la base de datos de desarrollo local, no un
  cambio de schema (spec.md → Assumptions: sin entorno de producción con este
  historial).
- Si T002 se ejecuta sobre una base de datos que NO tiene el historial viejo aplicado
  (por ejemplo, la de otro desarrollador que clona el repo después del arreglo), no
  hace falta ningún `UPDATE`: `prisma migrate deploy`/`dev` aplican directamente los
  nombres nuevos desde cero, sin conflicto.
