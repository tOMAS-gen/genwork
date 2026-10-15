# Auditoría funcional: web → app móvil

> Histórico. La guía vigente es [M00–M21](web-mobile-implementation-guide.md).
> CLIENT/READER, filtros avanzados, actividad y acceso de clientes por proyecto
> ya se incorporaron; consultar la guía para estado de verificación real.

Fecha: **2026-10-09**. Estado del workspace `paris`, incluida la implementación móvil todavía sin commit.

## Conclusión

La app cubre la operación básica: iniciar sesión, consultar y crear proyectos, trabajar con tareas y subtareas, consultar sectores, editar notas enriquecidas y gestionar recordatorios avanzados y administrar configuración y catálogos. **La implementación requiere todavía la validación transversal del punto 10 y pruebas con proveedores reales.**

El drawer incorpora los destinos implementados en los puntos 1–9. Recordatorios avanzados se completó en el punto 8 y configuración/administración en el punto 9. Quedan la validación transversal por rol, iOS y las integraciones de almacenamiento/Google contra proveedores configurados; las pruebas simuladas no sustituyen estas comprobaciones.

Esta es una auditoría de código: se revisaron rutas, componentes conectados a las páginas, modelos, repositorios y permisos. No es una validación E2E de cada operación ni certifica el comportamiento del servidor desplegado. No se contabilizan como funciones web los componentes o endpoints que no tienen un flujo visible conectado. Las prioridades siguientes son una propuesta de implementación, no estimaciones de esfuerzo.

## Entrega del punto 1 — CAL-01–05 (2026-10-09)

Implementadas las cinco correcciones del **orden recomendado** (distinto del
apartado 1, Drawer y navegación):

- **CAL-01:** Mi día omite referencias ya visibles, también las anidadas; mantiene
  los permisos de la tarea original y muestra el indicador «Te mencionan».
- **CAL-02:** las referencias de sector permiten cambiar estado según acceso y
  permiso por tarea. La edición del texto respeta origen/adopción y se evalúa
  aparte; la marca Mi día conserva su permiso independiente.
- **CAL-03:** se consulta `/api/reminders/timezone`; el formulario muestra esa zona,
  usa su fecha de hoy y preserva día/hora al editar. El rango de 60 días usa días
  calendario del sistema, con reglas IANA (incluido horario de verano). Los errores
  de carga ofrecen reintento antes de habilitar el guardado.
- **CAL-04:** el detalle observa los datos de su contexto (proyecto, sector o
  Mi día). Crear subtareas y editar texto actualiza la hoja sin reabrirla; las
  recargas conservan borradores locales y vuelven a evaluar permisos.
- **CAL-05:** al volver a primer plano se invalidan también notas, nota abierta,
  zona horaria y próximas ocurrencias. Una nota sin cambios adopta la versión
  nueva; una nota con cambios pendientes conserva el borrador.

Verificación: `dart analyze` sin issues y `flutter test` con **46 tests en verde**
(14 nuevos de regresión). Pruebas unitarias y de widgets en
`test/features/daily_parity_test.dart`, con respuestas HTTP simuladas, permisos,
subtareas, cambio de día, DST, reintento y ciclo pausa/reanudación. La verificación
no sustituye un recorrido contra el servidor desplegado ni la validación nativa
de Android/iOS. Las filas CAL conservan el diagnóstico original; CAL-01–05
quedan atendidos por esta entrega. Las filas de navegación se actualizan abajo. SEC-04 aún incluye agrupación/enlaces de origen.

## Entrega del punto 2 — Proyectos y Sectores (2026-10-09)

- **NAV-01 implementado:** secciones desplegables, accesos con color/ámbito y
  pendientes, orden descendente por pendientes con desempate alfabético español.
  Se muestran hasta diez elementos; el total incluye todos y «más» abre el listado.
- **NAV-02, destinos disponibles:** Todos, Mis proyectos (por `createdById`),
  Favoritos y Archivados. La ruta conserva el filtro al entrar/salir del detalle y
  el drawer marca el destino activo. Plantillas queda junto con su pantalla en el
  punto 6, como indica el orden recomendado.
- **Datos y filtros:** creador/propietario, contador canónico, IDs de grupos,
  etiquetas y sectores, y ámbito estructurado de sector. La búsqueda incluye
  descripción; grupos del mismo nombre no se confunden porque se filtra por ID.
- **Actualización:** contadores por SSE y reanudación, también cuando una tarea
  sale de un proyecto o cuando el proyecto se archiva/restaura. Carga, vacío y
  reintento independientes para cada sección del drawer.

Verificado con `dart analyze` sin issues y **55 tests en verde**, incluidos 9 nuevos
con router real y HTTP simulado. Navegación, filtros combinados, favorito persistido,
contadores, SSE, carga/error/reintento y 360 dp/1.5× en ambos temas. Capturas en
`.context/nav02/` (datos de prueba). Falta validación contra servidor real en dispositivo.

## Entrega del punto 3 — acciones de proyectos y sectores (2026-10-09)

