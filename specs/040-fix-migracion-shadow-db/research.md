# Research: Arreglar orden de migraciones (shadow DB)

## 1. Causa raíz (confirmada empíricamente)

**Método**: se replicó el historial completo de `prisma/migrations/` migración por
migración, en orden alfabético de carpeta (el orden real que usa el motor de Prisma),
contra una base de datos Postgres descartable recién creada (`CREATE DATABASE`, sin
plantilla contaminada — verificado aparte). El replay reprodujo el error `P3006`
exacto reportado por `prisma migrate dev`.

**Hallazgo**: `0033_colors_to_hex/migration.sql` ejecuta, entre otras, estas dos
sentencias:

```sql
UPDATE "Group" SET "color" = '#ef4444' WHERE "color" = 'RED';
...
UPDATE "ProjectStage" SET "color" = '#ef4444' WHERE "color" = 'RED';
```

Pero la columna `Group.color` la agrega recién `20260704043817_add_group_color`, y la
tabla `ProjectStage` (con su columna `color`) la crea recién
`20260704011951_0005_project_stages` — ambas con prefijo de carpeta `2026...`. Como
`"0"` ordena antes que `"2"` en ASCII, **toda carpeta con prefijo numérico corto
(`000N`) ordena alfabéticamente antes que toda carpeta con prefijo timestamp
(`2026...`)**, sin importar cuándo se creó/aplicó realmente cada una. Prisma aplica
migraciones siempre en ese orden alfabético — nunca por fecha de creación real.

Se confirmó cruzando esto contra `_prisma_migrations.finished_at` de la base de
desarrollo real: el orden en que las migraciones se aplicaron REALMENTE (mezclando
prefijos cortos y timestamp de forma intercalada, a medida que el proyecto fue
migrando de un esquema de numeración a otro) no coincide con el orden alfabético de
sus carpetas. La base de desarrollo actual está en un estado consistente porque se
construyó aplicando cada migración en su momento real (orden cronológico); el problema
solo aparece al intentar *reproducir* ese historial desde cero (shadow DB, o cualquier
base nueva), porque ahí Prisma no tiene más remedio que usar el orden alfabético.

**Migraciones con prefijo corto involucradas**: `0001_init`, `0002_work_description`,
`0003_ownership_labels`, `0004_dashboard`, `0005_sector_color`,
`0005_work_templates`, `0031_labels_global_scope`, `0032_task_labels`,
`0033_colors_to_hex`. Además, `20260705_personal_stages` tiene un prefijo timestamp
incompleto (solo fecha, sin hora) que también genera un cruce de orden con
`20260705183812_task_position` (aplicada después en la realidad, pero que ordenaría
antes alfabéticamente sin corrección) — se incluye en el arreglo por la misma causa.

## 2. Alternativas consideradas

- **Editar el contenido SQL de `0033_colors_to_hex`** (por ejemplo, mover las líneas de
  `Group`/`ProjectStage` a una migración nueva posterior): rechazada por FR-003 — esa
  migración ya está aplicada en la base de desarrollo real; Prisma valida el checksum
  del archivo contra el registrado en `_prisma_migrations`, así que modificar su
  contenido rompería la validación en cualquier base que ya la tenga aplicada.
- **Dejar el bug y seguir usando `prisma migrate deploy` como workaround** (lo hecho en
  la feature 039): rechazada como solución definitiva — el problema reaparece en cada
  `prisma migrate dev` futuro, y `migrate deploy` no genera migraciones nuevas
  (`--create-only` tampoco evita el diff contra la shadow DB). No resuelve la causa.
- **Renombrar las carpetas de migración con prefijo corto a un prefijo timestamp que
  refleje el orden real de aplicación** (elegida): no toca el SQL de ninguna
  migración — solo su nombre de carpeta — así que el checksum del *contenido* no
  cambia. Requiere sincronizar el nombre registrado en `_prisma_migrations` de la base
  de desarrollo local para que Prisma la siga reconociendo como aplicada.

## 3. Mapeo de renombres (validado con un replay completo exitoso)

Cada nombre nuevo se deriva del `finished_at` real registrado en
`_prisma_migrations` de la base de desarrollo, ajustando segundos para evitar
colisiones cuando dos migraciones comparten el mismo minuto:

| Carpeta actual | Carpeta nueva |
|---|---|
| `0001_init` | `20260703143511_init` |
| `0002_work_description` | `20260703143512_work_description` |
| `0003_ownership_labels` | `20260703143513_ownership_labels` |
| `0004_dashboard` | `20260703182355_dashboard` |
| `0005_sector_color` | `20260704025119_sector_color` |
| `0005_work_templates` | `20260705004323_work_templates` |
| `20260705_personal_stages` | `20260705173143_personal_stages` |
| `0031_labels_global_scope` | `20260706160007_labels_global_scope` |
| `0032_task_labels` | `20260706165732_task_labels` |
| `0033_colors_to_hex` | `20260706185921_colors_to_hex` |

Las demás carpetas (ya con timestamp completo: `20260704011951_0005_project_stages`,
`20260704043817_add_group_color`, `20260704225957_personal_notes`,
`20260705024331_task_description`, `20260705183812_task_position`,
`20260706033251_folder_seq_and_move_jobs`, `20260706120000_add_reminders`,
`20260708120000_add_mcp_server`) no se tocan — ya ordenan correctamente relativas a
las renombradas de arriba (verificado en el replay).

**Verificación realizada**: se recreó una base de datos descartable y se aplicó el
`migration.sql` de cada carpeta, en el ORDEN NUEVO (usando los nombres de la tabla de
arriba), uno por uno — las 18 migraciones se aplicaron sin ningún error. Esto confirma
que el nuevo orden alfabético (post-renombre) es dependency-safe de punta a punta.

## 4. Actualización de `_prisma_migrations`

Renombrar solo las carpetas no alcanza: Prisma decide si una migración ya fue aplicada
comparando el **nombre** de la carpeta contra la columna `migration_name` de
`_prisma_migrations`. Si se renombran las carpetas sin actualizar esa tabla, Prisma
vería 10 "migraciones nuevas" (los nombres viejos ya no existen en disco) y trataría de
aplicarlas de nuevo sobre una base que ya tiene ese esquema, fallando por objetos
duplicados. Por eso el arreglo incluye un `UPDATE "_prisma_migrations" SET
migration_name = ... WHERE migration_name = ...` por cada fila renombrada, ejecutado
contra la base de datos de desarrollo local (única base con este historial aplicado,
según spec.md → Assumptions).

## 5. Alcance de las pruebas

No aplica ningún framework de test automatizado nuevo: la verificación es
operacional (correr el replay desde cero y `prisma migrate status`), documentada en
`quickstart.md`. No hay lógica de dominio nueva que testear con Vitest.
