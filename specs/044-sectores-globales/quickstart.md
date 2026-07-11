# Quickstart: validar Sectores globales

Prerrequisitos: entorno de desarrollo levantado (`npm run dev`, puerto 3010), base de datos con al menos 2 grupos existentes, un usuario `SUPERADMIN` y un usuario `MEMBER` de cada grupo.

## 1. Migración de datos aplicada

```bash
npm run db:migrate:dev
```

Verificar manualmente en la base (o con `prisma studio`) que:
- La tabla `Sector` ya no tiene columnas `groupId`/`ownerId`.
- Si existían dos sectores con el mismo nombre en grupos distintos antes de migrar, ahora hay un único registro, y sus tareas/`TaskLink`/`SectorGrant` previos apuntan a ese registro sobreviviente (ver `data-model.md` § Regla de migración).

### Verificación de cero pérdida (SC-002)

El script `prisma/migrations/20260711140000_sectores_globales/verify.sql` confirma que la
fusión no pierde filas (SC-002 / FR-007). Se corre **dos veces con el mismo comando**, antes
y después de aplicar la migración:

```bash
# 1) ANTES de migrar (con los sectores homónimos todavía presentes): anotar expected_count
psql "$DATABASE_URL" -f prisma/migrations/20260711140000_sectores_globales/verify.sql

# 2) DESPUÉS de migrar: comparar actual_count contra lo anotado
psql "$DATABASE_URL" -f prisma/migrations/20260711140000_sectores_globales/verify.sql
```

Sin binario `psql` local, correr el mismo archivo dentro del contenedor de dev:

```bash
docker exec -i genwork-dev-postgres-1 psql -U genwork -d genwork \
  < prisma/migrations/20260711140000_sectores_globales/verify.sql
```

Interpretación: para cada métrica (`Task`, `SectorGrant`, `TaskLink`, `TaskStatus`), el
`expected_count` de la corrida ANTES debe coincidir con el `actual_count` de la corrida
DESPUÉS (el script deduplica por PK/clave única replicando el mapa de fusión de la migración,
así que un total menor por colisión legítima ya está contemplado). Cualquier discrepancia
significa pérdida de datos: no promover a producción. El detalle está documentado en los
comentarios del propio `verify.sql`.

## 2. Creación reservada a SUPERADMIN (FR-004)

1. Loguearse como usuario `MEMBER` (no `SUPERADMIN`) → intentar `POST /api/sectors` con `{ "name": "Prueba QA" }`. Esperado: `403`.
2. Loguearse como `SUPERADMIN` → `POST /api/sectors` con el mismo body. Esperado: `201`, sector creado, visible únicamente por quien tenga `SectorGrant` (o por otro `SUPERADMIN`).

## 3. Catálogo único entre grupos (US1 / SC-001, SC-003)

1. Como `SUPERADMIN`, otorgar `SectorGrant` del sector "Prueba QA" a un usuario del Grupo A y a un usuario del Grupo B (`admin.sectorGrant.set` vía MCP o UI de administración).
2. Como el usuario del Grupo A: crear una tarea con `#Prueba QA` desde un trabajo del Grupo A.
3. Como el usuario del Grupo B: crear otra tarea con `#Prueba QA` desde un trabajo del Grupo B.
4. `GET /api/sectors` (o la vista del sector) debe mostrar ambas tareas contando en las mismas métricas (`total`, `done`, `pending`) del sector "Prueba QA" — mismo resultado sin importar desde qué grupo se consulte.

## 4. Acceso negado sin grant (US3 / SC-004)

1. Como un tercer usuario `MEMBER` sin `SectorGrant` en "Prueba QA": `GET /api/sectors/:id/tasks` sobre ese sector. Esperado: `404` (no ve ni sabe que existe, igual criterio que hoy para sectores sin acceso).

## 5. Administración exclusiva de SUPERADMIN (FR-006)

1. Como `MEMBER`: `PATCH`/`DELETE` sobre cualquier sector. Esperado: `403`.
2. Como `SUPERADMIN`: renombrar, recolorear y eliminar un sector de prueba sin datos — debe funcionar igual que hoy (con la confirmación de borrado `?confirm=true` si tiene tareas asociadas).

## Resultado esperado

Todos los pasos anteriores pasan sin necesidad de recrear un sector por grupo, y ningún usuario ve o modifica un sector para el que no tiene `SectorGrant` (salvo `SUPERADMIN`).
