# Data Model: Mejoras de grupos y archivos (054)

Sin entidades nuevas. Un campo nuevo y estados derivados.

## Work (modificado)

| Campo | Tipo | Nuevo | Descripción |
|-------|------|-------|-------------|
| `folderEnabledAt` | `DateTime?` | ✅ | Momento en que un ADMIN/dueño habilitó la carpeta del proyecto. `null` = carpeta no habilitada. |
| `nextcloudFolderPath` | `String?` | (existente) | Path de la carpeta ya creada en el proveedor (Nextcloud o Drive). |
| `folderSeq` | `Int` | (existente) | Secuencia para el nombre `NNN-nombre`. |

### Estados de carpeta (derivados)

| Estado | `folderEnabledAt` | `nextcloudFolderPath` | UI en Archivos |
|--------|-------------------|----------------------|----------------|
| No habilitada | `null` | `null` | Botón "Habilitar carpeta" (ADMIN/dueño) o aviso (resto) |
| Habilitada, creándose | ≠ `null` | `null` | Aviso "creando carpeta…" (job en cola) |
| Creada | ≠ `null` | ≠ `null` | Navegador de archivos normal |

Transiciones: `No habilitada → Habilitada` solo vía `POST /api/works/[id]/files/enable` (idempotente; no hay transición inversa en v1). `Habilitada → Creada` la ejecuta el job `CREATE_WORK_FOLDER`.

### Migración

```sql
ALTER TABLE "Work" ADD COLUMN "folderEnabledAt" TIMESTAMP(3);
UPDATE "Work" SET "folderEnabledAt" = "createdAt" WHERE "nextcloudFolderPath" IS NOT NULL;
```

## Group / GroupMembership (sin cambios de schema)

- `GroupMembership.role` (ADMIN/MEMBER) pasa a usarse como guard de "Habilitar carpeta".
- Alta/baja de membresía encola, además de `ADD_MEMBER`/`REMOVE_MEMBER`, un `AUDIT_GROUP_PERMISSIONS` inmediato del grupo (verificación de convergencia; kind ya existente).

## ProvisioningJob (sin cambios de schema)

- `CREATE_WORK_FOLDER` deja de encolarse al crear Work; solo lo encola la habilitación.
- `MOVE/RENAME/DELETE_WORK_FOLDER`: skip limpio si el Work no tiene `nextcloudFolderPath`.
