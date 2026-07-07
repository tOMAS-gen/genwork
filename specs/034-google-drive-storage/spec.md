# Feature Specification: Google Drive como almacenamiento opcional + subida de archivos

**Feature Branch**: `034-google-drive-storage`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Implementar Google Drive como proveedor de almacenamiento OPCIONAL, análogo a la integración Nextcloud existente. El administrador configura las credenciales de la API de Google. Como el inicio de sesión ya es con Google, los usuarios autorizados acceden a los archivos que administra la plataforma vía Google Drive. Misma función que Nextcloud (subir/listar/descargar/archivar) pero con Google Drive como opción alternativa. Además, agregar la SUBIDA de archivos que faltaba."

## Clarifications

### Session 2026-07-06

- Q: ¿Cómo da el administrador el acceso a Google Drive? → A: **Autorización OAuth del administrador**. El admin autoriza una vez con su cuenta de Google (pantalla de consentimiento con permiso de Drive) y la plataforma guarda su **refresh token** cifrado para operar en su nombre. No se piden permisos de Drive a cada usuario.
- Q: ¿Dónde viven los archivos que administra la plataforma? → A: Un **Shared Drive dedicado** (unidad compartida exclusiva de la plataforma). La plataforma crea una carpeta por proyecto dentro de ese Shared Drive.
- Q: Nombres de archivo duplicados y límite de tamaño → A: **Versionar** (un archivo con nombre ya existente se guarda como copia/versión, no pisa al anterior) y **sin límite de tamaño explícito** (más allá del que imponga el proveedor).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El administrador elige Google Drive como almacenamiento (Priority: P1)

Un administrador del sistema quiere usar Google Drive (en lugar de, u opcionalmente además de, Nextcloud) como el lugar donde la plataforma guarda los archivos de los proyectos. Desde el panel de administración de almacenamiento, elige "Google Drive" como proveedor, ingresa las credenciales de la API de Google que obtuvo, y prueba la conexión. Si la prueba es exitosa, la plataforma pasa a guardar y leer los archivos de los proyectos en Google Drive.

**Why this priority**: Sin la configuración del proveedor no hay integración. Es la puerta de entrada de la feature y habilita todo lo demás.

**Independent Test**: En el panel de almacenamiento, elegir Google Drive, cargar credenciales válidas y pulsar "Probar conexión"; verificar que reporta éxito y queda como proveedor activo.

**Acceptance Scenarios**:

1. **Given** un administrador en el panel de almacenamiento, **When** elige "Google Drive" e ingresa credenciales válidas y prueba la conexión, **Then** el sistema confirma la conexión y guarda Google Drive como proveedor activo.
2. **Given** credenciales inválidas o incompletas, **When** el administrador prueba la conexión, **Then** el sistema muestra un error claro y no activa el proveedor.
3. **Given** Google Drive configurado como proveedor activo, **When** se crea un proyecto nuevo, **Then** su carpeta de archivos se crea en Google Drive.
4. **Given** la posibilidad de elegir proveedor, **When** el administrador no configura ningún almacenamiento, **Then** la plataforma sigue funcionando sin archivos (el almacenamiento es opcional, como hoy).

---

### User Story 2 - Subir archivos a un proyecto desde la plataforma (Priority: P1)

Un usuario autorizado, dentro de un proyecto, quiere subir uno o más archivos (por ejemplo un presupuesto, una foto o un plano) sin salir de la plataforma. Elige el/los archivos (o los arrastra) y quedan guardados en la carpeta del proyecto en el almacenamiento activo (Google Drive o Nextcloud), visibles en el visor de archivos del proyecto.

**Why this priority**: Es la función que faltaba y que el usuario pidió explícitamente. Sin subir archivos, el visor de archivos es solo de lectura y el almacenamiento no se aprovecha.

**Independent Test**: En un proyecto con almacenamiento configurado, subir un archivo desde la interfaz y verificar que aparece en el visor de archivos y se puede descargar.

**Acceptance Scenarios**:

1. **Given** un proyecto con almacenamiento configurado, **When** el usuario sube un archivo desde la interfaz del proyecto, **Then** el archivo queda guardado en la carpeta del proyecto y aparece en el visor de archivos.
2. **Given** una subida en curso, **When** el archivo se está subiendo, **Then** el usuario ve un indicador de progreso/estado y una confirmación (o error) al terminar.
3. **Given** un usuario sin permiso para operar el proyecto, **When** intenta subir un archivo, **Then** el sistema lo rechaza.
4. **Given** un almacenamiento no configurado o no disponible, **When** el usuario intenta subir, **Then** el sistema muestra un mensaje claro de que el almacenamiento no está disponible, sin romper la vista.

