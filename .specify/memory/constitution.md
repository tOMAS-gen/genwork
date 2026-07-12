<!--
Sync Impact Report
- Version change: 1.4.0 → 1.5.0
- Modified sections: "Semántica de Etiquetado y Reglas de Dominio" > "Reglas de dominio no
  negociables" — la regla de la feature 044 ("los sectores son un catálogo global, los crea
  y administra exclusivamente SUPERADMIN") se REDISTRIBUYE: la creación pasa a depender del
  ámbito (Grupo/Personal/Global) del sector — SUPERADMIN o el ADMIN de ese grupo crean uno de
  Grupo, cualquier usuario crea uno Personal, solo SUPERADMIN crea uno Global. La
  ADMINISTRACIÓN de un sector ya creado (renombrar/recolorear/eliminar/otorgar acceso) NO
  cambia: sigue 100% exclusiva de SUPERADMIN, sin excepción por ámbito — decisión explícita
  del usuario en specs/046-sectores-ambito/ que diferencia este caso del ya resuelto para
  TaskStatus en specs/045-permisos-ambito-estados/ (donde el ADMIN de grupo sí administra su
  propio conjunto). No es uno de los Core Principles I-V, pero sí una regla de dominio que
  vuelve a distribuir algo que 044 había centralizado → bump MINOR (mismo criterio que los
  cambios previos: no redefine un Core Principle de forma incompatible, pero sí redistribuye
  materialmente una guía existente).
