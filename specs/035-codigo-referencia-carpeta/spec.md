# Feature Specification: Código de referencia legible de la carpeta del proyecto

**Feature Branch**: `035-codigo-referencia-carpeta`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "La plataforma administra todas las carpetas. Cuando crea la carpeta de un proyecto, hoy la identifica con un identificador interno (opaco). Debería mostrar en el proyecto un código de referencia legible por humanos para que se entienda cuál es la carpeta, y para poder ubicar esa carpeta también en el Drive/Nextcloud."

## Clarifications

### Session 2026-07-06

- Q: ¿Qué formato tiene el código de referencia? → A: **`NOMBRE_DEL_GRUPO-NÚMERO-NOMBRE_DEL_PROYECTO`**, todo en MAYÚSCULAS. Las tres partes se unen con **guiones** (`-`); dentro del nombre del grupo y del proyecto, los **espacios se reemplazan por guión bajo** (`_`). Se usa el **nombre completo del grupo** (no una abreviatura). Ejemplo: grupo "Farmacia Central", número 23, proyecto "Mueble Living" → `FARMACIA_CENTRAL-23-MUEBLE_LIVING`. Este mismo texto se muestra en un **apartado dentro de la vista del proyecto** y es el nombre de la carpeta en el almacenamiento (mismo identificador en la plataforma y en el Drive/Nextcloud).
- Q: ¿Se renombran las carpetas de proyectos ya existentes en el almacenamiento? → A: **Solo proyectos nuevos**. Todos los proyectos (nuevos y viejos) muestran su código en la plataforma; pero en el almacenamiento solo las carpetas nuevas se crean con el código en el nombre — las carpetas existentes no se renombran (se evita un renombrado masivo riesgoso).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el código de referencia de la carpeta en el proyecto (Priority: P1)

Un usuario abre un proyecto y ve, de forma clara, un **código de referencia legible** que identifica la carpeta de archivos de ese proyecto (por ejemplo "P-0023"). Puede copiarlo. Ya no depende del identificador interno opaco que usa el sistema por detrás.

**Why this priority**: Es el pedido central. Sin un código legible, el usuario no puede relacionar el proyecto con "su" carpeta cuando mira el almacenamiento. Todo el valor de la feature está acá.

**Independent Test**: Abrir un proyecto y verificar que muestra un código de referencia legible, estable y copiable.

**Acceptance Scenarios**:

1. **Given** un proyecto existente, **When** el usuario abre su vista, **Then** ve un código de referencia legible (no un identificador opaco) que identifica su carpeta.
2. **Given** el código mostrado, **When** el usuario lo copia, **Then** obtiene el texto del código para pegarlo (por ejemplo al buscar en el Drive).
3. **Given** dos proyectos distintos, **When** el usuario compara sus códigos, **Then** son distintos (únicos por proyecto) y estables en el tiempo.

---

### User Story 2 - Encontrar la carpeta en el almacenamiento por su código (Priority: P2)

Un administrador (o usuario) que abre el Google Drive / Nextcloud de la organización quiere identificar rápidamente a qué proyecto pertenece cada carpeta. La carpeta del proyecto en el almacenamiento lleva un **nombre legible que incluye ese código de referencia** (por ejemplo "P-0023 · Farmacia"), de modo que coincida con lo que se ve en la plataforma.

**Why this priority**: Cierra el círculo: el código visible en el proyecto debe coincidir con lo que se ve en el Drive para poder ubicar la carpeta. Secundario a mostrar el código (US1), pero necesario para el objetivo de "encontrar la carpeta".

**Independent Test**: Crear un proyecto, mirar su carpeta en el almacenamiento y verificar que el nombre de la carpeta incluye el mismo código que muestra la plataforma.

**Acceptance Scenarios**:

1. **Given** un proyecto nuevo, **When** se crea su carpeta en el almacenamiento, **Then** el nombre de la carpeta incluye el código de referencia visible en la plataforma.
2. **Given** el código de un proyecto, **When** el administrador busca ese código en el Drive/Nextcloud, **Then** encuentra la carpeta correspondiente.

---

### Edge Cases

