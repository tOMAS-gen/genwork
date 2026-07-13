# Feature Specification: Gestión completa de archivos en la nube (estilo Nextcloud)

**Feature Branch**: `051-gestion-archivos-nube`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Mejorar sistema de archivos para verlo como un directorio estilo Nextcloud: crear carpetas, subir archivos, descargarlos, eliminarlos y compartirlos. Cada usuario accede con su propia membresía a Nextcloud — no se conecta todo a través de un único usuario Nextcloud global, sino por cada sección/sector."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear carpetas dentro del proyecto (Priority: P1)

Un usuario abre la pestaña "Archivos" de un proyecto y quiere organizar el contenido en subcarpetas (por ejemplo "Planos", "Fotos", "Presupuestos") sin salir de genwork ni depender del cliente de escritorio de Nextcloud.

**Why this priority**: Es la base para que el visor deje de ser de solo lectura y pase a ser un explorador real. Sin esto, el resto de las operaciones (subir a una subcarpeta organizada, compartir una carpeta puntual) pierden utilidad.

**Independent Test**: Desde la pestaña Archivos de un proyecto, crear una carpeta nueva con un nombre dado y verificar que aparece en el listado y también existe en Nextcloud.

**Acceptance Scenarios**:

1. **Given** el usuario está en la raíz de la carpeta de un proyecto, **When** crea una carpeta con un nombre válido, **Then** la carpeta aparece de inmediato en el listado de genwork y existe en Nextcloud.
2. **Given** el usuario está navegando una subcarpeta, **When** crea una carpeta nueva, **Then** la carpeta se crea dentro de esa subcarpeta (no en la raíz del proyecto).
3. **Given** el usuario intenta crear una carpeta con un nombre que ya existe en el nivel actual, **When** confirma la creación, **Then** el sistema muestra un error claro y no crea una carpeta duplicada.

---

### User Story 2 - Descargar y eliminar archivos o carpetas desde genwork (Priority: P1)

Un usuario con permiso sobre un proyecto quiere descargar un archivo a su computadora, o eliminar un archivo o carpeta que ya no sirve, sin tener que abrir la interfaz web de Nextcloud por separado.

**Why this priority**: Junto con crear carpetas y subir archivos (ya existente), completa el ciclo de vida básico de un archivo dentro de genwork. Es la funcionalidad más pedida explícitamente por el usuario.

**Independent Test**: Desde la pestaña Archivos, descargar un archivo existente y verificar que el contenido descargado coincide con el de Nextcloud; eliminar un archivo y verificar que desaparece de ambos lados.

**Acceptance Scenarios**:

1. **Given** un archivo listado en la pestaña Archivos, **When** el usuario pulsa "Descargar", **Then** el archivo se descarga a su computadora con su nombre y contenido originales.
2. **Given** un archivo o carpeta listado, **When** el usuario pulsa "Eliminar" y confirma, **Then** el elemento desaparece del listado de genwork y de Nextcloud.
3. **Given** una carpeta con contenido, **When** el usuario la elimina, **Then** se eliminan también todos los archivos y subcarpetas que contenía (eliminación recursiva, con confirmación previa explícita).
4. **Given** el usuario cancela el diálogo de confirmación de borrado, **When** cierra el diálogo, **Then** no se elimina nada.

---

### User Story 3 - Compartir un archivo o carpeta del proyecto (Priority: P2)

Un usuario quiere darle acceso a un archivo o carpeta puntual del proyecto a alguien (otro miembro de genwork, u otra persona fuera de la plataforma), sin tener que otorgarle acceso a todo el proyecto ni explicarle cómo usar Nextcloud directamente.

**Why this priority**: Cierra el conjunto de operaciones pedidas (crear, subir, descargar, eliminar, compartir), pero depende de que el resto del explorador ya esté andando — es la funcionalidad de mayor superficie de decisión (ver Clarifications).

