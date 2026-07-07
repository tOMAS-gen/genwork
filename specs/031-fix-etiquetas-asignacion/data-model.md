# Data Model: Fix — Etiquetas no visibles al asignar

## Entidades (existentes, sin cambio estructural)

### LabelKey

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| name | string | nombre de la clave |
| groupId | uuid? | ámbito de grupo |
| ownerId | uuid? | ámbito personal |

**Ámbitos (combinación de groupId/ownerId):**

| Ámbito | groupId | ownerId | Quién administra | Visible en |
|--------|---------|---------|------------------|------------|
| **Global** (NUEVO) | null | null | super-admin | todos los proyectos |
| **Grupo** | X | null | admin del grupo X / super-admin | proyectos del grupo X |
| **Personal** | null | U | usuario U | proyectos personales de U |

Constraints existentes: `@@unique([groupId, name])`, `@@unique([ownerId, name])`. La unicidad del ámbito global se valida en aplicación (R2).

### LabelValue / WorkLabel

Sin cambios. `WorkLabel(workId, keyId, valueId)` con `@@id([workId, keyId])` (a lo sumo un valor por clave y proyecto).

## Reglas de dominio

### Visibilidad (disponibilidad al asignar)

Para un proyecto `work`, el conjunto de claves disponibles es:

```
disponibles(work) =
    { LabelKey : groupId=null ∧ ownerId=null }                 // globales (siempre)
  ∪ { LabelKey : groupId=work.groupId }  si work.groupId≠null  // del grupo
  ∪ { LabelKey : ownerId=work.ownerId }  si work.ownerId≠null  // personales del proyecto
```

Sin duplicados (una clave está en exactamente un ámbito). Cada clave se anota con `scope ∈ {global, group, personal}`.

### Asignación (regla FR-005/R5)

Una etiqueta `key` puede asignarse a `work` si:

```
esGlobal(key)   = key.groupId=null ∧ key.ownerId=null
mismoAmbito(key,work) = key.groupId=work.groupId ∧ key.ownerId=work.ownerId
permitido = esGlobal(key) ∨ mismoAmbito(key, work)
```

### Administración (gate)

| Acción sobre ámbito | Autorizado |
|---------------------|------------|
| Global (crear/editar/eliminar clave o valor) | solo `SUPERADMIN` |
| Grupo X | `canManageGroup(user, X)` (admin del grupo) o `SUPERADMIN` |
| Personal U | el propio usuario U o `SUPERADMIN` |

`requireLabelAdmin` se extiende para el caso global (ambos null → exige SUPERADMIN; hoy cae en `forbidden`).

## Migración de datos (0031_labels_global_scope)

```sql
-- Convierte a global las etiquetas creadas por super-admins como "generales"
UPDATE "LabelKey" k
SET "ownerId" = NULL
WHERE k."groupId" IS NULL
  AND k."ownerId" IN (SELECT id FROM "User" WHERE "globalRole" = 'SUPERADMIN');
```

Idempotente: reejecutar no cambia filas ya globalizadas. Ver riesgo en research R6.
