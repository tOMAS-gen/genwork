# Feature Specification: Carpetas de proyectos (cliente, organización o tipo de trabajo)

**Feature Branch**: `gestion-carpetas-nube-genstock`

**Created**: 2026-09-29

**Status**: Implemented

**Input**: User description: "necesitaba un ordenamiento de los proyectos también por clientes o algo parecido, no en sí el nombre del cliente sino para guardar o almacenar todos los proyectos que pertenecen a la misma persona u organización o tipo de trabajo, para no crear grupos de más".

## Clarifications

### Session 2026-09-29

- Q: ¿Cómo se llama la agrupación? → A: **Carpeta**. "Cliente" ya lo usa el portal de clientes externos (feature 059) y confundiría; "Carpeta" sirve para persona, organización o tipo de trabajo y coincide con la subcarpeta real de la nube.
- Q: ¿En cuántas carpetas puede estar un proyecto? → A: **En una o en ninguna**.
- Q: ¿Cómo se ve en el dashboard? → A: **Filtro** ("Todas", "Sin carpeta" o una carpeta). La lista sigue igual que antes.
- Q: ¿Impacta la nube? → A: **Sí**. Un proyecto en carpeta vive en `/GENWORK_<EMPRESA>/<ÁMBITO>/<CARPETA>/<PROYECTO_007>`. Sin carpeta, igual que hoy.

## Reglas

- Una carpeta pertenece a un ámbito (Grupo o Personal), igual que las etapas. Un proyecto solo puede ir en una carpeta de su mismo ámbito (400 si no).
- Nombre único por ámbito, comparado como nombre de carpeta en la nube ("Acme" y "ACME" chocan → 409).
- Crear, renombrar y borrar requiere operar el ámbito (miembro del grupo o dueño del personal). Un READER o CLIENT no puede.
- Las plantillas no van en carpetas.
- Borrar una carpeta **nunca** borra proyectos: quedan sin carpeta y en la nube vuelven a colgar directo del ámbito.
- Renombrar una carpeta mueve en la nube las carpetas de sus proyectos. La carpeta de origen se borra si quedó vacía.
- Archivar replica la carpeta: `_archivados/<ÁMBITO>/<CARPETA>/<PROYECTO>`. Se comparte `_archivados/<ÁMBITO>`.
- La subcarpeta solo existe con raíz por empresa (`GENWORK_ORG`). Las instalaciones con el formato viejo no cambian.

## Superficies

- **Web**:
  - Filtro "Carpeta" y "Gestionar carpetas" en el dashboard.
  - "Mover a carpeta…" en el menú ⋮ de la card, de la fila y del detalle.
  - Chip de carpeta en el detalle.
  - Campo "Carpeta (opcional)" al crear un proyecto.
- **API**:
  - `GET/POST /api/project-folders` y `PATCH/DELETE /api/project-folders/{id}`.
  - `projectFolderId` en `POST /api/works` y `PATCH /api/works/{id}`.
  - `projectFolderName` en `GET /api/works`.
- **MCP**:
  - `projectFolder.list/create/rename/delete`.
  - `projectFolderId` en `work.list`, `work.create` y `work.update`.
