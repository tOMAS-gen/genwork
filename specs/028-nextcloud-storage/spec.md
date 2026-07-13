# Feature Specification: Nextcloud Storage Integration

**Feature Branch**: `028-nextcloud-storage`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Integrar una nube Nextcloud con Docker para almacenar archivos de proyectos. Cada proyecto tiene una carpeta. La estructura de carpetas refleja la organización de genwork: por grupos (carpetas compartidas), por usuario (espacio personal), archivados y favoritos. Los archivos que se ven en la pestaña 'Archivos' de un proyecto son los de su carpeta en Nextcloud. Los permisos de acceso a carpetas dependen del usuario y la configuración de genwork."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carpeta automática al crear proyecto (Priority: P1)

El usuario crea un proyecto en genwork. Automáticamente se crea una carpeta en la nube asociada a ese proyecto, dentro de la estructura de directorios correspondiente (grupo o espacio personal del usuario).

**Why this priority**: Sin carpeta no hay dónde guardar archivos. Es el fundamento de toda la integración.

**Independent Test**: Crear un proyecto en un grupo y verificar que existe una carpeta correspondiente en la nube. Crear un proyecto personal y verificar lo mismo.

**Acceptance Scenarios**:

1. **Given** un usuario crea un proyecto en un grupo, **When** el proyecto se guarda, **Then** se crea una carpeta en la nube dentro del directorio del grupo.
2. **Given** un usuario crea un proyecto personal (sin grupo), **When** el proyecto se guarda, **Then** se crea una carpeta en la nube dentro del directorio personal del usuario.
3. **Given** la nube no está disponible, **When** se intenta crear el proyecto, **Then** el proyecto se crea igual y la carpeta se creará cuando la nube vuelva a estar disponible.

---

### User Story 2 - Ver archivos del proyecto desde genwork (Priority: P1)

El usuario entra a la pestaña "Archivos" de un proyecto y ve el listado de archivos que están en la carpeta del proyecto en Nextcloud. GenWork es un visor: muestra los archivos y ofrece links directos a la interfaz web de Nextcloud. Toda la gestión de archivos (subir, borrar, renombrar) se hace desde Nextcloud directamente (cliente de escritorio o web).

**Why this priority**: Es la funcionalidad principal visible para el usuario — la pestaña Archivos es el punto de acceso visual a los archivos del proyecto desde genwork.

**Independent Test**: Agregar un archivo a la carpeta del proyecto desde Nextcloud y verificar que aparece en la pestaña Archivos de genwork con link funcional.

**Acceptance Scenarios**:

1. **Given** un proyecto con archivos en su carpeta, **When** el usuario abre la pestaña Archivos, **Then** ve la lista de archivos y carpetas con nombre, tamaño y fecha.
2. **Given** la pestaña Archivos abierta, **When** el usuario hace click en un archivo, **Then** se abre la interfaz web de Nextcloud mostrando ese archivo (donde puede descargarlo, editarlo, etc.).
3. **Given** un archivo agregado directamente desde Nextcloud (cliente de escritorio o web), **When** el usuario abre la pestaña Archivos en genwork, **Then** ese archivo aparece en la lista.
4. **Given** un usuario sin Nextcloud instalado en su computadora, **When** hace click en un archivo desde genwork, **Then** puede acceder al archivo vía la interfaz web de Nextcloud.

---

### User Story 3 - Estructura de directorios por grupos y usuarios (Priority: P2)

La nube organiza las carpetas siguiendo la estructura de genwork: carpetas de grupo son compartidas entre los miembros del grupo, carpetas personales son privadas del usuario. Al archivar un proyecto, su carpeta se mueve a una sección de archivados.

**Why this priority**: La organización de carpetas determina los permisos y la navegación. Sin esto, los archivos serían accesibles a todos.

**Independent Test**: Verificar que un miembro de un grupo puede ver archivos de proyectos del grupo pero no de proyectos de otro grupo.

**Acceptance Scenarios**:

1. **Given** un grupo con proyectos, **When** se mira la estructura de carpetas en la nube, **Then** hay una carpeta del grupo con subcarpetas por cada proyecto.
2. **Given** un usuario con proyectos personales, **When** se mira la estructura, **Then** hay una carpeta personal del usuario con subcarpetas por proyecto.
3. **Given** un proyecto se archiva, **When** se mira la estructura, **Then** la carpeta del proyecto se mueve al directorio de archivados del grupo o usuario.

