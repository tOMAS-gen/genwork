# QA conjunto web/app — punto 10

Fecha: 2026-10-09. Entorno local del workspace `paris`.

**Estado:** recorridos seleccionados de web/Android y regresiones automatizadas
verificados. El cierre multiplataforma sigue pendiente de iOS y proveedores
externos configurados. Esta entrega no certifica todas las combinaciones de
roles, recursos, lectores de pantalla ni integraciones en producción.

## Correcciones encontradas

| Problema | Corrección | Regresión |
|---|---|---|
| Una tarea movida podía quedar en el detalle del proyecto de origen. El evento solo identifica el destino. | Invalidar los detalles observados de proyectos al recibir cambios de tareas. | Origen y destino recargan con el mismo evento. |
| Las carpetas y los compartidos quedaban antiguos al reanudar la app. | Refrescar ambos proveedores junto con el resto de los recursos. | Reanudación y reconexión consultan archivos y compartidos. |
| Una reconexión SSE no recuperaba cambios perdidos y un evento con forma inválida podía cortar el stream. | Resincronizar al conectar, ignorar mensajes malformados, detectar falta de heartbeat y cancelar la conexión al abandonar la sesión. | Reconexión real del cliente contra HTTP simulado y mensajes inválidos seguidos de uno válido. |
| El rol visible quedaba guardado desde el inicio de sesión. | Revalidar `/api/me` al entrar, reanudar y en la consulta periódica; persistir solo cambios y descartar respuestas de sesiones anteriores. | Cambio de rol, red caída y respuesta tardía tras cerrar sesión. |
| Un 404 después de borrar desde web dejaba tareas y controles antiguos en pantalla. | Ante 401/403/404, la vista compartida muestra el error aunque exista un valor anterior. Ante 503 conserva el árbol y el borrador. | Cuatro casos con datos previos y texto sin guardar. |

## Verificación ejecutada

| Área | Evidencia / alcance |
|---|---|
| Android ↔ web | Proyecto creado desde la UI web, tarea creada en Android y visible en web sin recargar; completada desde web; segunda tarea creada en web y visible en Android con progreso 1/2. Se comprobó regreso desde segundo plano. |
| Eliminación remota | Borrado confirmado del proyecto temporal desde web; la app muestra el error y retira los controles. |
| API con autenticación real | Sesión cookie web y sesión móvil emitida por código/PKCE del entorno DEV_AUTH. Misma identidad; escrituras cruzadas en proyecto, objetivo, tarea, Mi día, documento TipTap, nota, recurrencia/avisos, etiquetas y archivo/restauración de proyecto. |
| Permisos del servidor | MEMBER recibe 403 en seis módulos de administración; no puede leer/modificar un proyecto privado ajeno ni leer una nota ajena; no puede editar un recordatorio ajeno. Token revocado: 401. |
| Permisos de interfaz | Suite de widgets con SUPERADMIN/MEMBER, ámbitos de grupo/sector, controles de solo lectura y rutas administrativas. El recorrido manual del emulador usó el administrador de prueba. |
| Fallos y borradores | Tests de errores de guardado, reintento, permisos, recurso eliminado, red caída y reanudación. Las pruebas de pérdida/reconexión SSE usan HTTP simulado; no se certifica una caída física de red del teléfono. |
| Accesibilidad | Guías automáticas de nombres y objetivos táctiles Android en configuración, catálogos, usuarios y MCP, a 360 dp y texto 150%, claro/oscuro. Suite previa de contraste y escalado. Texto 150% inspeccionado en Android sin overflow. TalkBack se activó en el dispositivo; el recorrido completo con feedback hablado queda pendiente. |
| iOS | No ejecutado: solo Command Line Tools, sin Xcode/simctl disponible. |
| Google/Nextcloud | OAuth y contratos simulados cubiertos por tests anteriores. Sin proveedor operativo en este entorno: no se valida autorización real, transferencias ni compartidos contra nube. |

Resultados: **197 tests Flutter**, **1.412 tests del servidor en 147 archivos**,
`dart analyze` y TypeScript sin errores, `git diff --check` limpio y APK debug.