---

### User Story 3 - Ver y descargar los archivos del proyecto (paridad con Nextcloud) (Priority: P2)

Un usuario autorizado abre un proyecto y ve la lista de archivos guardados en Google Drive para ese proyecto, puede navegar carpetas y descargar cualquier archivo, igual que hoy funciona con Nextcloud.

**Why this priority**: Da valor completo al almacenamiento en Drive: si se sube pero no se puede ver/descargar, la integración queda a medias. Secundaria a poder configurar (US1) y subir (US2).

**Independent Test**: Con Google Drive activo y archivos en la carpeta de un proyecto, abrir el visor y verificar que se listan, se navegan las carpetas y se descargan.

**Acceptance Scenarios**:

1. **Given** Google Drive activo con archivos en la carpeta de un proyecto, **When** el usuario abre el visor de archivos, **Then** ve los archivos y carpetas de ese proyecto.
2. **Given** el visor con archivos, **When** el usuario elige descargar un archivo, **Then** el archivo se descarga correctamente.
3. **Given** una carpeta con subcarpetas, **When** el usuario navega, **Then** puede entrar y salir de subcarpetas.

---

### User Story 4 - Archivar/mover y eliminar con Google Drive (paridad) (Priority: P3)

Las operaciones existentes de archivado de proyectos (mover la carpeta a archivados, y la eliminación de la carpeta al borrar un proyecto) funcionan igual con Google Drive que con Nextcloud.

**Why this priority**: Completa la paridad funcional. Es importante para no romper el ciclo de vida del proyecto, pero secundario frente a configurar/subir/ver.

**Independent Test**: Con Google Drive activo, archivar un proyecto y verificar que su carpeta se mueve/marca correctamente; eliminar un proyecto y verificar que su carpeta se elimina.

**Acceptance Scenarios**:

1. **Given** Google Drive activo, **When** se archiva un proyecto, **Then** su carpeta se archiva/mueve sin perder los archivos.
2. **Given** Google Drive activo, **When** se elimina un proyecto definitivamente, **Then** su carpeta y archivos se eliminan del Drive.

---

### Edge Cases

- **Credenciales revocadas/expiradas**: si las credenciales de Google dejan de funcionar, las operaciones de archivo fallan con un mensaje claro y el panel de almacenamiento permite recargar/reconfigurar credenciales; no se pierde la configuración del resto del sistema.
- **Archivo grande**: no hay un límite de tamaño explícito en la plataforma; si el proveedor rechaza por tamaño/cuota, la subida falla con un mensaje claro.
- **Almacenamiento no configurado**: subir/ver archivos muestra un estado informativo (no un error críptico), como ya ocurre hoy con Nextcloud opcional.
- **Cambio de proveedor con archivos existentes**: cambiar de Nextcloud a Google Drive (o viceversa) no migra automáticamente los archivos ya existentes; los proyectos nuevos usan el proveedor activo.
- **Carpeta del proyecto aún no creada**: si la carpeta del proyecto todavía se está creando en Drive, subir muestra "reintentá en unos segundos" (igual que hoy con Nextcloud).
- **Nombre de archivo duplicado**: subir un archivo con un nombre ya existente lo guarda como una copia/versión adicional; no reemplaza al archivo anterior.
- **Refresh token revocado/expirado**: si el administrador revoca el permiso o el token deja de ser válido, las operaciones de Drive fallan con un mensaje claro y el panel permite volver a autorizar sin perder el resto de la configuración.

## Requirements *(mandatory)*

### Functional Requirements

**Proveedor Google Drive (US1)**