- Added sections: n/a
- Removed sections: n/a
- Templates:
  - ✅ .specify/templates/plan-template.md — sin cambios requeridos (gate genérico, no hardcodea principios)
  - ✅ .specify/templates/spec-template.md — sin cambios requeridos
  - ✅ .specify/templates/tasks-template.md — sin cambios requeridos
  - ✅ specs/046-sectores-ambito/* — motivador de este cambio; ya alineado con la nueva redacción
- Follow-up TODOs: ninguno.
-->

# genwork Constitution

genwork es un gestor de trabajos y tareas para talleres/empresas con múltiples sectores
operativos. Cada trabajo pertenece a un cliente y sus tareas se clasifican y consultan
simultáneamente por trabajo y por sector mediante etiquetado inline.

## Core Principles

### I. Tarea única, múltiples vistas

Toda tarea es UNA sola entidad en el sistema, sin importar desde dónde se creó o desde
cuántas vistas se vea. Las etiquetas la hacen visible en la vista del trabajo (`/`) y en
las vistas de sector (`#`, `@`), pero nunca la duplican.

- Completar una tarea desde cualquier vista la marca completada en TODAS las vistas.
- Editar el texto o las etiquetas de una tarea se refleja en todas las vistas.
- Está PROHIBIDO cualquier diseño que copie tareas entre vistas o requiera sincronización
  manual entre ellas.

Rationale: el valor central del producto es ver el mismo universo de tareas desde el ángulo
del cliente o del sector sin inconsistencias. Una duplicación rompe la confianza en el sistema.

### II. Etiquetado inline como interfaz primaria

Las tareas se clasifican escribiendo símbolos dentro del propio texto de la tarea, mientras
se escribe. No se exigen formularios ni menús para clasificar.

- `/nombre` vincula la tarea a un trabajo/cliente (destino: se guarda y vive en ese trabajo).
- `#nombre` asigna la tarea a un sector de trabajo (pertenencia: el sector donde se ejecuta).
- `@nombre` referencia un sector o un usuario cuyo aporte se necesita para completar la tarea
  (mención: crea vínculo filtrable y visible para el referenciado, NO transfiere pertenencia ni
  habilita completar).
- `$nombre` etiqueta la tarea con una etiqueta de proyecto (LabelKey/LabelValue de ámbito grupo
  o global); es clasificatoria y filtrable, NO cambia dónde se ejecuta ni se completa la tarea.
- El parser DEBE reconocer estas etiquetas en línea y convertirlas en vínculos navegables
  y filtrables.
- Una tarea puede combinar los tres símbolos (ej.: `Comprar perfiles de hierro #Compras
  @Metalurgica /Tina`).

Rationale: la captura rápida con símbolos es lo que permite clasificar sin fricción; si
clasificar cuesta, el sistema deja de usarse.

### III. Trabajo = Documentación + Tareas

Todo trabajo/proyecto tiene exactamente dos secciones que conviven en una misma página:

1. **Documentación** (arriba): página libre estilo Notion para descripción, notas,
   presupuestos, imágenes, archivos, diseños, medidas e instrucciones.
2. **Tareas** (abajo): checklist operativa del trabajo.

Ninguna feature puede separar estas secciones en lugares distintos ni exigir navegar fuera
del trabajo para ver su información o su avance.

Rationale: el trabajo es la unidad de venta y ejecución; información y seguimiento operativo
deben leerse juntos, en un único lugar.

### IV. Completado binario, estados configurables

Todo estado de tarea pertenece a exactamente uno de dos TIPOS: **en curso** (no completada)
o **final** (completada). Ese invariante binario de completado no se negocia; lo que se
permite configurar es el nombre, el color y la cantidad de estados dentro del tipo "en curso".

- Cada conjunto de estados (el general de la organización, o el propio de un sector que lo
  adaptó) DEBE tener exactamente un estado de tipo "final" (equivalente a "Realizada"/"Hecha").
- Puede haber uno o varios estados de tipo "en curso", con nombre y color propios definidos
  por la organización o por el sector (ej.: "Pendiente", "En proceso", "En consulta").
- Se completa asignando el estado "final" mediante un selector; al completarse se diferencia
  visualmente (tachada o similar) y PERMANECE en el historial del trabajo; nunca se borra
  automáticamente. Volver de "final" a cualquier estado "en curso" deshace ese registro.
- La tarea se completa donde se EJECUTA (su sector de pertenencia `#`), no en los sectores
  que solo la referencian (`@`).

Rationale: el usuario necesita ver de un vistazo qué falta y qué se hizo, y conservar el
registro de lo realizado por trabajo — ese invariante binario no cambia. Lo que sí varía entre
organizaciones es cómo llaman a las etapas antes de terminar (asignación, revisión, consulta);
nombrarlas y colorearlas da flexibilidad real sin romper la simplicidad del seguimiento.

### V. Simplicidad primero (YAGNI)

Empezar con lo mínimo que entrega valor: trabajos, tareas, etiquetas y filtros.

- Toda complejidad agregada (nuevas entidades, patrones, capas, servicios) DEBE justificarse
  en la sección Complexity Tracking del plan correspondiente.
- Ante dos diseños válidos, se elige el más simple de mantener por una sola persona.

Rationale: proyecto personal/laboral de un solo desarrollador; la complejidad no justificada
mata el avance.

## Semántica de Etiquetado y Reglas de Dominio

| Símbolo | Nombre      | Significado                                   | Efecto                                             |
|---------|-------------|-----------------------------------------------|----------------------------------------------------|
| `/`     | Trabajo     | Cliente/trabajo al que pertenece la tarea     | La tarea se guarda y aparece en ese trabajo         |
| `#`     | Sector      | Sector operativo donde se ejecuta la tarea    | La tarea aparece en la vista de ese sector          |
| `@`     | Referencia  | Sector o usuario cuyo aporte necesita la tarea | Vínculo filtrable, visible para el referenciado; NO define dónde se completa |
| `$`     | Etiqueta    | Etiqueta de proyecto (grupo/global) que clasifica la tarea | Vínculo filtrable; NO define dónde se ejecuta/completa |

Reglas de dominio no negociables:

- Los sectores de trabajo (ej.: Metalúrgica, Compras) pertenecen a uno de tres ámbitos —
  un Grupo, el espacio Personal de un usuario, o Global (ninguno de los dos anteriores).
  La CREACIÓN se distribuye por ámbito: SUPERADMIN o el ADMIN de ese grupo crean un sector
  de Grupo; cualquier usuario crea uno Personal para sí mismo; solo SUPERADMIN crea uno
  Global. La ADMINISTRACIÓN (renombrar, recolorear, eliminar, otorgar/quitar acceso vía
  SectorGrant) de un sector ya creado sigue reservada exclusivamente a SUPERADMIN, sin
  excepción por ámbito. Un sector de Grupo es vista agregadora de tareas de ese grupo; uno
  Personal, del usuario dueño; uno Global, de toda la organización sin importar el grupo.
- Filtrar es transversal: desde un sector se puede filtrar por trabajo, por otro sector
  referenciado, o por estado (ej.: en Compras, filtrar `@Metalurgica` para ver qué comprar
  en la ferretería).
- Crear una tarea desde una vista de sector con `/trabajo` la guarda en ese trabajo con el
  vínculo al sector actual.

## Flujo de Desarrollo

- Todo desarrollo sigue el ciclo Spec Kit: `/speckit-specify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`.
- La lógica core de dominio (parser de etiquetas, resolución de vistas, estados y filtros)
  DEBE tener tests automatizados antes de considerarse completa; la UI puede verificarse
  manualmente.
- El gate "Constitution Check" de cada plan DEBE validar contra los Principios I–V; toda
  violación se documenta en Complexity Tracking o se rediseña.
- El stack tecnológico se decide y documenta en el primer plan de implementación; una vez
  elegido, cambiarlo requiere enmienda a la constitution.

## Governance

- Esta constitution prevalece sobre cualquier otra práctica del repositorio.
- Enmiendas: se proponen editando este archivo vía `/speckit-constitution`, documentando el
  cambio en el Sync Impact Report y actualizando la versión.
- Versionado semántico: MAJOR = quitar/redefinir principios de forma incompatible; MINOR =
  agregar principio o sección, o ampliar guía materialmente; PATCH = aclaraciones y redacción.
- Cumplimiento: todo plan y toda revisión de implementación verifican los Principios I–V;
  la complejidad debe justificarse siempre.

**Version**: 1.5.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-12
