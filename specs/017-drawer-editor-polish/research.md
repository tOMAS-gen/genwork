# Research: Drawer & Editor Polish

## Decision 1: TipTap extensions para bloques faltantes

**Decision**: Usar extensiones incluidas en StarterKit (OrderedList, Blockquote, CodeBlock, HorizontalRule) + instalar `@tiptap/extension-task-list` y `@tiptap/extension-task-item` para checkboxes.

**Rationale**: StarterKit ya incluye ordered list, blockquote, code block y horizontal rule — solo necesitan exponerse via slash command. Task list/item son las únicas extensiones no incluidas en StarterKit.

**Alternatives considered**:
- Usar checkbox HTML puro sin extensión TipTap → no persiste estado, no integra con el modelo de documento.

## Decision 2: Dónde agregar SlashCommand

**Decision**: Agregar SlashCommand extension + todos los bloques nuevos tanto en `NoteEditor.tsx` como en `DocEditor.tsx`.

**Rationale**: NoteEditor actualmente NO tiene slash commands (solo toolbar). DocEditor ya tiene SlashCommand pero le faltan los items nuevos. Ambos editores deben compartir la misma experiencia. La catalog de items (`slash-items.ts`) ya es compartida.

**Alternatives considered**:
- Solo agregar a NoteEditor → inconsistencia con DocEditor, viola la expectativa del usuario.

## Decision 3: API para "Mis referencias"

**Decision**: Reutilizar endpoint existente `GET /api/me/references?state=PENDING`. No se necesita nuevo endpoint.

**Rationale**: Ya existe y filtra por TaskLink type=REF, targetType=USER, userId=session.user.id. Solo necesitamos una página frontend y el link en el drawer.

## Decision 4: Íconos para secciones colapsables del drawer

**Decision**: Agregar ícono al header de grupo usando los mismos íconos que ya se importan:
- Proyectos → `FileText` (16px)
- Sectores → `Layers` (16px)
- Grupos → `Users` (16px)

**Rationale**: Ya están importados en DrawerNav.tsx y se usan para los sub-items. Ponerlos en el header del grupo unifica el estilo visual con los items fijos (Mis notas, Vista de tareas, Administración).

**Alternatives considered**:
- Usar íconos distintos (FolderOpen, etc.) → innecesario, los actuales son semánticamente correctos.

## Decision 5: Página "Mis referencias"

**Decision**: Crear `src/app/(main)/references/page.tsx` con listado de tareas pendientes que referencian al usuario, agrupadas por proyecto.

**Rationale**: Sigue el patrón existente de "Mis notas" (`/notes` → página dedicada). Usa el endpoint existente `/api/me/references`.