**Independent Test**: Desde la pestaña Archivos, compartir un archivo y verificar que la persona destinataria puede acceder a ese archivo puntual con el nivel de acceso indicado.

**Acceptance Scenarios**:

1. **Given** un archivo o carpeta del proyecto, **When** el usuario elige "Compartir", **Then** el sistema genera un acceso al elemento y se lo muestra al usuario (link, o alta del destinatario, según el modo definido en Clarifications).
2. **Given** un elemento ya compartido, **When** el usuario revoca el acceso, **Then** el destinatario deja de poder acceder al elemento.

---

### User Story 4 - Acceso a la nube por membresía real, no por una única cuenta global (Priority: P1)

Hoy todas las operaciones de archivos (listar, subir, crear carpeta, etc.) se ejecutan siempre con la cuenta administradora única (de Nextcloud, o el token OAuth único del admin en Google Drive), sin importar qué usuario de genwork las pidió. El sistema debe operar respetando la membresía real de cada usuario — cada usuario toca la nube con su propia cuenta, no "a través de" otro (ej. la cuenta admin) —, de forma que el acceso a archivos de un proyecto quede acotado a quienes genwork ya autoriza a ver ese proyecto (por grupo o por sección a la que pertenece el proyecto), y no exista una vía que use siempre las credenciales globales para pasar por alto esas reglas de acceso. Esto aplica tanto si el proveedor activo es Nextcloud como si es Google Drive (ver FR-011).

**Why this priority**: Es un requisito de seguridad/alcance transversal: condiciona el diseño técnico de todas las demás historias. Sin esto, cualquier operación de archivos expuesta en la UI hereda el problema de fondo (acceso demasiado amplio).

**Independent Test**: Con dos usuarios de secciones distintas sin acceso cruzado entre sí, verificar que ninguno puede listar, descargar ni operar sobre la carpeta de un proyecto de la sección del otro, aunque ambas carpetas vivan en la misma instancia Nextcloud.

**Acceptance Scenarios**:

1. **Given** un usuario sin acceso a un proyecto (ni por grupo ni por sección), **When** intenta acceder a la pestaña Archivos de ese proyecto (por ejemplo manipulando la URL), **Then** el sistema le deniega el acceso antes de consultar Nextcloud.
2. **Given** dos secciones distintas con proyectos propios, **When** se audita qué identidad ejecutó cada operación de archivo en Nextcloud, **Then** queda trazable a qué usuario de genwork corresponde (no aparece todo bajo una única cuenta administradora indistinguible).

---

### Edge Cases

