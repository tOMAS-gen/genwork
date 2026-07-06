# Data Model: Drawer & Editor Polish

## Cambios de schema

**Ninguno.** No se necesitan migraciones ni cambios a `prisma/schema.prisma`.

## Entidades existentes usadas

### TaskLink (existente)

```
model TaskLink {
  taskId     String
  type       LinkType          // EXEC | REF
  targetType LinkTargetType    // SECTOR | USER
  targetId   String
  sectorId   String?
  userId     String?
  ...
  @@id([taskId, type, targetType, targetId])
}
```

- Para "Mis referencias": query `type=REF, targetType=USER, userId=currentUser.id`
- Endpoint existente: `GET /api/me/references?state=PENDING`

### TipTap Document (JSON en campo `content` de Note y `doc` de Work)

El contenido TipTap se almacena como JSON libre. Los nuevos tipos de bloque (taskList, orderedList, blockquote, codeBlock, horizontalRule) se serializan automáticamente por TipTap sin cambios al schema de base de datos.
