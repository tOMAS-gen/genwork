# Data Model: Sector Personal, Notas y Google Auth

## Entity: Note

Contenido de texto enriquecido que pertenece al sector personal de un usuario.

| Field     | Type     | Constraints                              | Description                                  |
|-----------|----------|------------------------------------------|----------------------------------------------|
| id        | UUID     | PK, auto-generated                       | Identificador único                          |
| title     | String   | required, max 200 chars                  | Título de la nota                            |
| content   | JSON     | nullable, default null                   | Contenido rich-text en formato TipTap/JSON   |
| userId    | UUID     | FK → User.id, required, ON DELETE CASCADE| Dueño de la nota                             |
| createdAt | DateTime | auto, default now()                      | Fecha de creación                            |
| updatedAt | DateTime | auto, updated on write                   | Última modificación (para ordenar)           |

**Relationships**:
- Note → User (many-to-one): cada nota pertenece a un usuario
- User → Note (one-to-many): un usuario tiene muchas notas

**Indexes**:
- `(userId, updatedAt DESC)` — para listar notas del usuario ordenadas por reciente

## Entity: User (extensión)

Campos nuevos agregados al modelo User existente:

| Field | Type   | Constraints          | Description                          |
|-------|--------|----------------------|--------------------------------------|
| image | String | nullable, optional   | URL de la foto de perfil de Google   |

## Notes

- No se crea entidad separada para "Sector Personal" — las notas se vinculan directamente al userId. El concepto de sector personal es una abstracción de UI, no un registro de BD.
- El campo `content` usa JSON (jsonb en PostgreSQL) para almacenar el documento TipTap/ProseMirror. Null indica nota vacía/nueva.
- No hay soft-delete — la eliminación es definitiva con confirmación en UI.