- Nombre de carpeta o archivo con caracteres inválidos para el sistema de archivos: se rechaza con mensaje claro antes de intentar crearlo en Nextcloud.
- Subida o creación de carpeta mientras Nextcloud está caído: el sistema informa error claro (igual que hoy con la carga) sin romper el resto de genwork.
- Eliminación de un archivo que otro usuario está viendo en ese momento: la próxima carga del listado en esa sesión ya no lo muestra.
- Compartir un elemento y luego eliminarlo: el acceso compartido deja de servir (el destinatario ve error de "no encontrado").
- Descarga de un archivo muy grande: se sirve como stream, sin cargarlo completo en memoria del servidor.
- Usuario con acceso de solo lectura al proyecto (si existiera ese nivel) intenta crear, eliminar o compartir: el sistema lo bloquea y solo permite ver/descargar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La pestaña "Archivos" de un proyecto DEBE permitir crear una carpeta nueva dentro del nivel actual de navegación (raíz del proyecto o una subcarpeta), con validación de nombre y de no-duplicado en ese nivel.
- **FR-002**: La pestaña "Archivos" DEBE permitir descargar cualquier archivo listado directamente desde genwork, sin depender de abrir la interfaz web de Nextcloud.
- **FR-003**: La pestaña "Archivos" DEBE permitir eliminar un archivo o carpeta (con su contenido, de forma recursiva) previa confirmación explícita del usuario.
- **FR-004**: La pestaña "Archivos" DEBE permitir compartir un archivo o carpeta puntual, generando un acceso que se le puede comunicar al destinatario y que puede revocarse.
- **FR-005**: Toda operación de archivos (listar, crear carpeta, subir, descargar, eliminar, compartir) DEBE validarse contra los permisos de genwork sobre el proyecto (pertenencia a grupo/sección, o proyecto personal del usuario) antes de ejecutarse contra el proveedor de almacenamiento.
- **FR-006**: El sistema NO DEBE depender exclusivamente de una única cuenta administradora indistinguible para ejecutar operaciones de archivos interactivas de un usuario — las operaciones deben quedar atribuibles a la identidad real del usuario que las originó. Las operaciones de sistema no iniciadas por un usuario interactivo (ej. crear la carpeta de un proyecto nuevo) siguen usando la cuenta admin, como hoy.
- **FR-007**: Las operaciones de creación de carpetas, eliminación y descarga DEBEN respetar el mismo ámbito de carpeta que ya usa el sistema (Group Folder del grupo del proyecto, o carpeta personal del usuario) — no se exponen operaciones fuera de la carpeta del proyecto.
- **FR-008**: Si el proveedor de almacenamiento activo no soporta alguna de estas operaciones (crear carpeta, eliminar, compartir), el sistema DEBE informarlo claramente en la UI en vez de fallar en silencio.
- **FR-009**: Al eliminar un archivo o carpeta desde genwork, la operación DEBE reflejarse de inmediato en el listado (sin esperar a un refresco manual).
- **FR-010**: La funcionalidad de compartir DEBE soportar dos modos: (a) generar un link público de Nextcloud (con opción de contraseña/expiración) para destinatarios externos, y (b) dar de alta a otro usuario o sección de genwork con acceso puntual al elemento, sin otorgarle acceso al resto del proyecto.
- **FR-011**: El acceso por "membresía real" DEBE implementarse por impersonación en ambos proveedores soportados, con el mecanismo nativo de cada uno:
  - **Nextcloud**: cada usuario opera con sus propias credenciales/token de Nextcloud (provisionados por FR-033 de la spec 028), no con la cuenta administradora global. Nextcloud aplica sus propios permisos de esa cuenta además de la validación de FR-005.
  - **Google Drive**: cada usuario opera con su propio token OAuth de Google — el mismo que ya usa para iniciar sesión en genwork (spec 015) —, no con el refresh token único del admin. La carpeta del proyecto (dentro del Shared Drive del admin, spec 034) se comparte nativamente con la cuenta de Google de cada usuario/sección autorizado; las operaciones de ese usuario solo alcanzan las carpetas que tiene compartidas, igual que si las tocara desde su propio Google Drive.
- **FR-012**: Esta feature reemplaza el requisito previo "GenWork NO gestiona archivos" (spec 028, FR-012): a partir de acá, GenWork SÍ gestiona archivos (crear, subir, descargar, eliminar, compartir) además de mostrarlos.

### Key Entities

- **CloudFolder / CloudFile** (existentes, spec 028): se extiende su uso — ahora también son destino de operaciones de escritura (crear, borrar) y no solo de lectura.
- **FileShare**: acceso compartido a un CloudFile o CloudFolder puntual. Referencia al elemento compartido, quién lo compartió, con quién (o el link generado) y si sigue vigente o fue revocado.
- **StorageIdentity**: credencial/token propios de un usuario de genwork en el proveedor de almacenamiento activo — token de app de Nextcloud, o token OAuth de Google del propio usuario —, usados para ejecutar sus operaciones de archivos impersonando su propia cuenta en vez de la cuenta administradora global. Acotado a usuarios individuales (ver Assumptions); no hay identidad propia de "sección".

## Clarifications

### Session 2026-07-12

