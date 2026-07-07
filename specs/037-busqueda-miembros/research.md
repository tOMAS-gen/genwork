# Research: Búsqueda de usuarios para agregar miembros

Sin `NEEDS CLARIFICATION` pendientes (el Technical Context del plan quedó
completo con el stack existente). Este documento registra las decisiones
técnicas tomadas para las partes no obvias del diseño.

## Decisión 1: Estrategia de matching (nombre/email, insensible a mayúsculas/tildes)

- **Decisión**: Traer un conjunto acotado de usuarios candidatos desde Prisma
  (findMany con límite) y filtrar/ordenar en memoria (TypeScript) usando
  `normalizeTagName` (ya existente en `src/lib/domain/tags/parser.ts`), igual
  que hace hoy `/api/tags/suggest` para sugerir usuarios en menciones `@`.
- **Rationale**: Postgres no soporta comparación insensible a acentos "gratis"
  sin extensiones (`unaccent`) que el proyecto no tiene instaladas; el volumen
  esperado de usuarios (decenas/cientos, ver Scale/Scope del plan) hace que
  filtrar en memoria sea correcto y simple (Principio V, YAGNI), y reutiliza
  una función de dominio ya testeada en vez de introducir una nueva.
- **Alternatives considered**:
  - Extensión Postgres `pg_trgm`/`unaccent`: rechazada por complejidad
    operativa (requiere migración + habilitar extensión) desproporcionada al
    volumen de datos.
  - `contains` de Prisma con `mode: "insensitive"`: cubre mayúsculas pero NO
    tildes; se descarta porque no cumple FR-002 (insensible a tildes) por sí solo.

## Decisión 2: Búsqueda en vivo (debounce) vs. botón "Buscar"

- **Decisión**: Debounce corto (~250-300ms) en el cliente tras cada tecla, sin
  botón de búsqueda separado, arrancando la búsqueda a partir de 2 caracteres.
- **Rationale**: Consistente con FR-008 y con el patrón ya usado en
  `useTagAutocomplete`/`FilterBar` (fetch reactivo sin botón). El debounce evita
  disparar una request por cada tecla mientras mantiene la sensación de
  "resultados en vivo" (SC-003, SC-004).
- **Alternatives considered**: Buscar sin debounce (una request por tecla):
  descartado por generar carga innecesaria; botón "Buscar" explícito:
  descartado porque contradice FR-008 y el resto de los buscadores de la app.

## Decisión 3: Límite de resultados devueltos

- **Decisión**: El endpoint de búsqueda devuelve como máximo 8 resultados
  ordenados por relevancia simple (coincidencia al inicio del nombre/email
  primero, luego alfabético).
- **Rationale**: Un combobox de alta de miembro no necesita paginar: alcanza con
  mostrar una lista corta y pedir refinar la búsqueda si no aparece la persona
  buscada. Evita construir paginación/infinite-scroll que no aporta valor a
  esta iteración (Principio V).
- **Alternatives considered**: Paginación completa: rechazada por
  sobre-ingeniería para el caso de uso (buscar UNA persona para agregar).

## Decisión 4: Permisos del endpoint de búsqueda

- **Decisión**: El endpoint `GET /api/groups/[id]/members/search` reutiliza
  exactamente el mismo guard que el alta existente: `requireWriter()` +
  `canManageGroup(ctx, groupId)` (403 si no es administrador del grupo).
- **Rationale**: FR-006 exige las mismas reglas de permisos que el alta manual
  actual; reutilizar el guard existente evita duplicar lógica de autorización.
- **Alternatives considered**: Ninguna — es la única opción consistente con la
  spec y con el principio de no crear nuevos roles.

## Decisión 5: Exclusión de miembros existentes

- **Decisión**: El endpoint consulta los `userId` con `GroupMembership` en ese
  grupo y se los pasa como set de exclusión a la misma función pura de matching
  (`src/lib/domain/users/matching.ts`, ver data-model.md) que resuelve el
  filtro por texto; la exclusión NO se hace en el cliente ni requiere una
  segunda función separada.
- **Rationale**: Mantiene toda la lógica de "qué resultados mostrar" en un único
  lugar testeable (una función pura con test unitario dedicado), en vez de
  repartir la regla de exclusión entre el query SQL y la función de matching.
  Evita filtrar en el cliente listas que de entrada no deberían exponerse.