- **PRO-03:** editar nombre, descripción y vencimiento; quitar vencimiento sin
  alterar fechas no editadas; archivar/restaurar; eliminar con nombre exacto y
  advertencia sobre tareas, documentos y archivos. Solo quien opera el proyecto.
  En archivados se permite renombrar, restaurar, administrar etiquetas y borrar;
  descripción/vencimiento/etapa quedan bloqueados como en la web.
- **PRO-04:** catálogo de etapas del ámbito, asignación y opción sin etapa;
  etiquetas globales y del ámbito, varias secundarias de una misma clave,
  elección/reemplazo de principal y eliminación de asignaciones. Se refleja la
  respuesta del servidor (la principal anterior pasa a secundaria).
- **SEC-01:** búsqueda, filtro por grupo/ámbito usando IDs, orden por nombre,
  pendientes, tareas y avance; agrupación y agregados por ámbito con secciones
  plegables. Buscar abre las coincidencias sin perder el plegado sin filtros.
- **SEC-02:** crear en Personal, grupos administrados y Global según rol;
  renombrar/cambiar color/borrar solo para SUPERADMIN, como exige la API. Antes
  de borrar se consulta el 409 con los conteos de vínculos y tareas sueltas y
  se exige confirmar el impacto. Carga/error/reintento y prevención de doble envío.
- Se mantienen los permisos de referencias corregidos en CAL-02. Las mutaciones
  refrescan listas, detalle, drawer, referencias y contadores. El retorno tras
  borrar funciona aunque llegue antes la notificación SSE.

Verificación: `dart analyze` sin issues y **71 tests** en verde, incluidos 16
nuevos en `test/features/resource_operations_test.dart`: contratos HTTP reales
con transporte simulado, roles, 403, confirmaciones, filtros, múltiples etiquetas,
actualización de vistas, carrera de borrado y 360 dp/1.5× en claro y oscuro.
Recorrido Android contra el servidor local con recursos temporales de prueba;
las etapas se probaron con catálogo simulado porque el ámbito personal del
servidor no tiene etapas configuradas. No se modificaron endpoints del servidor.

## Entrega del punto 4 — Grupos (2026-10-09)

- **NAV-03 / GRP-01:** rama propia en el drawer, accesos ordenados por pendientes
  y nombre, colores y total; búsqueda, alta, detalle, edición y eliminación.
  El detalle enlaza proyectos activos y sectores del grupo; conserva estado al
  cambiar de sección. El borrado exige el nombre exacto y explica la cascada real
  del esquema (proyectos, sectores y datos asociados), aunque el texto web actual
  diga que conserva los proyectos.
- **GRP-02:** búsqueda con espera breve, selección de usuario existente, alta,
  cambios ADMIN/MEMBER y baja. Se protege al propietario. Acciones reservadas a
  SUPERADMIN o MEMBER con membresía ADMIN; tener lectura no otorga administración.
- **GRP-03:** confirmar lectura para no miembros/TV; administrar clientes y su
  selección de proyectos, con confirmación adicional al quitar todos los accesos
  o perder accesos a proyectos archivados. Etiquetas propias del grupo con claves,
  valores y colores; borrado confirma primero y vuelve a confirmar el impacto si
  la API devuelve 409. Un 403 conserva el formulario y nunca fuerza el borrado.
- Mutaciones invalidan catálogos, detalles y contadores. Los cambios de grupos y
  etiquetas no emiten SSE en el servidor actual: se ven tras la mutación local,
  al volver a primer plano o al actualizar manualmente. No se cambiaron endpoints.

Verificación: **87 tests en verde** (16 nuevos), `dart analyze` sin issues;
permisos, contratos HTTP con transporte simulado, errores/reintento, alcance de
clientes, doble confirmación, router real, SSE y 360 dp/1.5× en ambos temas.
Recorrido Android contra servidor local: alta/edición/borrado de grupo temporal,
lectura para no miembros, alta/cambio de rol/baja de miembros y alta/edición/borrado
de etiquetas y valores. Clientes: pantalla vacía real y mutaciones con HTTP simulado,
sin crear cuentas reales. Se eliminó el grupo temporal al finalizar. Capturas y
registro en `.context/groups04/`. No implica validación en iOS ni en el servidor desplegado.

## Entrega del punto 5 — Vista de tareas y Mi día (2026-10-09)

- **DIA-02:** progreso por tareas hoja igual al cálculo web; origen navegable al
  proyecto o sector, con objetivo/padre como contexto. Conserva deduplicación,
  indicadores y permisos de CAL-01.
- **DIA-03 / NAV-04:** `/board` tiene rama propia, panorama por sectores y acceso
  al sector. Muestra pendientes, estado y contexto de proyecto/objetivo/padre.
  Los contenedores no suman al progreso; el total deduplica hojas por ID entre
  sectores. Las filas son de consulta, como el contrato web, sin acciones inventadas.
- **NAV-06:** Vence hoy en el drawer, contador y campana llevan a los mismos
  avisos pendientes. No filtra por la fecha del teléfono: la API también devuelve
  avisos pendientes anteriores. Descartar/posponer reutiliza un componente común
  con Recordatorios. Consulta al abrir, reanudar y cada 60 segundos en primer plano;
  errores conservan el aviso y evitan envíos duplicados. Logout en drawer y cuenta
  comparte revocación y limpieza de sesión.