---

### User Story 4 - Instancia Nextcloud con Docker (Priority: P2)

El sistema levanta una instancia de Nextcloud mediante contenedor Docker como parte del entorno de desarrollo y producción. Esta instancia es el backend de almacenamiento.

**Why this priority**: Es la infraestructura necesaria, pero una vez configurada no requiere interacción del usuario final.

**Independent Test**: Ejecutar el contenedor y verificar que Nextcloud responde, que se puede autenticar y que las operaciones de archivos funcionan.

**Acceptance Scenarios**:

1. **Given** el entorno Docker configurado, **When** se levanta el contenedor, **Then** Nextcloud responde y acepta autenticación.
2. **Given** la instancia corriendo, **When** genwork crea una carpeta via la conexión, **Then** la carpeta existe y se puede verificar desde la interfaz de Nextcloud.

---

### Edge Cases

- Nube caída: las operaciones de archivos muestran error claro sin romper el resto del proyecto.
- Nombre de proyecto con caracteres especiales: se sanitiza para crear la carpeta, conservando el número secuencial (ej. `003-Mueble García`).
- Proyecto renombrado: la carpeta se renombra en Nextcloud manteniendo el mismo número secuencial (ej. `003-Nombre Viejo` → `003-Nombre Nuevo`).
- Proyecto movido de grupo: la carpeta se mueve al nuevo grupo en la nube conservando su identificador.
- Proyecto eliminado: la carpeta se elimina de la nube.
- Dos proyectos con el mismo nombre en distintos grupos: no hay conflicto porque están en directorios diferentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al crear un proyecto, el sistema DEBE crear automáticamente una carpeta asociada en la nube.
- **FR-002**: La pestaña "Archivos" de un proyecto DEBE mostrar los contenidos de la carpeta del proyecto en Nextcloud (nombre, tamaño, fecha de modificación).
- **FR-003**: Al hacer click en un archivo en la pestaña Archivos, el sistema DEBE abrir la interfaz web de Nextcloud mostrando ese archivo.
- **FR-004**: La pestaña Archivos DEBE permitir navegar subcarpetas dentro de la carpeta del proyecto.
- **FR-005**: La estructura de directorios en Nextcloud DEBE reflejar la organización de genwork: directorio raíz → grupos/usuarios → proyectos, con carpetas nombradas como `NNN-Nombre Proyecto` (número secuencial + nombre).
- **FR-006**: Los archivos de proyectos de un grupo DEBEN ser accesibles para todos los miembros del grupo.
- **FR-007**: Los archivos de proyectos personales DEBEN ser accesibles solo para el usuario propietario.
- **FR-008**: Al archivar un proyecto, su carpeta DEBE moverse al directorio de archivados correspondiente.
- **FR-009**: Al eliminar un proyecto, su carpeta y contenidos en la nube DEBEN eliminarse.
- **FR-010**: La instancia de almacenamiento en la nube DEBE poder ejecutarse como contenedor Docker.
- **FR-011**: Si la nube no está disponible, las operaciones de proyecto (crear, editar, etc.) DEBEN seguir funcionando; solo las operaciones de archivos se verán afectadas.
- **FR-012**: GenWork NO gestiona archivos (subir, borrar, renombrar). Toda la gestión se hace desde Nextcloud (cliente de escritorio o interfaz web).
> **Actualización (spec 051)**: Este FR-012 fue reemplazado — GenWork ahora SÍ gestiona archivos (crear, subir, descargar, eliminar, compartir) además de mostrarlos. Ver `specs/051-gestion-archivos-nube/spec.md`.
- **FR-013**: Al crear un usuario en genwork, el sistema DEBE crear automáticamente la cuenta correspondiente en Nextcloud.
- **FR-014**: Al crear un grupo de trabajo en genwork, el sistema DEBE crear el grupo correspondiente en Nextcloud y asignar los miembros.
- **FR-015**: Al agregar o quitar un miembro de un grupo en genwork, el sistema DEBE reflejar el cambio en el grupo de Nextcloud.
- **FR-016**: El administrador de genwork DEBE ser el administrador de Nextcloud (misma cuenta).

