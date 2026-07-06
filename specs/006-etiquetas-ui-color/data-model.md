# Data Model: 006-etiquetas-ui-color

**Date**: 2026-07-03

## Entidades existentes (sin cambios al schema)

### LabelKey
| Campo   | Tipo      | Constraint                        |
|---------|-----------|-----------------------------------|
| id      | UUID      | PK                                |
| name    | String    | unique per scope (groupId+name, ownerId+name) |
| groupId | UUID?     | FK → Group                        |
| ownerId | UUID?     | FK → User                         |

### LabelValue
| Campo | Tipo       | Constraint            |
|-------|------------|-----------------------|
| id    | UUID       | PK                    |
| keyId | UUID       | FK → LabelKey         |
| name  | String     | unique per key (keyId+name) |
| color | LabelColor | enum de 10 colores    |

### WorkLabel
| Campo   | Tipo | Constraint                      |
|---------|------|---------------------------------|
| workId  | UUID | FK → Work, parte del PK compuesto |
| keyId   | UUID | FK → LabelKey, parte del PK    |
| valueId | UUID | FK → LabelValue                 |

**Constraint**: PK compuesto (workId, keyId) — un proyecto tiene máximo un valor por clave.

### LabelColor (enum)
RED | ORANGE | AMBER | GREEN | TEAL | BLUE | INDIGO | VIOLET | PINK | GRAY

## Concepto derivado: Color de proyecto

No se persiste. Se calcula como:

```
projectColor(labels: WorkLabelDto[]): LabelColor | null =
  labels
    .sort((a, b) => a.keyName.localeCompare(b.keyName))
    [0]?.color ?? null
```

**Reglas**:
- Si el proyecto no tiene labels → null (sin indicador de color)
- Si tiene labels → el color del valor cuya clave es alfabéticamente primera
- Al cambiar/eliminar labels, se recalcula en el próximo render (no requiere invalidación especial — ya se refresca vía SSE/onChanged)

## Relaciones

```
Group/User ──1:N──▸ LabelKey ──1:N──▸ LabelValue
                         │                   │
                    WorkLabel ◂──────────────┘
                         │
                    Work ◂┘
```
