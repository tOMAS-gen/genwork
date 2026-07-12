# Feature Specification: Arreglar orden de migraciones (shadow DB)

**Feature Branch**: `040-fix-migracion-shadow-db`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "arreglá la migración 0033_colors_to_hex"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correr `prisma migrate dev` sin errores de shadow DB (Priority: P1)

Un desarrollador de Genwork corre `npm run db:migrate:dev` (o cualquier variante de
`prisma migrate dev`) en su entorno local para agregar una migración nueva. Hoy esto
falla siempre con el error `P3006` ("Migration `0033_colors_to_hex` failed to apply
cleanly to the shadow database... column "color" does not exist"), obligando a
esquivarlo manualmente con `prisma migrate deploy` (como se hizo en la feature 039).

**Why this priority**: Es el único problema real a resolver — sin esto, ningún
desarrollador puede volver a usar el flujo estándar de migraciones de Prisma.

**Independent Test**: Correr `npm run db:migrate:dev -- --name cualquier_prueba` en un
checkout limpio del repo (con el stack de datos levantado) y verificar que no aparece
el error P3006, sin necesidad de pasos manuales.

**Acceptance Scenarios**:

1. **Given** el repositorio en su estado actual y el stack de datos de desarrollo
   levantado, **When** un desarrollador corre `prisma migrate dev`, **Then** las 18
   migraciones existentes se reproducen limpiamente contra la shadow database, sin
   error `P3006`.
2. **Given** una base de datos de desarrollo ya migrada con el historial actual
   (`_prisma_migrations`), **When** se aplica el arreglo, **Then** `prisma migrate
   status`/`prisma migrate deploy` siguen reportando esa base como al día, sin exigir
   reaplicar ninguna migración ya aplicada.
3. **Given** una base de datos nueva (o de otro desarrollador) que todavía no tiene
   ninguna migración aplicada, **When** corre `prisma migrate deploy` con el historial
   ya corregido, **Then** el resultado final es exactamente el mismo esquema que
   produce hoy el historial sin corregir (mismas tablas, columnas y datos
   transformados).

---

### Edge Cases

- ¿Qué pasa con una base de datos que YA tiene el historial de migraciones aplicado
  (como la de desarrollo local)? No debe requerir ninguna acción manual ni reaplicar
  nada — el arreglo tiene que ser transparente para bases ya migradas.
- ¿Qué pasa si el arreglo se aplica pero algún otro desarrollador ya tiene localmente
  el historial viejo aplicado con nombres de migración distintos? Debe poder seguir
  corriendo `prisma migrate deploy`/`dev` sin conflictos (mismo caso que el punto
  anterior).
- ¿Qué pasa si en el futuro se agrega una migración nueva? El orden de archivos en
  `prisma/migrations/` debe quedar consistente (ordenable lexicográficamente = orden de
  dependencias real) para que esto no vuelva a pasar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El repositorio DEBE permitir correr `prisma migrate dev` (vía
  `npm run db:migrate:dev`) desde cero contra una base de datos vacía sin que falle con
  el error `P3006` de shadow database.
- **FR-002**: El orden de los directorios de `prisma/migrations/` (ordenados
  lexicográficamente, que es como Prisma los aplica) DEBE coincidir con el orden real
  de dependencias entre columnas/tablas: ninguna migración puede referenciar una
  columna o tabla que todavía no fue creada por una migración anterior en ese mismo
  orden.
- **FR-003**: El arreglo NO DEBE modificar el contenido SQL de ninguna migración ya
  aplicada a la base de datos de desarrollo actual — solo puede reordenarlas (renombrar
  sus carpetas) para no invalidar su checksum registrado de forma incompatible con lo
  ya aplicado.
- **FR-004**: El arreglo DEBE actualizar el historial (`_prisma_migrations`) de la base
  de datos de desarrollo local para que seus nombres de migración coincidan con las
  carpetas renombradas, de modo que Prisma la siga reconociendo como "al día" sin
  reaplicar nada.
- **FR-005**: Después del arreglo, reproducir el historial completo de migraciones
  desde cero (base vacía) DEBE producir exactamente el mismo esquema final (mismas
  tablas, columnas, tipos, e igual resultado de las transformaciones de datos de
  `0033_colors_to_hex`) que produce hoy la base de datos de desarrollo ya migrada.

### Key Entities *(include if data schema involved)*

- **Migración de Prisma**: Carpeta en `prisma/migrations/` con un `migration.sql`; su
  nombre de carpeta determina simultáneamente (a) el orden de aplicación y (b) el
  identificador con el que Prisma la registra como aplicada en `_prisma_migrations`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un desarrollador puede correr `prisma migrate dev` en un checkout nuevo
  contra una base de datos vacía y llegar al esquema completo actual sin ningún paso
  manual ni error.
- **SC-002**: La base de datos de desarrollo ya existente sigue funcionando sin
  cambios de comportamiento ni pérdida de datos después del arreglo.
- **SC-003**: `prisma migrate status` reporta "up to date" en la base de datos de
  desarrollo local inmediatamente después del arreglo, sin migraciones pendientes.

## Assumptions

- La causa raíz (confirmada reproduciendo el historial completo contra una base de
  datos descartable) es que `0033_colors_to_hex` — y otras migraciones con prefijo
  numérico corto (`000N`) — quedaron mezcladas con migraciones de prefijo timestamp
  (`YYYYMMDDHHMMSS`) de forma que el orden alfabético de las carpetas (con el que
  Prisma siempre aplica migraciones) ya no coincide con el orden real en que fueron
  aplicadas en desarrollo. En particular, `0033_colors_to_hex` actualiza columnas de
  `Group` y `ProjectStage` que recién existen gracias a dos migraciones con timestamp
  (`20260704043817_add_group_color`, `20260704011951_0005_project_stages`) que
  alfabéticamente ordenan DESPUÉS de `0033...` (todo lo que empieza con `0` ordena
  antes que todo lo que empieza con `2`).
- El arreglo consiste en renombrar las carpetas de migración con prefijo numérico
  corto a un prefijo timestamp que preserve el orden real de aplicación (confirmado
  contra `_prisma_migrations.finished_at` de la base de desarrollo), y actualizar esa
  misma tabla en la base de desarrollo local para que seus nombres coincidan. No hay
  entorno de producción con este historial aplicado fuera de la base de desarrollo
  local de este repo (proyecto de un solo desarrollador).
- No se modifica el contenido SQL de ninguna migración: es exclusivamente un
  reordenamiento de nombres de carpeta.