- SSE, mutaciones locales y reanudación refrescan el panorama. Carga, vacío,
  error/reintento y conservación del último panorama si falla una recarga.

Verificación: `dart analyze` sin issues y **103 tests en verde**, 16 nuevos en
`test/features/day_overview_test.dart`. Router real y transporte simulado:
conteos/deduplicación, permisos, enlaces, SSE, ciclo de vida, avisos, cierre de
sesión y 360 dp/1.5× claro/oscuro. QA Android contra servidor local con tarea y
subtareas temporales; Vence hoy vacío real, mutaciones de avisos con HTTP simulado
sin enviar notificaciones reales. Capturas y registro en `.context/day05/`.
Se corrigió el regreso tras borrar un proyecto/sector abierto desde otra rama,
sin recuperar el detalle eliminado; dos regresiones reproducen el fallo previo.
El sector temporal y sus tres tareas se eliminaron al finalizar. Cierre de sesión
verificado con transporte simulado; se dejó iniciada la sesión del emulador.
No se modificaron endpoints. La validación nativa de iOS sigue pendiente.

## Entrega del punto 6 — objetivos, plantillas y organización (2026-10-09)

- **OBJ-01:** objetivos con título/descripción, alta/edición, subir/bajar y borrado
  con elección explícita entre conservar tareas en Generales o eliminarlas.
- **OBJ-02 / NAV-02:** Plantillas de objetivo en el drawer; lista, búsqueda,
  creación y edición de contenido. Crear proyecto desde plantilla e insertar
  una plantilla como objetivo independiente. Las plantillas no anidan objetivos.
- **OBJ-03:** guardar un objetivo como plantilla personal y mover raíces con sus
  subtareas entre objetivos/Generales.
- **TAR-01/02:** autocompletado contextual con `insertText`, respuestas atrasadas
  descartadas; resaltado de símbolos/fechas válidas. Alta por líneas con descripción,
  recuperación de fallos parciales sin repetir altas confirmadas y aviso/enlace
  cuando cambia el destino. Referencias nuevas: corregir o crear explícitamente;
  `$` ambiguo: elegir/corregir un nombre de valor único. El backend no admite
  desambiguar esa sintaxis por ID de clave; no se inventa un contrato nuevo.
- **TAR-03:** orden por sección y por padre con controles Subir/Bajar accesibles;
  selección de padre entre raíces del hogar real y separación de subtareas.
  Se envía el conjunto completo, con recarga/reintento ante cambios concurrentes.
- **TAR-04/05:** alternar lista/tablero por estados en proyecto y sector,
  subtareas independientes con los mismos permisos; enlaces desde el detalle a
  proyectos/sectores EXEC/REF y vencimiento efectivo de hijas abiertas.

Verificación: **125 tests aprobados** (22 nuevos en
`test/features/objectives_parity_test.dart`), análisis sin issues. Contratos HTTP
con transporte simulado, router real, lectura/archivados, errores, doble envío,
borrado, lotes parciales y pantallas a 360 dp/1.5× claro/oscuro. QA Android contra
servidor local con plantilla y proyecto temporales. Capturas y detalles en
`.context/objectives06/`. Plantilla y proyecto temporales eliminados al terminar;
emulador abierto en Plantillas de objetivo. No implica validación nativa de iOS.

## Lo que ya existe en la app

| Área | Disponible hoy |
|---|---|
| Acceso | Configuración de URL, login por navegador/PKCE, sesión segura, cierre de sesión y tratamiento de 401. |
| Navegación | Drawer con perfil; Proyectos/Sectores/Grupos desplegables con accesos, colores y contadores; Mis notas, Mi día y referencias, Vista de tareas, Vence hoy, Recordatorios, Mi cuenta y cierre de sesión. Conserva el estado entre secciones. |
| Proyectos | Todos/Mis proyectos/Favoritos/Archivados; búsqueda por nombre/descripción/grupo; filtro de grupo por ID; marcar favoritos, crear proyecto y consultar detalle. |
| Tareas | Crear, editar texto/descripción, cambiar estado, marcar/quitar Mi día, borrar, crear y completar subtareas, consultar historial de estados. |
| Mi día y Vista de tareas | Progreso por hojas, origen navegable y panorama de pendientes por sector con estados y contexto. |
| Objetivos y plantillas | Alta/edición/orden/borrado de objetivos, plantillas y copias, traslado y orden de tareas. |
| Sectores | Búsqueda, filtros/orden/agrupación, alta y administración por rol; tareas sueltas/por proyecto/referencias, pendientes/hechas/todas y creación según permisos. |
| Grupos | Lista/detalle, alta/edición/borrado, miembros y roles, lectura para no miembros, clientes por proyecto y etiquetas del grupo. |
| Notas/documentos | TipTap local con formato, autoguardado/reintento, Markdown y documentación del proyecto. Formatos desconocidos protegidos contra pérdida. |
| Recordatorios | Avisos recibidos, descartar/posponer, próximas ocurrencias a 60 días, alta/edición/borrado y repetición básica. |
| Cuenta y presentación | Perfil, servidor, logout, temas claro/oscuro según sistema, fuentes locales y adaptación móvil. |
| Actualización | SSE para tareas/proyectos y refresco de varios recursos al volver a primer plano; ver limitaciones más abajo. |

