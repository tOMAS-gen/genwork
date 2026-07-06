# Feature Specification: Sector Personal, Notas y Google Auth

**Feature Branch**: `015-personal-notes-google-auth`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Sector personal único por usuario con notas rich-text estilo Notion. Administración con estilo visual consistente. Autenticación Google OAuth con avatar y nombre en sidebar."

## User Scenarios & Testing

### User Story 1 — Sector personal con notas (Priority: P1) 🎯 MVP

Cada usuario tiene un sector personal único que se crea automáticamente. En este sector puede crear notas con formato enriquecido (encabezados, negritas, cursivas, listas, links) para guardar apuntes, recordatorios y cualquier contenido libre. El sector personal aparece destacado en el sidebar como primer elemento, antes de PROYECTOS.

**Why this priority**: Es la funcionalidad central solicitada — un espacio propio para cada usuario que hoy no existe. Sin esto, los usuarios solo pueden crear tareas en sectores compartidos.

**Independent Test**: Iniciar sesión → ver "Mi espacio" en el sidebar → crear una nota con texto formateado → cerrar y volver a abrir → la nota persiste con su formato.

**Acceptance Scenarios**:

1. **Given** un usuario que inicia sesión por primera vez, **When** accede al sistema, **Then** su sector personal ya existe y aparece en el sidebar como primer elemento
2. **Given** un usuario en su sector personal, **When** hace clic en "Nueva nota", **Then** se abre un editor de texto enriquecido donde puede escribir con formato (encabezados, negritas, listas)
3. **Given** un usuario con notas existentes, **When** accede a su sector personal, **Then** ve la lista de sus notas ordenadas por última modificación
4. **Given** un usuario editando una nota, **When** modifica el contenido y navega fuera, **Then** el contenido se guarda automáticamente
5. **Given** un usuario con una nota, **When** decide eliminarla, **Then** puede hacerlo con confirmación y la nota desaparece de la lista

---

### User Story 2 — Administración con estilo visual consistente (Priority: P2)

La página de administración (/admin) actualmente tiene un estilo visual diferente al resto del sitio. Debe usar el mismo sistema de diseño: tarjetas con el estilo de proyecto, filtros, tipografía y espaciado consistentes con las demás vistas.

**Why this priority**: Coherencia visual. El admin se siente como otra app; unificarlo mejora la experiencia del administrador.

**Independent Test**: Navegar a /admin → la página usa el mismo estilo de tarjetas, tipografía y layout que /sectors y / (home de proyectos).

**Acceptance Scenarios**:

1. **Given** un administrador, **When** accede a /admin, **Then** ve las secciones de administración con el mismo estilo visual que el resto del sitio (tarjetas, espaciado, tipografía)
2. **Given** un administrador en mobile, **When** accede a /admin, **Then** el layout es responsive y usa una columna sin overflow horizontal
3. **Given** el tema oscuro activado, **When** se visualiza /admin, **Then** todos los elementos respetan las variables de dark mode

---

### User Story 3 — Autenticación con Google OAuth (Priority: P3)

El login se realiza mediante cuenta de Google. Al autenticarse, el sistema obtiene el nombre y la foto de perfil del usuario. En el sidebar, antes de la sección PROYECTOS, aparece un avatar circular con la foto de Google y el nombre del usuario.

**Why this priority**: Mejora la identidad del usuario en el sistema y elimina la necesidad de gestionar contraseñas propias. Depende de credenciales externas (Google Cloud Console) que el usuario proveerá.

**Independent Test**: Hacer clic en "Iniciar sesión con Google" → autenticarse con cuenta Google → ver avatar y nombre en el sidebar → cerrar sesión y volver a entrar → la sesión persiste.

**Acceptance Scenarios**:

1. **Given** un usuario no autenticado, **When** accede al sistema, **Then** ve una pantalla de login con botón "Iniciar sesión con Google"
2. **Given** un usuario que hace clic en el botón de Google, **When** completa el flujo de autenticación, **Then** se redirige al sistema autenticado con su sesión activa
3. **Given** un usuario autenticado con Google, **When** ve el sidebar, **Then** aparece un avatar circular con su foto de Google y su nombre debajo, antes de la sección PROYECTOS
4. **Given** un usuario autenticado, **When** cierra sesión y vuelve a entrar con Google, **Then** su sector personal y notas siguen disponibles
5. **Given** un usuario sin foto de Google, **When** ve el sidebar, **Then** aparece un avatar con sus iniciales sobre un fondo de color

---

### Edge Cases

- ¿Qué pasa si un usuario borra su sector personal? No puede — el sector personal no es eliminable
- ¿Qué pasa si Google no devuelve foto de perfil? Se muestra avatar con iniciales del nombre
- ¿Qué pasa si la sesión de Google expira? Se redirige al login con mensaje claro
- ¿Qué pasa si el usuario intenta crear más de un sector personal? No puede — el sistema lo crea automáticamente y es único
- ¿Qué pasa si un usuario accede a la nota de otro usuario? No puede — las notas son privadas por diseño, vinculadas al sector personal de cada usuario

