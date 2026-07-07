# Data Model: Etiquetar tareas con `$`

## Entidad nueva: TaskLabel

Análoga a `WorkLabel`, relaciona una tarea con un valor de etiqueta (y su clave).

```prisma
model TaskLabel {
  taskId  String
  keyId   String
  valueId String
  task    Task       @relation(fields: [taskId], references: [id], onDelete: Cascade)
  key     LabelKey   @relation(fields: [keyId], references: [id], onDelete: Cascade)
  value   LabelValue @relation(fields: [valueId], references: [id], onDelete: Cascade)

  @@id([taskId, keyId])   // a lo sumo un valor por clave y tarea
}
```

Relaciones inversas a agregar:
- `Task`  → `labels TaskLabel[]`
- `LabelKey` → `taskLabels TaskLabel[]`
- `LabelValue` → `taskLabels TaskLabel[]`

Migración: `prisma/migrations/0032_task_labels/` (crea la tabla, sin backfill).

## Parser (extensión)

`src/lib/domain/tags/parser.ts`:
- `TagSymbol = "/" | "#" | "@" | "$"`
- `SYMBOLS = new Set(["/", "#", "@", "$"])`
- El resto de la mecánica (NAME_CHAR, escape con doble símbolo `$$`, exclusión de punto final) se reutiliza sin cambios.

## Resolución (resolveTask / saveTask en `src/server/tasks.ts`)

Para cada tag `$nombre` en la tarea:
1. Resolver el ámbito de la tarea (grupo del work, o del sector de contexto) + globales.
2. Buscar entre los `LabelValue` disponibles el que matchee `nombre` (canónico, tolerante como `matchByTag`).
3. Si matchea 1 → `{ keyId: value.keyId, valueId: value.id }`.
4. Si el nombre matchea valores de >1 clave → **conflicto** (desambiguar), igual que un `@` ambiguo.
5. Si no matchea → tag sin resolver → panel "crear o corregir" existente (o error 409 según el flujo actual de tags no resueltos).

En `saveTask`, tras resolver, persistir los `TaskLabel` de la tarea: `deleteMany({ taskId })` + `createMany(resolvedLabels)` (mismo patrón que `TaskLink`).

## Reglas de dominio

- **Ámbito**: solo etiquetas globales o del grupo del trabajo/sector de la tarea (FR-009). Reusa `labelScopeOf`/disponibilidad de 031.
- **Unicidad**: un valor por clave por tarea (`@@id([taskId, keyId])`). Reasignar la misma clave reemplaza el valor (FR-005/FR-007).
- **Independencia**: las etiquetas de la tarea son independientes de las del trabajo (WorkLabel). Etiquetar el trabajo no etiqueta sus tareas.

## Contrato de sugerencia (dropdown)

`Suggestion` gana el tipo `"label"`:
```
{ id: valueId, name: "<valor>", type: "label", keyName: "<clave>", color: "<LabelColor>", insertText: "$<valor-tag>" }
```
El dropdown muestra "Clave: Valor" con el color del valor.

## Filtro por etiqueta (vista de sector)

`GET /api/sectors/{id}/tasks?...&labelValueId=<id>` (o `labelKeyId`): filtra las tareas del sector que tengan ese `TaskLabel`. La UI del `FilterBar` de sector agrega el selector de etiqueta.