## Entrega del punto 9 — configuración y administración (2026-10-09)

CFG/ADM y NAV-05 implementados: tema persistido, cuenta/sistema, catálogos por
ámbito, acceso, usuarios, clientes, almacenamiento, recordatorios del sistema,
errores y conexiones MCP. Roles comprobados antes de cargar módulos y en la API.
Google dispone de flujo móvil propio ligado por PKCE a la sesión Bearer, sin
compartir cookies ni tokens con el navegador. Nextcloud conserva su flujo nativo
de autorización y sondeo cancelable.

Verificación: 183 tests Flutter, 32 tests backend de auth/integraciones, análisis
Dart/TypeScript/ESLint limpios y APK debug. Android contra servidor local: módulos,
tema, alta/edición/borrado de etiqueta y valor personal. Los datos QA09 se
eliminaron. Pruebas simuladas cubren permisos, fallos y flujos de autorización.
Quedan proveedores reales, iOS y la validación transversal del punto 10. Ver
`PLAN.md` y `api-contract.md` para alcance y despliegue de la nueva migración.

## Lista de pendientes

**Estado:** parcial = existe parte del flujo; ausente = no hay interfaz móvil para esa función. **Prioridad:** alta = navegación u operación cotidiana; media = completa flujos y gestión; baja = preferencia o comodidad. Administración puede subir de prioridad para usuarios administradores.

### 1. Drawer y navegación