### Key Entities

- **CloudFolder**: Carpeta en la nube asociada a un proyecto, grupo o usuario. Contiene archivos y subcarpetas.
- **CloudFile**: Archivo almacenado en la nube, perteneciente a una CloudFolder. Tiene nombre, tamaño, tipo y fecha de modificación.
- **StorageMapping**: Relación entre la entidad de genwork (proyecto, grupo, usuario) y su ruta en la nube. Cada proyecto recibe un número secuencial humano (ej. `001`) que, junto al nombre del proyecto, forma el nombre de carpeta (ej. `001-Proyecto Tina`). Este identificador es único, inmutable y visible tanto en Nextcloud como en genwork.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al crear un proyecto, su carpeta en la nube existe y está accesible en menos de 5 segundos.
- **SC-002**: La pestaña Archivos muestra los contenidos reales de Nextcloud — si se agrega un archivo desde el cliente de escritorio de Nextcloud, aparece en genwork sin intervención adicional.
- **SC-003**: Un miembro de un grupo puede ver archivos de proyectos del grupo pero no de proyectos personales de otros usuarios.
- **SC-004**: El link desde genwork a Nextcloud abre el archivo correcto en la interfaz web de Nextcloud.
- **SC-005**: Si la nube está caída, el usuario puede seguir trabajando en tareas y documentación del proyecto sin interrupciones.

## Clarifications

### Session 2026-07-06

- Q: ¿Cómo se identifican las carpetas de proyecto en Nextcloud: por ID interno, nombre, o híbrido? → A: Número secuencial humano + nombre del proyecto (ej. `001-Proyecto Tina`). Legible para el usuario porque Nextcloud se instala en cada computadora y los usuarios acceden a archivos directamente desde ahí, no solo desde genwork. El número secuencial evita colisiones cuando hay proyectos con nombres iguales. Este identificador se muestra también en genwork.
- Q: ¿Los usuarios pueden eliminar archivos desde genwork? → A: No. GenWork solo muestra el listado de archivos del proyecto y ofrece links directos a la interfaz web de Nextcloud. Toda gestión de archivos (subir, borrar, renombrar) se hace desde Nextcloud (cliente de escritorio o web). Si un usuario no tiene Nextcloud instalado, al hacer click en un archivo se abre la interfaz web de Nextcloud donde puede descargarlo.
- Q: ¿Cómo se migran los adjuntos existentes a Nextcloud? → A: No hay migración. No existe sistema de adjuntos previo en genwork. Todo el manejo de archivos arranca de cero con Nextcloud. GenWork automatiza la creación de carpetas y grupos en Nextcloud al crear proyectos y grupos de trabajo. El usuario administrador de genwork es el mismo administrador de Nextcloud.

## Assumptions

- Se usa Nextcloud como plataforma de almacenamiento en la nube, desplegada con Docker.
- La comunicación entre genwork y Nextcloud es server-to-server para operaciones automatizadas. Los usuarios también acceden a Nextcloud directamente desde sus computadoras (cliente de escritorio instalado) para trabajar con archivos en programas de edición externos.
- Los usuarios tienen cuenta en Nextcloud (necesaria para el cliente de escritorio) pero genwork gestiona la creación y permisos automáticamente.
- El usuario administrador de genwork es el mismo administrador de la instancia Nextcloud.
- Los grupos de trabajo en genwork se mapean directamente a grupos en Nextcloud (carpetas compartidas entre los miembros del grupo).
- La estructura de directorios en la nube se crea y mantiene automáticamente por genwork, no por el usuario.
- El almacenamiento es local (mismo servidor o red local) — no se contempla integración con servicios de nube externos.
- La pestaña "Archivos" en proyectos no existe actualmente. Se crea con esta integración como visor de la carpeta de Nextcloud con links directos.
- Nextcloud se instala también como cliente de escritorio en cada computadora de usuario, para editar archivos directamente con programas locales.
- Los favoritos NO crean carpetas especiales en la nube — son un filtro virtual en genwork usando el flag de favorito existente. La estructura de directorios solo tiene: grupos, usuarios y archivados.
- No hay sistema de adjuntos previo en genwork. Todo el manejo de archivos empieza de cero con Nextcloud.
