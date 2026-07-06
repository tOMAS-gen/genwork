# Feature Specification: Archivado Simple

**Feature Branch**: `027-archivado-simple`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Separar archivado de exportación. Archivar = cambiar estado a archivado, el proyecto deja de verse en vistas activas y drawer, solo visible en sección Archivados. Exportar es otra feature aparte (exportar datos a archivos para importar después)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Archivar proyecto sin exportar (Priority: P1)

El usuario quiere archivar un proyecto que ya terminó. Desde el menú del proyecto, selecciona "Archivar" y el proyecto cambia inmediatamente a estado archivado sin necesidad de generar un paquete ZIP, descargarlo ni confirmar descarga.

**Why this priority**: Es el problema principal — actualmente archivar obliga a exportar, lo cual no debería ser requisito.

**Independent Test**: Ir al menú ⋮ de un proyecto activo, seleccionar "Archivar", confirmar, y verificar que el proyecto desaparece de la vista activa y aparece en "Archivados".

**Acceptance Scenarios**:

1. **Given** un proyecto activo, **When** el usuario selecciona "Archivar" en el menú ⋮, **Then** se muestra un diálogo de confirmación simple (sin exportación).
2. **Given** el diálogo de confirmación, **When** el usuario confirma, **Then** el proyecto cambia a estado ARCHIVED inmediatamente.
3. **Given** un proyecto recién archivado, **When** el usuario navega al listado principal, **Then** el proyecto no aparece en la lista de proyectos activos ni en el drawer.
4. **Given** un proyecto archivado, **When** el usuario navega a la sección "Archivados", **Then** el proyecto aparece en esa lista.

---

### User Story 2 - Desarchivar proyecto (Priority: P2)

El usuario necesita reactivar un proyecto archivado. Desde la vista de "Archivados", accede al proyecto y puede desarchivarlo, devolviéndolo al estado activo.

**Why this priority**: Complemento natural del archivado — si se archiva algo por error, debe poder revertirse.

**Independent Test**: Navegar a Archivados, entrar a un proyecto archivado, seleccionar "Desarchivar" y verificar que vuelve a aparecer en la lista activa.

**Acceptance Scenarios**:

1. **Given** un proyecto archivado, **When** el usuario accede a su detalle desde "Archivados", **Then** ve el menú con opción "Desarchivar".
2. **Given** el usuario selecciona "Desarchivar", **When** confirma, **Then** el proyecto vuelve a estado ACTIVE y aparece en las vistas normales.

---

### User Story 3 - Eliminar proyecto archivado (Priority: P3)

El usuario quiere eliminar definitivamente un proyecto archivado. Solo se pueden eliminar proyectos archivados, no activos.

**Why this priority**: Funcionalidad de limpieza necesaria pero menos frecuente.

**Independent Test**: Desde Archivados, abrir un proyecto y seleccionar "Eliminar definitivamente", confirmar con el nombre, verificar que desaparece.

**Acceptance Scenarios**:

1. **Given** un proyecto archivado, **When** el usuario selecciona "Eliminar definitivamente", **Then** se pide confirmación escribiendo el nombre del proyecto.
2. **Given** el usuario confirma con el nombre correcto, **When** se envía, **Then** el proyecto y sus datos se eliminan permanentemente.

---

### Edge Cases

- Proyecto con tareas pendientes: se archiva igual, las tareas quedan con su estado actual.
- Proyecto ya archivado: la opción "Archivar" no aparece.
- Proyecto archivado sin ArchiveRecord: debe funcionar correctamente (el ArchiveRecord es opcional, pertenece a la feature de exportación).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El menú del proyecto DEBE mostrar "Archivar" para proyectos activos, con un diálogo de confirmación simple (sin exportación ni generación de paquete).
- **FR-002**: Al archivar, el sistema DEBE cambiar el campo `status` del proyecto a `ARCHIVED` inmediatamente, sin crear ni requerir un `ArchiveRecord`.
- **FR-003**: Los proyectos archivados NO deben aparecer en el listado principal de proyectos ni en el drawer de navegación.
- **FR-004**: Los proyectos archivados DEBEN ser accesibles exclusivamente desde la sección "Archivados".
- **FR-005**: El menú de un proyecto archivado DEBE mostrar las opciones "Desarchivar" y "Eliminar definitivamente".
- **FR-006**: "Desarchivar" DEBE cambiar el status de vuelta a `ACTIVE`.
- **FR-007**: "Eliminar definitivamente" DEBE requerir confirmación escribiendo el nombre del proyecto y borrar el proyecto y sus datos asociados.
- **FR-008**: La funcionalidad de exportación (generar ZIP, descargar paquete) NO debe ser parte del flujo de archivado. Es una feature separada que se especificará aparte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede archivar un proyecto en menos de 3 clicks (menú → Archivar → confirmar).
- **SC-002**: No aparece ninguna mención a exportación, paquete o descarga durante el flujo de archivado.
- **SC-003**: Un proyecto archivado desaparece inmediatamente de todas las vistas activas tras archivar.
- **SC-004**: Un proyecto archivado puede ser desarchivado y vuelve a las vistas activas.

## Assumptions

- El campo `status` del modelo Work (`ACTIVE` | `ARCHIVED`) ya existe y se reutiliza.
- La tabla `ArchiveRecord` y sus endpoints/lógica de exportación se mantienen pero se desvinculan del flujo de archivado (se usarán en la feature de exportación futura).
- El filtrado `?status=ARCHIVED` en la API de works ya funciona correctamente.
- El drawer ya tiene el link "Archivados" que filtra por status.