Fuentes: [DrawerNav web](../../src/components/nav/DrawerNav.tsx), [shell móvil](../lib/features/shell/home_shell.dart), [router móvil](../lib/core/router/app_router.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| NAV-01 | Implementado | Proyectos/Sectores desplegables, accesos directos, colores, contadores y orden por pendientes/nombre. | Alta |
| NAV-02 | Implementado | Todos, Mis proyectos, Favoritos, Archivados y Plantillas de objetivo con pantalla y acciones. | Alta |
| NAV-03 | Implementado | Grupos desplegable con colores, pendientes, lista y detalle. Ver GRP. | Alta |
| NAV-04 | Implementado | Destino Vista de tareas y pantalla general por sectores. Ver DIA-03. | Alta |
| NAV-05 | Implementado | Configuración accesible desde drawer y cuenta, con módulos según rol. | Media |
| NAV-06 | Implementado | Vence hoy con contador, acciones compartidas de avisos y cierre de sesión en el drawer. | Media |

### 2. Proyectos (descripciones de la auditoría original; estado actualizado en Mxx)

Fuentes: [dashboard web](../../src/app/(main)/page.tsx), [detalle web](../../src/app/(main)/works/[id]/page.tsx), [lista móvil](../lib/features/works/works_list_screen.dart), [detalle móvil](../lib/features/works/work_detail_screen.dart), [repositorio móvil](../lib/data/repositories/works_repository.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| PRO-01 | Implementado M05 | Búsqueda y filtros combinados por creador, favorito, archivo, grupo(s), sector, etiqueta y avance; guía M05. | Alta |
| PRO-02 | Implementado M05 | Orden por recientes/favoritos, nombre o avance y resumen de resultados; estadísticas compactas para teléfono. | Media |
| PRO-03 | Hecho | Edición, archivado/restauración y borrado con nombre exacto, permisos y refresco. | Alta |
| PRO-04 | Hecho | Etapas y asignaciones de etiquetas principales/secundarias con catálogos del ámbito. | Alta |
| PRO-05 | Implementado | Copiar el código de referencia del proyecto. | Baja |
| PRO-06 | Implementado M17 | Actividad MCP del proyecto disponible como pantalla desde sus pestañas; no es un historial general. | Media |
| PRO-07 | Implementado M17 | Alta y revocación de acceso de clientes por proyecto, condicionadas a canManageClients. | Media |

Los documentos y archivos se detallan por separado para que PRO-03 no se confunda con completar todo el proyecto.

### 3. Objetivos y plantillas

Fuentes: [acciones de objetivos](../../src/components/objectives/objectiveMenu.tsx), [alta](../../src/components/objectives/AddObjectiveDialog.tsx), [borrado](../../src/components/objectives/DeleteObjectiveDialog.tsx), [detalle móvil](../lib/features/works/work_detail_screen.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| OBJ-01 | Implementado | Crear, editar título/descripción, ordenar y borrar objetivos eligiendo conservar o eliminar tareas. | Alta |
| OBJ-02 | Implementado | Listar, buscar, crear y editar plantillas; crear proyecto desde plantilla e insertarla en un proyecto. | Alta |
| OBJ-03 | Implementado | Guardar objetivo como plantilla personal y mover tareas entre objetivos o Generales. | Alta |

Respetar la regla web: una plantilla representa un objetivo; no contiene objetivos anidados. Gestionar objetivos requiere poder operar el proyecto y que no esté archivado ni sea una plantilla.

### 4. Tareas y subtareas

Fuentes: [TaskItem](../../src/components/tasks/TaskItem.tsx), [TaskListEditor](../../src/components/tasks/TaskListEditor.tsx), [TaskMoveDialog](../../src/components/tasks/TaskMoveDialog.tsx), [detalle móvil](../lib/features/tasks/task_detail_sheet.dart), [composer móvil](../lib/shared/widgets/task_composer.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| TAR-01 | Implementado | Autocompletado contextual, resaltado y resolución guiada según el contrato de sintaxis del servidor. | Alta |
| TAR-02 | Implementado | Una tarea por línea, descripción, aviso de destino distinto y reintentos sin duplicar altas confirmadas. | Media |
| TAR-03 | Implementado | Orden por sección/padre, mover bajo otra raíz y separar subtareas; controles accesibles Subir/Bajar. | Alta |
| TAR-04 | Implementado | Lista/tablero por estado en proyecto y sector con acciones y permisos conservados. | Media |
| TAR-05 | Implementado | Enlaces de proyecto/sector desde el detalle y vencimiento efectivo de subtareas abiertas. | Media |

### 5. Mi día, referencias y vista de tareas

Fuentes: [Mi día web](../../src/components/myDay/MyDayList.tsx), [combinación de listas](../../src/components/myDay/mergeMyDayAndReferences.ts), [vista general](../../src/components/board/BoardGrid.tsx), [Mi día móvil](../lib/features/my_day/my_day_screen.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| DIA-01 | Implementado | Deduplicación de Mi día y referencias, incluidas subtareas, con indicadores y permisos conservados (CAL-01). | Alta |
| DIA-02 | Implementado | Progreso con el cómputo web de tareas hoja y enlaces al proyecto/sector de origen. | Alta |
| DIA-03 | Implementado | Vista de tareas `/board`: panorama de sectores con pendientes, progreso, estado y contexto proyecto/objetivo/padre; consulta y navegación al sector. | Alta |

La web consultada muestra referencias abiertas. No se agrega como brecha un supuesto filtro de referencias finalizadas que no está conectado a esa pantalla.

### 6. Sectores

Fuentes: [listado web](../../src/components/sectors/SectorsView.tsx), [toolbar](../../src/components/sectors/SectorToolbar.tsx), [detalle web](../../src/app/(main)/sectors/[id]/page.tsx), [lista móvil](../lib/features/sectors/sectors_list_screen.dart), [detalle móvil](../lib/features/sectors/sector_detail_screen.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| SEC-01 | Hecho | Búsqueda, filtros por ID, los cuatro órdenes y agrupación plegable por ámbito. | Alta |
| SEC-02 | Hecho | Alta por ámbito autorizado; nombre/color/borrado para SUPERADMIN, con consulta de impacto y confirmación. | Alta |
| SEC-03 | Implementado M09 | Acceso directo a Estados del sector y catálogo con ámbito inicial, herencia y canWrite. | Media |
| SEC-04 | Implementado M09 | Referencias completables según permisos de contexto/tarea, agrupadas por origen navegable. | Alta |

El endpoint de tareas del sector admite más filtros, pero la página web actual no conecta el componente genérico `filters/FilterBar`. Los filtros por etiqueta/estado/proyecto que figuran en la planificación son una ampliación respaldada por API, no una función visible de esa página que se pueda declarar ausente por comparación de UI.

### 7. Grupos

Fuentes: [lista web](../../src/app/(main)/groups/page.tsx), [detalle web](../../src/app/(main)/groups/[id]/page.tsx). La app cuenta con rutas, repositorio y providers propios para estos flujos.

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| GRP-01 | Implementado | Lista y detalle de grupos, proyectos del grupo, alta, cambio de nombre/color y eliminación según rol. | Alta |
| GRP-02 | Implementado | Buscar/agregar/quitar miembros y administrar sus roles permitidos, respetando al propietario. | Alta |
| GRP-03 | Implementado | Lectura pública del grupo para no miembros/TV, acceso de clientes y administración de etiquetas del grupo. | Media |

### 8. Documentos, notas y archivos

Fuentes: [DocEditor](../../src/components/editor/DocEditor.tsx), [MarkdownSurface](../../src/components/editor/MarkdownSurface.tsx), [FilesBrowser](../../src/components/files/FilesBrowser.tsx), [nota móvil](../lib/features/notes/note_detail_screen.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| DOC-01 | Implementado | Documento del proyecto: leer con formato, editar, autoguardar y adjuntar/mostrar imágenes. | Alta |
| DOC-02 | Implementado | Leer y editar notas con formato sin aplanar el documento; mantener enlaces, estructura y formato del contenido existente. | Alta |
| DOC-03 | Implementado | Importar/exportar Markdown en notas y documentos, barra de formato y estado de autoguardado/reintento. | Media |
| ARC-01 | Implementado | Habilitar y recorrer archivos del proyecto, carpetas, descargar, subir con progreso/cancelación, renombrar y eliminar. | Alta |
| ARC-02 | Implementado | Compartir archivos por enlace o usuario, consultar y revocar compartidos y copiar enlaces según capacidades del proveedor. | Media |

La existencia de endpoints de archivos no resuelve por sí sola el flujo móvil: hay que integrar selección de archivos, descargas autenticadas y apertura con aplicaciones del dispositivo. Una URL que usa cookies en la web necesita un flujo compatible con la sesión móvil.

### 9. Recordatorios

Fuentes: [calendario web](../../src/components/reminders/RemindersView.tsx), [formulario web](../../src/components/reminders/ReminderDialog.tsx), [formulario móvil](../lib/features/reminders/reminder_form_screen.dart), [repositorio móvil](../lib/data/repositories/reminders_repository.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| REC-01 | Implementado (punto 8) | Calendario mensual y navegación a fechas fuera de los próximos 60 días. | Media |
| REC-02 | Implementado (punto 8) | Elegir ámbito individual/grupo/global según rol y vincular un proyecto o sector. La app permite configurarlos y conserva el alcance al editar. | Alta |
| REC-03 | Implementado (punto 8) | Elegir varios días semanales, repetición cada N unidades, fecha/cantidad de finalización y varios avisos anticipados con horarios. | Alta |
| REC-04 | Implementado (punto 1) | Consultar y mostrar la zona horaria del sistema y usarla para el día de referencia. Ver hallazgo CAL-03. | Alta |

Las notificaciones recibidas, descartar y posponer **ya existen**. El selector web de enlaces ofrece proyectos y sectores; no se presupone una opción visible de enlazar tareas solo porque la API la soporte.

### 10. Cuenta, configuración y administración

Fuentes: [SettingsNav](../../src/components/nav/SettingsNav.tsx), [cuenta web](../../src/app/(main)/settings/page.tsx), [vinculación de almacenamiento](../../src/components/settings/StorageAccountLink.tsx), [cuenta móvil](../lib/features/account/account_screen.dart).

| ID | Estado | Falta implementar | Prioridad |
|---|---|---|---|
| CFG-01 | Implementado; QA proveedor pendiente | Información del sistema y vinculación/desvinculación Nextcloud. Google Drive usa la cuenta de la organización, igual que la web actual. | Media |
| CFG-02 | Implementado | Tema claro, oscuro o del sistema persistido en el dispositivo. | Baja |
| ADM-01 | Implementado | Panel de módulos administrativos, acceso por dominio/lista y gestión de correos permitidos. | Media |
| ADM-02 | Implementado | Roles MEMBER/READER, permisos de lector por grupo y altas/bajas de clientes externos con proyectos. | Media |
| ADM-03 | Implementado | CRUD de etiquetas/valores/colores, etapas y estados por ámbito; permisos, confirmación de impacto y orden. | Media |
| ADM-04 | Implementado; QA proveedor pendiente | Proveedor y configuración, OAuth móvil de Drive, carpeta raíz, prueba de conexión y trabajos/reintentos. | Media |
| ADM-05 | Implementado; QA Google pendiente | Zona horaria, conectar/reconectar Gmail por OAuth móvil y desconexión confirmada. | Media |
| ADM-06 | Implementado | Listado por estado, detalle/contexto y resolver/reabrir errores. | Media |
| ADM-07 | Implementado | Conexiones MCP propias: crear, clave mostrada una vez, revocar y consultar actividad. | Media |

Las secciones del sistema se muestran en la web al SUPERADMIN. Los permisos de grupo/proyecto deben evaluarse aparte; ser MEMBER no equivale a no poder administrar un grupo. Los flujos OAuth de almacenamiento y Gmail requieren revisar inicio, callback y regreso a la app: no alcanza con abrir una ruta protegida en el navegador.

Referencias administrativas: [acceso](../../src/app/(main)/admin/access/page.tsx), [usuarios](../../src/app/(main)/admin/users/page.tsx), [clientes](../../src/app/(main)/admin/clients/page.tsx), [etiquetas](../../src/app/(main)/admin/labels/page.tsx), [etapas](../../src/app/(main)/admin/stages/page.tsx), [estados](../../src/app/(main)/admin/task-statuses/page.tsx), [almacenamiento](../../src/app/(main)/admin/storage/page.tsx), [recordatorios](../../src/app/(main)/admin/reminders/page.tsx), [errores](../../src/app/(main)/admin/errors/page.tsx), [MCP](../../src/app/(main)/admin/mcp/page.tsx).

## Diferencias de comportamiento para corregir o reproducir

Estas observaciones salen de la lectura del código. Se indica qué está confirmado estructuralmente y qué requiere reproducción con datos reales.

| ID | Hallazgo y evidencia | Verificación al implementarlo |
|---|---|---|
| CAL-01 | **Duplicación en Mi día:** el móvil dibuja las listas por separado sin el equivalente a `mergeMyDayAndReferences`. Confirmado en código; cubierto por DIA-01. | Una tarea marcada para hoy y referenciada, también si es subtarea visible, aparece una sola vez con sus permisos correctos. |
| CAL-02 | **Referencias de sector demasiado restringidas:** la app fuerza solo lectura; la web usa permisos de contexto y de tarea. Confirmado en código; cubierto por SEC-04. | Usuario autorizado puede completar; usuario sin permiso no puede. Revisar permisos de estado y de edición de texto por separado. |
| CAL-03 | **Zona horaria no explícita:** formulario y rango móvil usan `DateTime.now()` del dispositivo; el repositorio no consulta `/api/reminders/timezone`. Riesgo inferido: día/horario interpretado de forma distinta al sistema. | Probar dispositivo y servidor en zonas distintas, cerca del cambio de día; mostrar la zona que rige el horario y conservar la fecha al editar. |
| CAL-04 | **Detalle de tarea con copia local:** `TaskDetailSheet` toma `_task` al abrirse; crear una subtarea invalida listas, pero no reemplaza esa copia ni cierra la hoja. Riesgo inferido: la nueva subtarea no aparece hasta reabrir. | Crear una subtarea con el detalle abierto y verla inmediatamente; revisar también metadatos tras editar texto. |
| CAL-05 | **Refresco al volver incompleto:** `refreshAll()` de `live_refresher.dart` no invalida notas ni próximas ocurrencias, aunque sí los avisos recibidos. Confirmado en código; el síntoma depende de la vida del provider. | Cambiar datos en web con la app en segundo plano y volver a cada pantalla; recargar sin perder una edición local pendiente. |

Fuentes adicionales: [refresco móvil](../lib/features/shell/live_refresher.dart), [rango de recordatorios](../lib/features/reminders/reminders_providers.dart), [detalle de tarea](../lib/features/tasks/task_detail_sheet.dart).

## Dependencias de datos y API

Antes de agregar controles, completar los contratos necesarios. Tener una ruta REST no significa que la app ya la consuma ni que se haya validado su flujo con Bearer.

| Necesidad | Situación actual | Trabajo necesario |
|---|---|---|
| Mis proyectos y filtros | Los modelos ya conservan `createdById`, `sectorIds` e IDs de etiquetas/grupos. | Mis proyectos y filtro por ID de grupo implementados; faltan controles de filtros avanzados de PRO-01. |
| Editar proyecto | `WorksRepository.update` y `setArchived` ya existen. | Conectar UI, permisos, errores e invalidaciones. Agregar borrado, etapas y etiquetas al repositorio. |
| Detalle y permisos | `WorkDetail` descarta, entre otros, IDs de grupo/etapa, documento, adjuntos y `canManageClients`. | Incorporar campos o modelos dedicados. No inferir permisos de clientes a partir de `canOperate`. La web calcula gestión de objetivos desde acceso/estado/tipo; no hay que inventar un campo obligatorio nuevo en la API. |
| Drawer y sectores | Ámbito estructurado, colores, IDs y contadores conservados. | Usados por el drawer; disponibles para las siguientes entregas de agrupación/acciones. |
| Grupos, objetivos, catálogos, tablero, archivos y administración | Existen rutas web; faltan repositorios/proveedores/rutas móviles para los flujos completos. | Agregarlos por módulo, manteniendo el patrón pantalla → provider → repositorio → API. |
| Recordatorios avanzados | `ReminderInput` ya representa ámbitos, enlaces, recurrencia y avisos. | Exponer controles sin borrar valores al editar y sumar consulta de zona horaria. |
| Notas/documentos | La app protege el contenido enriquecido bloqueando su edición. | Renderer/editor compatible con el documento persistido; no convertirlo a texto plano al guardar. |
| OAuth y archivos | Algunos flujos web usan cookies, redirecciones y navegador. | Validar autenticación, callback y retorno móvil por flujo; probar subida/descarga con permisos reales. |

Referencias: [modelos de proyecto](../lib/data/models/work.dart), [etiquetas móviles](../lib/data/models/common.dart), [API de proyectos](../../src/app/api/works/route.ts), [API de detalle](../../src/app/api/works/[id]/route.ts), [contrato móvil](api-contract.md).

Estos cambios exceden la capa visual de fase 3 y corresponden a la ampliación funcional. La auditoría solo los registra: no modifica modelos, permisos ni lógica de negocio.

## Roles fuera del alcance móvil actual

La planificación limita la app a **SUPERADMIN y MEMBER**. Por eso estas diferencias se registran aparte y no como fallas accidentales:

- **CLIENT:** falta el [portal de clientes](../../src/app/portal/works/[id]/page.tsx), con proyectos autorizados, tareas, documentos y actividad en consulta. La web excluye archivos del portal deliberadamente.
- **READER:** falta acceso como lector y la [vista TV](../../src/app/tv/page.tsx). La vista general para usuarios internos sí está incluida en DIA-03; copiar el modo de pantalla de TV al teléfono es una decisión distinta.

Si «todas las opciones» incluye también estos públicos, habrá que ampliar explícitamente el alcance de roles y autenticación, además de construir pantallas. No alcanza con mostrar nuevas opciones en el drawer.

## Mejoras móviles que no son brechas de paridad web

- Push nativo de recordatorios FCM/APNs.
- Caché para consultar sin conexión.
- Universal Links/App Links hacia proyectos y otros recursos.
- Cámara, galería y compartir del sistema como extensiones de los archivos.
- Gestión de dispositivos/sesiones móviles desde la cuenta.
- Validación nativa de iOS, recorrido con VoiceOver/TalkBack y preparación de distribución/firma.

Se mantienen en las fases 4/5 del plan. No se suman al faltante web como si ya existiera un equivalente idéntico.

## Orden de implementación recomendado

1. **Cerrar diferencias cotidianas — implementado:** CAL-01–05, con casos de regresión para permisos, subtareas, zona horaria y reanudación. Ver entrega arriba.
2. **Drawer de Proyectos/Sectores — implementado:** NAV-01 y destinos actuales de NAV-02, datos de propiedad/ámbito, filtros Mis proyectos/Favoritos/Archivados. Plantillas se incorpora con su pantalla en el punto 6.
3. **Completar acciones básicas de proyectos y sectores:** PRO-03/04, SEC-01/02 y permisos de referencias. Aprovechar los métodos existentes.
4. **Agregar Grupos:** GRP-01–03 y NAV-03; deja disponibles los ámbitos necesarios para otros formularios.
5. **Agregar Vista de tareas y terminar Mi día — implementado:** DIA-02/03 y NAV-04/06.
6. **Objetivos, plantillas y organización de tareas — implementado:** OBJ-01–03, TAR-01–05. Aquí se completa el destino Plantillas del drawer.
7. **Documentos, notas enriquecidas y archivos:** DOC y ARC; priorizar lectura fiel antes de habilitar edición.
8. **Recordatorios avanzados — implementado:** REC-01–03; la corrección de zona horaria se atiende desde el primer paso.
9. **Configuración y administración por módulos:** CFG/ADM y NAV-05; probar roles e integraciones por separado.
10. **QA conjunto web/app y plataformas — web/Android y matriz de roles verificados; cierre pendiente de iOS, nube real y gestos de lector de pantalla:** verificar que cada mutación se refleje en ambas, regreso de segundo plano, errores, permisos, Android/iOS y accesibilidad.

**Criterio de cierre por entrega:** opción navegable, acciones reales persistidas, permisos correctos, carga/vacío/error/reintento, cambios visibles en web y app, y comprobaciones adecuadas al cambio. La paridad funcional no exige reproducir exactamente la disposición de escritorio.

## Entrega del punto 7 — DOC-01–03 / ARC-01–02 (2026-10-09)

Implementados en móvil: documentación del proyecto, notas TipTap sin aplanar,
barra de formato/tablas/listas/enlaces, autoguardado serial con retry, imágenes
por API y Markdown por selector nativo. El formato se comparte con la web y se
protege el contenido desconocido. Archivos: habilitación, carpetas, transferencias
con progreso/cancelación, apertura nativa, renombrar/borrar, accesos compartidos
por enlace/usuario, vencimiento/contraseña, copiar y revocar según proveedor.

144 tests Flutter, análisis limpio y prueba de TipTap en Chromium. Android:
import/export Markdown real, formato, guardado/reapertura y habilitación de
carpeta. El servidor dejó la carpeta en preparación; archivos/compartidos se
validaron con HTTP simulado, no con una nube operativa. Falta QA nativo de iOS.
Evidencia en `.context/documents07/` y contrato en `api-contract.md`.

## Entrega del punto 8 — REC-01–03 (2026-10-09)

Implementados calendario mensual y alta por día, alcance según rol/pertenencia,
vínculos a proyecto/sector, repetición semanal múltiple/cada N unidades,
finalización y múltiples avisos. Se conserva REC-04 del punto 1. Los alcances
existentes no se cambian al editar; vínculos a tareas o recursos fuera del
catálogo se mantienen salvo cambio explícito. Errores conservan el borrador,
salir con cambios y borrar requieren confirmación.

160 tests Flutter, 16 nuevos; análisis limpio. Casos de fin de año/bisiesto,
permisos, preservación de campos, validación, error/reintento y protección al
salir. Claro/oscuro a 360dp y texto 150%. Android verificado contra el servidor:
crear desde enero 2027, dos avisos, cada tres meses, límite de cuatro y vínculo
a proyecto; editar a lunes/miércoles/viernes, reabrir y borrar el dato temporal.
La app queda abierta en el calendario. Falta QA nativo de iOS y recorrido de
roles en dispositivos separados; no se modifica la infraestructura de entrega.


## Punto 10 — QA transversal (2026-10-09)

Recorridos reales de sincronización web/Android, reanudación y eliminación remota,
con pruebas HTTP autenticadas por cookie y Bearer. Se corrigieron refresco del
proyecto de origen al mover tareas, archivos/compartidos al reanudar, recuperación
SSE, rol visible desactualizado y acciones antiguas tras 401/403/404.

197 tests Flutter y 1.412 tests del servidor; Dart/TypeScript limpios. Texto 150%
en Android y guías automáticas de accesibilidad. Quedan iOS, nube real y recorridos
manuales completos por rol/lector de pantalla. El punto no se considera cerrado.
Ver [matriz y evidencias](qa-cross-platform.md).

Segunda pasada: matriz de roles MEMBER/SUPERADMIN sobre grupos y sectores en
Android, API y web, y árbol de accesibilidad de todas las pantallas principales.
Se corrigieron un hueco de seguridad del servidor (crear tareas en proyectos y
sectores ajenos por id), la degradación del dueño de un grupo, el 500 al borrar
grupos con tareas, el selector de grupo al crear proyectos, los controles web de
grupo/sector que el servidor rechaza, la fecha de Mi día y lecturas de TalkBack.
205 tests Flutter y 1.422 del servidor. Siguen pendientes iOS, nube real y el
recorrido por gestos de TalkBack/VoiceOver en dispositivo físico.