Los recursos funcionales QA10 se eliminaron; las sesiones móviles de prueba se
revocaron. Se conservaron datos preexistentes y la nota QA07. El tamaño de texto
y el servicio de accesibilidad del emulador se restauraron. No se cambiaron
roles existentes, acceso, almacenamiento, zona horaria ni cuentas externas.

## Reproducción y evidencias

- `flutter test` desde `mobile/`; pruebas nuevas en
  `test/features/cross_platform_sync_test.dart`,
  `test/features/accessibility_audit_test.dart`,
  `test/core/session_refresh_test.dart` y `test/core/async_value_view_test.dart`.
- `dart analyze` desde `mobile/`, `npx vitest run` y `npx tsc --noEmit` desde la raíz.
- Capturas, registro HTTP cruzado, limpieza y logs: `.context/qa10/` (gitignored).
- Android y servidor local quedan abiertos para revisión.

## Segunda pasada: roles y lector de pantalla (2026-10-09)

Dataset temporal QA10B: un grupo por caso (ADMIN, MEMBER, lectura pública sin
pertenencia, privado), sectores de cada grupo, dos globales, uno con
SectorGrant, y personales propio/ajeno. Se recorrió en Android como `miembro`
y como `admin`, se cruzó con la API y con la web (Playwright). Al final se
eliminó todo y se restauró la sesión de admin.

### Matriz verificada (MEMBER)

| Caso | Servidor | App Android | Web |
|---|---|---|---|
| Grupo donde es ADMIN | administra grupo, miembros, clientes, etiquetas | menú editar/borrar, agregar/cambiar rol/quitar (nunca al dueño), clientes, etiquetas; lectura pública activada y revertida desde la app y persistida | igual tras la corrección |
| Grupo donde es MEMBER | lee y opera proyectos; no administra | sin administración; proyecto operable | igual tras la corrección |
| Grupo con lectura pública, sin pertenencia | solo lectura; crear proyecto/tareas 403 | sin administración, sin compositor, casillas desactivadas; no se ofrece al crear proyecto | igual tras la corrección |
| Grupo privado ajeno | invisible / 404 | no aparece | "Grupo no disponible" |
| Sector de grupo propio / global / personal propio | opera | opera; sin renombrar/borrar (solo SA) | sin renombrar/color/borrar (solo SA) |
| Sector de grupo público | lectura | lectura | lectura |
| Sector de grupo privado / personal ajeno | 404 | no aparece | — |

### Correcciones de esta pasada