- Q: FR-010 — ¿Cómo debe funcionar "compartir" un archivo o carpeta? → A: Ambos modos: link público de Nextcloud (externos) y alta de otro usuario/sección de genwork con acceso puntual (internos).
- Q: FR-011 — ¿Cómo se implementa el acceso por "membresía real" en vez de una sola cuenta admin? → A: Impersonación real — cada usuario opera con sus propias credenciales/token de Nextcloud, ya provisionadas por FR-033 (spec 028), en vez de la cuenta administradora global.
- Q: ¿Aplica la impersonación también a Google Drive, o queda limitada a Nextcloud? → A: Aplica a ambos proveedores. En Google Drive, cada usuario opera con su propio token OAuth de Google (el mismo que usa para iniciar sesión en genwork) en vez del refresh token único del admin; el admin comparte nativamente la carpeta del proyecto con la cuenta de Google de cada usuario/sección autorizado, y las operaciones de ese usuario quedan acotadas a lo que tiene compartido.
- Q: (`/speckit-analyze`, hallazgo G1) `StorageIdentity` contemplaba una identidad propia por sección sin ningún flujo que la creara — ¿se acota o se especifica cómo se provisiona? → A: Se acota a usuarios individuales en esta versión. Los procesos de sistema (no interactivos) siguen usando la cuenta admin global; una identidad de sección queda fuera de alcance salvo necesidad concreta futura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede crear una carpeta, subir un archivo dentro de ella, descargarlo y eliminarlo, sin salir de genwork ni abrir Nextcloud, en menos de 30 segundos en total.
- **SC-002**: El 100% de los intentos de acceso a archivos de un proyecto por parte de un usuario sin permiso sobre ese proyecto son rechazados antes de llegar al proveedor de almacenamiento.
- **SC-003**: Un elemento compartido es accesible por el destinatario indicado y por nadie más hasta que se revoque.
- **SC-004**: Auditando el registro de operaciones de archivos de un período, se puede identificar a qué usuario de genwork corresponde cada operación (no aparecen indistinguibles bajo una única cuenta).

## Assumptions

- Se construye sobre la integración existente (spec 028 Nextcloud, spec 034 Google Drive como alternativa) — no se reemplaza el proveedor, se extiende la interfaz `StorageProvider` con las operaciones nuevas (crear carpeta, eliminar, compartir) para el/los proveedor(es) que las soporten.
- El alcance de navegación y operaciones sigue siendo la carpeta del proyecto (y sus subcarpetas) — no se exponen operaciones sobre la estructura raíz de grupos/usuarios/archivados, que sigue siendo gestionada automáticamente por el sistema.
- "Sección" en el pedido del usuario se interpreta como el concepto ya existente de sector/grupo de genwork (no una entidad nueva).
- Los niveles de permiso sobre archivos siguen el mismo criterio de acceso que ya tiene el proyecto en genwork (quien puede ver el proyecto, puede ver y operar sus archivos); no se introduce un nivel de permiso de archivos independiente salvo que la Clarification de "compartir" lo requiera.
- Si el proveedor activo es Google Drive, las operaciones nuevas se implementan también ahí en la medida en que la API de Drive las soporte (crear carpeta, borrar y compartir son nativas de Drive); si el proveedor activo no soporta alguna operación, aplica FR-008.
- El login de genwork con Google (spec 015) ya obtiene un token OAuth del usuario; se asume que ese token (o su refresh token) puede reutilizarse/ampliarse con permiso de Drive para cumplir FR-011, sin pedirle al usuario una autorización de Drive completamente aparte cada vez.
- **Fuera de alcance de esta versión**: una identidad de almacenamiento propia por sección (para procesos automáticos/no interactivos). Esos procesos — ej. crear la carpeta de un proyecto nuevo — siguen usando la cuenta admin global, igual que hoy; solo las operaciones que un usuario dispara interactivamente desde la pestaña Archivos requieren su `StorageIdentity` propia (FR-006/FR-011). Si en el futuro aparece una necesidad concreta de identidad por sección, se define en una iteración aparte.