- **Proyectos existentes (antes de la feature)**: los proyectos ya creados obtienen su código de referencia de forma consistente (derivado de un dato estable que ya poseen); no se rompen ni cambian de identidad.
- **Proyectos con el mismo nombre**: dos proyectos que se llaman igual tienen códigos de referencia distintos, evitando ambigüedad al buscar la carpeta.
- **Renombrar el proyecto**: cambiar el nombre del proyecto no cambia su código de referencia (el código es estable); el nombre de la carpeta puede reflejar el nombre nuevo, pero el código se mantiene.
- **Sin almacenamiento configurado**: el código de referencia se muestra igual en el proyecto (es un atributo del proyecto), aunque todavía no exista carpeta física.
- **Caracteres no válidos para carpetas**: el nombre de la carpeta se sadea para el almacenamiento, pero el código de referencia permanece intacto y legible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada proyecto DEBE tener un **código de referencia** legible por humanos con el formato **`NOMBRE_DEL_GRUPO-NÚMERO-NOMBRE_DEL_PROYECTO`** en MAYÚSCULAS, con las tres partes unidas por guiones (`-`) y los espacios internos de cada nombre reemplazados por guión bajo (`_`). Ejemplo: `FARMACIA_CENTRAL-23-MUEBLE_LIVING`. La parte "NOMBRE_DEL_GRUPO-NÚMERO" identifica de forma única y estable; el nombre del proyecto la acompaña.
- **FR-002**: El código de referencia DEBE mostrarse en un **apartado visible dentro de la vista del proyecto**, presentado como el identificador del proyecto (no oculto entre datos técnicos).
- **FR-003**: El usuario DEBE poder copiar el código de referencia con una acción simple.
- **FR-004**: El código de referencia NO DEBE ser el identificador interno opaco del sistema ni el de la carpeta del proveedor de almacenamiento.
- **FR-005**: Al crear la carpeta de un proyecto en el almacenamiento (Google Drive o Nextcloud), su nombre DEBE ser el mismo código de referencia (prefijo + número + nombre), para que coincida con lo que se ve en la plataforma y sea ubicable.
- **FR-006**: Los proyectos ya existentes DEBEN mostrar su código de referencia en la plataforma sin perder ni cambiar su identidad ni sus archivos; sus carpetas en el almacenamiento NO se renombran (solo las carpetas de proyectos nuevos se crean con el código).
- **FR-007**: La parte identificadora estable del código (prefijo + número) DEBE permanecer igual aunque el proyecto se renombre; el nombre que acompaña puede reflejar el nombre actual.
- **FR-008**: La primera parte del código DEBE ser el **nombre completo del grupo** al que pertenece el proyecto (en mayúsculas, espacios como `_`), no una abreviatura; los proyectos de espacio personal (sin grupo) DEBEN usar un nombre de ámbito genérico consistente (por ejemplo `PERSONAL`).
- **FR-009**: La normalización del texto (mayúsculas, espacios→`_`, unión con `-`) DEBE ser determinista: el mismo grupo/proyecto produce siempre el mismo código.

### Key Entities *(include if feature involves data)*

- **Proyecto (trabajo)**: además de su identificador interno, expone un **código de referencia** legible por humanos, estable y único.
- **Carpeta del proyecto**: carpeta en el almacenamiento activo cuyo nombre legible incluye el código de referencia + el nombre del proyecto, para identificarla desde el Drive/Nextcloud.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los proyectos muestran un código de referencia legible en su vista.
- **SC-002**: Dado un código de referencia, un usuario puede ubicar la carpeta correcta en el almacenamiento en menos de 30 segundos.
- **SC-003**: Dos proyectos cualesquiera tienen códigos de referencia distintos (0 colisiones).
- **SC-004**: El código de referencia de un proyecto no cambia tras renombrarlo (100% estable).
- **SC-005**: Los proyectos creados antes de la feature muestran su código sin errores ni pérdida de archivos.

## Assumptions

- El número del código proviene del identificador secuencial estable que cada proyecto ya posee internamente.
- La primera parte del código es el **nombre completo del grupo** del proyecto, normalizado (mayúsculas, espacios→`_`); los proyectos personales usan un ámbito genérico (ej. `PERSONAL`).
- El nombre de la carpeta en el almacenamiento es el código completo `GRUPO-NÚMERO-PROYECTO` (mismo string mostrado en la plataforma).
- El código es de solo lectura para el usuario (lo asigna el sistema); no se edita manualmente.
- Aplica tanto a Google Drive como a Nextcloud (el nombre de carpeta legible sirve para ambos).
- Las carpetas de proyectos ya existentes en el almacenamiento NO se renombran (decisión de clarificación); el código igual se muestra en la plataforma para todos.