| Problema | Corrección | Regresión |
|---|---|---|
| **Seguridad:** `POST /api/tasks` no comprobaba acceso. Un MEMBER creaba tareas en proyectos y sectores ajenos —también subtareas bajo tareas ajenas— con solo el id (201 verificado por API, también con Bearer). | `saveTask` exige operar el proyecto/sector de contexto al crear: 404 sin acceso, 403 solo lectura, 409 archivado. Cubre web, app y MCP. | `task-create-access.test.ts`; reverificado en vivo: 404/403. |
| Un ADMIN de grupo podía degradar al administrador principal con el alta de miembros (el DELETE ya lo impedía). | 403 si el destino es el dueño y el rol no es ADMIN. | `group-members-owner.test.ts`. |
| Borrar un grupo con tareas devolvía 500 (`Task_statusId_fkey`: las tareas usan los estados propios del grupo, `onDelete: Restrict`). Afectaba a web y app. | Borrar antes, en la misma transacción, las tareas de proyectos y sectores del grupo. | `group-delete.test.ts`; borrado real de los cuatro grupos QA10B. |
| Crear proyecto ofrecía grupos de lectura pública donde el servidor responde 403 (web y app). | Solo grupos donde el usuario es miembro, o todos para SA (`GroupSummary.canOperate`; mismo filtro en recordatorios). | Widget por rol; web verificada como miembro y admin. |
| Web: color, visibilidad, borrar grupo, agregar/quitar miembros visibles para cualquiera; borrar/color de sector según `canOperate`; clientes/etiquetas ocultos al SA no miembro; grupo inaccesible cargando para siempre; texto de borrado decía que los proyectos quedaban sin grupo. | Mismos criterios que el servidor (`canManageGroup`, SA para sectores), estado vacío y texto de cascada correcto. | Playwright como miembro/admin sobre los cuatro grupos y un sector. |
| Mi día mostraba la fecha del teléfono; el servidor arma "completadas hoy" con la zona del sistema. Con el teléfono en UTC decía "sábado 10" cuando el sistema seguía en viernes 9. | Encabezado con el día de la zona del sistema (`myDayTodayProvider`). | Widget que falla con la versión anterior; verificado en el emulador. |
| TalkBack leía "0, 0 de 7 tareas completadas, 0/7" en cada barra de progreso. | Una sola etiqueta. | Semántica sin hijos. |
| Todas las casillas decían "Completar tarea". | Incluyen el texto de la tarea cuando son accionables; desactivadas no lo repiten. | Dos casos. |
| Contadores del drawer repetían el nombre del destino; "Vence hoy" decía "Avisos pendientes: N tareas pendientes". | Solo la cantidad, con el sustantivo correcto. | Suite de navegación. |
| Inicial del avatar leída suelta; iniciales L M X… del calendario leídas como letras; días sin día de semana; plurales "1 proyectos", "1 miembros". | Avatar e iniciales excluidos; día con día de semana; `countLabel`. | Test de `countLabel`. |
| Títulos de sección sin rol de encabezado (Mi día, sector, grupo, configuración). | `Semantics(header: true)`. | Árbol de accesibilidad en Android. |

### Lector de pantalla: qué se hizo y qué no

- Árbol de accesibilidad de Android (`uiautomator`, lo mismo que consume
  TalkBack) recorrido en Mi día, drawer, proyectos, detalle de proyecto, hoja de
  tarea, sectores, detalle de sector, grupos, detalle de grupo, recordatorios,
  calendario, notas, cuenta y configuración, como admin y como miembro. Sin
  controles sin nombre después de las correcciones.
- TalkBack activo en el emulador: el foco por exploración táctil funciona sobre
  la app. **No se pudo completar el recorrido por gestos**: los swipes
  sintéticos (`adb input` y eventos del emulador) no se reconocen como gestos de
  TalkBack y uno abrió el panel de notificaciones. Queda para una persona en
  dispositivo físico. TalkBack quedó desactivado.
- No se verifican el orden de lectura completo ni los anuncios de cambios en
  vivo con voz.

### Para revisar (no se cambiaron)

- El servidor solo emite eventos `task-changed` y `work-changed`. Las altas de
  grupos, sectores y miembros no llegan en vivo ni a la web ni a la app:
  aparecen al recargar o al volver a primer plano.
- Cualquier MEMBER puede editar los estados propios de un sector global o de
  grupo, aunque renombrar o borrar ese sector sea solo para SA. Es una decisión
  de permisos, no un error de interfaz.

Resultados: **205 tests Flutter**, **1.422 tests del servidor en 150 archivos**,
`dart analyze` y TypeScript limpios, `git diff --check` limpio y APK debug
instalado. Evidencias en `.context/qa10b/` (árboles, scripts, capturas y limpieza).

## Pendientes para cerrar el punto 10

1. iOS: compilar y recorrer login/deep links, edición, segundo plano, archivos,
   selector nativo y OAuth con Xcode/simulador o dispositivo. Sigue sin Xcode.
2. Nube configurada: autorización Google/Nextcloud, subida/descarga, imágenes
   privadas, compartidos, revocación y reintentos de trabajos.
3. Recorrido con gestos de TalkBack/VoiceOver y teclado en dispositivos físicos.
   El árbol de accesibilidad de Android ya se recorrió y corrigió.
4. ~~Matriz manual por rol de grupos y sectores~~: hecha para MEMBER y SUPERADMIN
   (ver arriba). CLIENT y READER siguen fuera del alcance móvil.