- **FR-001**: El sistema DEBE ofrecer Google Drive como proveedor de almacenamiento seleccionable, alternativo y opcional respecto de Nextcloud.
- **FR-002**: El administrador DEBE poder autorizar el acceso a Google Drive mediante el flujo de consentimiento OAuth de Google (con permiso de Drive) desde el panel de administración de almacenamiento, y la plataforma DEBE conservar el refresh token resultante para operar en su nombre.
- **FR-003**: El refresh token y los datos sensibles de Google DEBEN guardarse cifrados, como el resto de credenciales de almacenamiento.
- **FR-004**: El administrador DEBE poder probar la conexión con Google Drive y recibir un resultado claro (éxito/detalle del error) antes de activarlo.
- **FR-005**: Con Google Drive activo, el sistema DEBE crear la carpeta de archivos de cada proyecto dentro del **Shared Drive dedicado** configurado y usarla como destino de las operaciones de archivo.
- **FR-005b**: El administrador DEBE poder indicar/seleccionar el Shared Drive dedicado que la plataforma usará (por su identificador o eligiéndolo tras autorizar).
- **FR-006**: El almacenamiento DEBE seguir siendo opcional: sin proveedor configurado, la plataforma funciona y las funciones de archivo se muestran como no disponibles sin romperse.

**Subida de archivos (US2) — aplica al proveedor activo (Drive o Nextcloud)**

- **FR-007**: Un usuario con permiso para operar un proyecto DEBE poder subir uno o más archivos a la carpeta del proyecto desde la interfaz de la plataforma.
- **FR-008**: Durante la subida el sistema DEBE mostrar estado/progreso y una confirmación o error al finalizar.
- **FR-009**: El sistema DEBE rechazar la subida si el usuario no tiene permiso para operar el proyecto, o si el almacenamiento no está disponible, con un mensaje claro.
- **FR-010**: Los archivos subidos DEBEN aparecer en el visor de archivos del proyecto y poder descargarse.

**Paridad de operaciones (US3, US4)**

- **FR-011**: Con Google Drive activo, el usuario DEBE poder listar, navegar carpetas y descargar los archivos de un proyecto, igual que con Nextcloud.
- **FR-012**: Las operaciones de archivado (mover la carpeta del proyecto) y eliminación definitiva DEBEN funcionar con Google Drive de forma equivalente a Nextcloud.
- **FR-013**: El resto de la plataforma (proyectos, tareas, permisos) NO DEBE cambiar su comportamiento por el proveedor de almacenamiento elegido.

### Key Entities *(include if feature involves data)*

- **Configuración de almacenamiento**: registro único que define el proveedor activo (Nextcloud o Google Drive) y sus credenciales cifradas.
- **Credenciales de Google**: datos que el administrador provee para que la plataforma opere sobre Google Drive en nombre de la organización; se guardan cifradas.
- **Carpeta de proyecto**: carpeta en el almacenamiento activo donde viven los archivos de un proyecto; referenciada desde el proyecto.
- **Archivo de proyecto**: archivo subido por un usuario, guardado en la carpeta del proyecto en el proveedor activo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede configurar Google Drive (credenciales + prueba de conexión exitosa) en menos de 5 minutos, sin ayuda técnica más allá de la documentación.
- **SC-002**: Con Google Drive activo, el 100% de las operaciones de archivo de un proyecto (crear carpeta, subir, listar, descargar, archivar, eliminar) funcionan de forma equivalente a Nextcloud.
- **SC-003**: Un usuario puede subir un archivo a un proyecto y verlo en el visor en menos de 30 segundos para archivos de tamaño típico (unos pocos MB).
- **SC-004**: Cambiar el proveedor de almacenamiento no afecta el funcionamiento del resto de la plataforma (0 regresiones en proyectos/tareas/permisos).
- **SC-005**: Si el almacenamiento no está configurado o falla, el usuario recibe un mensaje claro en el 100% de los casos, sin pantallas rotas.

## Assumptions

- Google Drive es una **alternativa opcional** a Nextcloud; no reemplaza ni migra automáticamente lo existente. El proveedor activo lo elige el administrador.
- La plataforma opera sobre Google Drive con la **autorización OAuth centralizada del administrador** (refresh token cifrado), no con el Drive personal de cada usuario. Los archivos que administra la plataforma viven en un **Shared Drive dedicado** de la organización.
- El inicio de sesión de los usuarios sigue siendo con Google para **identidad**; el acceso a los archivos lo intermedia la plataforma con la autorización del administrador (no se piden permisos de Drive a cada usuario).
- La subida de archivos aplica al **proveedor de almacenamiento activo** (Google Drive o Nextcloud), no es exclusiva de Drive.
- Se reutiliza la arquitectura de almacenamiento conectable existente (interfaz de proveedor, panel de almacenamiento, cifrado de credenciales, cola de operaciones).
- No hay un límite de tamaño de archivo explícito impuesto por la plataforma; rige el del proveedor.
- Los Shared Drives requieren una cuenta de Google Workspace del administrador (no aplica a cuentas personales gratuitas).