## Requirements

### Functional Requirements

**Sector Personal**:

- **FR-001**: El sistema DEBE crear automáticamente un sector personal para cada usuario la primera vez que inicia sesión
- **FR-002**: El sector personal DEBE aparecer en el sidebar como primer elemento, antes de la sección PROYECTOS, con un ícono diferenciado
- **FR-003**: El sector personal NO DEBE ser eliminable ni renombrable por el usuario
- **FR-004**: El sector personal es privado — solo visible para su dueño

**Notas**:

- **FR-005**: El usuario DEBE poder crear notas dentro de su sector personal
- **FR-006**: Las notas DEBEN soportar formato de texto enriquecido: encabezados (H1, H2, H3), negrita, cursiva, listas con viñetas, listas numeradas y links
- **FR-007**: Las notas DEBEN guardarse automáticamente mientras el usuario escribe (autoguardado)
- **FR-008**: El usuario DEBE poder ver la lista de sus notas ordenadas por fecha de última modificación (más reciente primero)
- **FR-009**: El usuario DEBE poder eliminar una nota con confirmación previa
- **FR-010**: Cada nota DEBE tener un título (primera línea o campo separado) para identificarla en la lista

**Administración Visual**:

- **FR-011**: La página /admin DEBE usar el mismo sistema de diseño visual que el resto del sitio (tarjetas, tipografía, espaciado, colores)
- **FR-012**: La página /admin DEBE ser responsive en mobile sin overflow horizontal
- **FR-013**: La página /admin DEBE respetar el tema claro/oscuro del sistema

**Google Auth**:

- **FR-014**: El sistema DEBE autenticar usuarios mediante Google OAuth
- **FR-015**: Al autenticarse, el sistema DEBE obtener y almacenar el nombre y la URL de la foto de perfil del usuario
- **FR-016**: En el sidebar, antes de PROYECTOS, DEBE aparecer un avatar circular (foto de Google o iniciales) y el nombre del usuario
- **FR-017**: El sistema DEBE mantener la sesión activa mientras el token de Google sea válido
- **FR-018**: El usuario DEBE poder cerrar sesión desde el sidebar

### Key Entities

- **Sector Personal**: Sector único por usuario, creado automáticamente, no eliminable. Contiene notas. Es un tipo especial de sector con flag `isPersonal`.
- **Nota**: Contenido de texto enriquecido que pertenece al sector personal de un usuario. Tiene título, cuerpo con formato, y timestamps de creación/modificación.
- **Perfil de Usuario**: Extensión del usuario actual con campos de Google: nombre completo, URL de foto de perfil, email de Google.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Los usuarios pueden crear y editar notas con formato en menos de 10 segundos desde que abren su sector personal
- **SC-002**: El autoguardado persiste el contenido en menos de 2 segundos después de dejar de escribir
- **SC-003**: El 100% de las páginas del sistema (incluyendo /admin) usan el mismo sistema de diseño visual
- **SC-004**: El flujo de login con Google se completa en menos de 3 clics (botón → auth Google → sistema)
- **SC-005**: Las notas persisten correctamente entre sesiones sin pérdida de formato

## Scope

### In Scope

- Sector personal con notas rich-text
- Editor de texto con formato básico (encabezados, negrita, cursiva, listas, links)
- Autoguardado de notas
- Rediseño visual de /admin
- Login con Google OAuth
- Avatar y nombre en sidebar
- Responsive mobile y dark mode para todo lo nuevo

### Out of Scope

- Espacios de trabajo / workspaces (descartado explícitamente)
- Notas compartidas entre usuarios
- Notas fuera del sector personal (en proyectos o sectores regulares)
- Editor de bloques completo tipo Notion (tablas, bases de datos, embeds, etc.)
- Colaboración en tiempo real en notas
- Búsqueda full-text dentro de notas
- Exportar/importar notas

## Assumptions

- El editor de texto enriquecido usa formato básico (no un sistema de bloques completo como Notion). Soporta: encabezados, negrita, cursiva, listas y links.
- Google OAuth requiere credenciales de Google Cloud Console que el usuario proveerá al momento de la implementación. Mientras tanto, el modo DEV_AUTH existente sigue funcionando para desarrollo.
- El sector personal funciona como un sector regular internamente (misma tabla) con un flag `isPersonal` y el userId del dueño.
- Las notas son una entidad nueva independiente de las tareas — no usan el sistema de etiquetado inline (/, #, @).
- La sesión de usuario se gestiona con cookies/JWT compatible con el flujo OAuth de Google.
