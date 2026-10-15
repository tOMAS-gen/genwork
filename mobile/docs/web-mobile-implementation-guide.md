# Guía vigente — paridad web → Flutter (M00–M21)

## Alcance y reglas

Conservar la identidad web y mejorar su uso móvil. Incluye SUPERADMIN, MEMBER,
CLIENT y READER. Android primero, iOS después. Mantener Riverpod, go_router,
API REST, PKCE y los permisos de cada recurso. No incluye publicación en tiendas,
push ni funcionamiento sin conexión. El historial DS/UI/P se conserva en PLAN.md.

Esta guía reemplaza para Mxx las restricciones históricas de solo presentación y
una tarea por sesión. No cambia la arquitectura ni autoriza ampliar los permisos
web. ValueKeys existentes se conservan; cada control nuevo lleva una clave.

## Entorno reproducible

Desde la raíz, en terminales separadas:

```sh
bash scripts/mobile-dev.sh setup
bash scripts/mobile-dev.sh web
bash scripts/mobile-dev.sh android
node scripts/mobile-inventory.mjs
node scripts/mobile-check.mjs
node scripts/mobile-evidence.mjs
```

Web y app usan `http://localhost:${CONDUCTOR_PORT:-3010}` gracias a adb reverse.
La DB es `genwork_mobile_parity` en PostgreSQL local 5433. El seed rechaza otros
hosts/nombres de base y solo crea fixtures faltantes. Usa db push únicamente en
esta base QA; no aplica/reseteea migraciones sobre la base habitual. Nextcloud
es local (8081). La salida Next queda en `.context/mobile-parity/next`.
El modo Conductor continúa nonconcurrent por el Docker compartido. Flutter usa
los puertos de depuración base+1/base+2; su URL queda en vmservice.json.
Para cambiar de usuario de prueba, cerrá sesión en la app y también en el
navegador del dispositivo (`/api/auth/signout`) antes de volver a ingresar.

No imprimir tokens, cookies ni contraseñas. Las evidencias son locales y no
versionadas; los archivos con tokens de QA deben tener permisos 0600 y las
sesiones temporales deben revocarse al terminar sus pruebas.

## Cómo cerrar una tarea

Estados de seguimiento: Pendiente → En curso → Verificada en Android → Verificada
en iOS. Un bloqueo externo se registra como Bloqueada con motivo y siguiente paso.
La columna Implementación y los checks funcionales no equivalen a verificación manual de todos los casos. Los checks pendientes identifican QA o trabajo todavía no certificado.

Cada sector recorre: referencia web con datos reales → app del mismo rol/recurso
→ acciones y permisos → carga/vacío/error/reintento → contraste claro/oscuro →
360/390/430 dp, texto 150%, teclado y horizontal → pruebas → capturas y resultado.
No alterar tests de contraste ni relajar permisos para cerrar tareas.

Por captura usar `Mxx-recurso-rol-tema-ancho-web.png` y su pareja `-android.png`
o `-ios.png`. El comparador generado advierte sobre imágenes sin pareja. Cada
cierre debe registrar fecha, dispositivo, tests y pendientes, además de imágenes.

## Matriz de ejecución

| Tarea | Referencia | Implementación | Android | iOS |
|---|---|---|---|---|
| M00 Entorno de desarrollo | `Todas` | Implementado; ejecución Android en curso | En curso | Bloqueada: Xcode |
| M01 Inventario completo | `Todas` | Inventariado | Inventariado | No aplica |
| M02 Sistema visual compartido | `Todas` | Implementado; regresiones automáticas | En curso | Bloqueada: Xcode |
| M03 Navegación y acceso | `/login, /setup y drawer` | Implementado; regresiones automáticas | En curso | Bloqueada: Xcode |
| M04 Mi día y referencias | `/references → /my-day` | Existente; revisión Android pendiente | En curso | Bloqueada: Xcode |
| M05 Proyectos | `/ y sus filtros → /works` | Ampliado; regresiones automáticas | En curso | Bloqueada: Xcode |
| M06 Detalle de proyecto | `/works/[id] → /works/:id` | Ampliado; revisión Android pendiente | En curso | Bloqueada: Xcode |
| M07 Tareas y subtareas | `Proyecto, sector y detalle completo` | Existente; revisión Android pendiente | En curso | Bloqueada: Xcode |
| M08 Objetivos y plantillas | `/?filter=templates → /templates` | Existente; enlaces ampliados | En curso | Bloqueada: Xcode |
| M09 Sectores | `/sectors y /sectors/[id]` | Ampliado; revisión Android pendiente | En curso | Bloqueada: Xcode |
| M10 Vista de tareas | `/board → /board` | Existente; revisión Android pendiente | En curso | Bloqueada: Xcode |
| M11 Grupos | `/groups y /groups/[id]` | Existente; revisión Android pendiente | En curso | Bloqueada: Xcode |
| M12 Notas y documentos | `/notes, /notes/[id] y Documentos` | Existente; QA de proveedor pendiente | En curso | Bloqueada: Xcode |
| M13 Archivos | `Pestaña Archivos → /works/:id/files` | Existente; QA de proveedor pendiente | En curso | Bloqueada: Xcode |
| M14 Recordatorios | `/reminders → /more/reminders` | Existente; revisión Android pendiente | En curso | Bloqueada: Xcode |
| M15 Cuenta y configuración | `/settings → /more/settings` | Existente; QA externo pendiente | En curso | Bloqueada: Xcode |
| M16 Administración | `/admin y /admin/*` | Existente; QA externo pendiente | En curso | Bloqueada: Xcode |
| M17 Actividad y acceso de clientes | `Pestañas de /works/[id]` | Implementado; pruebas de permisos | En curso | Bloqueada: Xcode |
| M18 Portal de clientes | `/portal y /portal/works/[id]` | Implementado; API real verificada | En curso | Bloqueada: Xcode |
| M19 Lector | `/tv → /tv` | Implementado; API real verificada | En curso | Bloqueada: Xcode |
| M20 Cierre Android | `Todos los recorridos` | En curso | En curso | Bloqueada: Xcode |
| M21 Cierre iOS | `Todos los recorridos` | Bloqueada: falta Xcode completo | En curso | Bloqueada: Xcode |

## Tareas por sector y elemento

### M00 — Entorno de desarrollo

Referencia: `Todas`. Implementación: **Implementado; ejecución Android en curso**.

- [x] Iniciar PostgreSQL/Nextcloud y base genwork_mobile_parity, sin tocar la base habitual.
- [x] Seed idempotente con cuatro roles y grupos privado/público/autorizado.
- [x] Web en CONDUCTOR_PORT (3010 por defecto), compilación separada, adb reverse y Flutter con hot reload.
- [x] Login desde el navegador del dispositivo y regreso genwork://auth.
- [x] Guardar pares de capturas y generar el comparador HTML.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M01 — Inventario completo

Referencia: `Todas`. Implementación: **Inventariado**.

- [x] 28 páginas y 113 endpoints en web-route-inventory.json; regenerar con node scripts/mobile-inventory.mjs.
- [ ] Por página revisar parámetros, pestañas, formularios, menús y diálogos, además de endpoints.
- [x] Rutas sin pantalla propia (tareas, objetivos, archivos) se verifican como parte del proyecto/sector.
- [x] Auditoría anterior reconciliada: copiar código y referencias accionables ya estaban implementados.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M02 — Sistema visual compartido

Referencia: `Todas`. Implementación: **Implementado; regresiones automáticas**.

- [x] Montserrat, Roboto Mono, azul de marca y neutros desde tokens actuales.
- [x] Botones, campos, buscadores, filtros, pestañas, etiquetas, estados y progreso.
- [x] Carga, vacío, error con reintento, selección, foco, deshabilitado y confirmaciones.
- [ ] Objetivos de 48 dp, texto al 150%, safe areas, horizontal y reducción de movimiento.
- [x] Conservar drawer y detalles completos; no introducir barra inferior ni bottom sheets.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M03 — Navegación y acceso

Referencia: `/login, /setup y drawer`. Implementación: **Implementado; regresiones automáticas**.

- [x] Ingreso de SUPERADMIN, MEMBER, CLIENT y READER con PKCE y token revocable.
- [x] Internos al espacio de trabajo, clientes al portal, lectores al tablero de consulta.
- [x] El proxy valida también el rol del Bearer; una cookie interna no amplía un token cliente.
- [x] Cambio de identidad/rol recrea router y destruye ramas y borradores del recorrido anterior.
- [x] Traducir listados, filtros, módulos administrativos y anclas de objetivos desde rutas web.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M04 — Mi día y referencias

Referencia: `/references → /my-day`. Implementación: **Existente; revisión Android pendiente**.

- [ ] Día según zona horaria del sistema, pendientes, referencias y completadas.
- [ ] Deduplicación de raíces/subtareas, progreso por hojas y referencias identificadas.
- [ ] Completar/reabrir, Mi día, abrir detalle y navegar al origen según permisos.
- [ ] Refresco manual, SSE y reanudación sin perder borradores.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M05 — Proyectos

Referencia: `/ y sus filtros → /works`. Implementación: **Ampliado; regresiones automáticas**.

- [x] Todos, propios, favoritos y archivados; alta y acceso al detalle.
- [x] Búsqueda por nombre/descripción/grupo y filtro rápido de un grupo.
- [x] Filtros combinados por varios grupos, sector, valor de etiqueta y avance.
- [x] Orden por recientes/favoritos, nombre español o mayor avance; limpiar/aplicar/cancelar. Estadísticas compactas, con columnas según ancho y escala de texto.
- [x] Resumen de resultados y estadísticas calculadas sobre el mismo conjunto visible.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M06 — Detalle de proyecto

Referencia: `/works/[id] → /works/:id`. Implementación: **Ampliado; revisión Android pendiente**.

- [x] Nombre, grupo, estado, descripción, avance, vencimiento, etapa, etiquetas y código.
- [x] Descripción larga limitada a tres líneas, con Ver descripción completa/Mostrar menos.
- [x] Editar, copiar código, archivar/restaurar y eliminar con confirmación exacta.
- [x] Accesos a Tareas, Documentos, Archivos, Actividad y Acceso cliente según permisos.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M07 — Tareas y subtareas

Referencia: `Proyecto, sector y detalle completo`. Implementación: **Existente; revisión Android pendiente**.

- [ ] Lista/tablero; contenedores con estado derivado de subtareas.
- [ ] Creación por líneas, sintaxis y autocompletado contextual, descripción y reintento sin duplicar.
- [ ] Estados, Mi día, fechas efectivas, etiquetas, referencias y enlaces al origen.
- [ ] Crear, editar, mover, separar, ordenar, completar, reabrir y eliminar según contexto.
- [ ] Detalle conserva borradores; historial y cambios remotos refrescan datos.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M08 — Objetivos y plantillas

Referencia: `/?filter=templates → /templates`. Implementación: **Existente; enlaces ampliados**.

- [ ] Crear/editar/ordenar/plegar objetivos y sus descripciones.
- [ ] Eliminar conservando o eliminando tareas; mover tareas entre secciones.
- [ ] Guardar objetivo como plantilla, aplicar plantilla y crear proyecto desde plantilla.
- [x] Enlace #objetivo-ID traduce a objectiveId y revela la sección correspondiente.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M09 — Sectores

Referencia: `/sectors y /sectors/[id]`. Implementación: **Ampliado; revisión Android pendiente**.

- [ ] Listado con búsqueda, ámbito, orden, agrupación y avance.
- [ ] Alta y edición de nombre/color/borrado según permisos.
- [x] Tareas sueltas, por proyecto y referencias agrupadas por origen navegable.
- [ ] Lista/tablero, pendientes/hechas/todas y creación contextual.
- [x] Acceso directo a Estados del sector; conjunto heredado/propio y permiso canWrite del servidor.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M10 — Vista de tareas

Referencia: `/board → /board`. Implementación: **Existente; revisión Android pendiente**.

- [ ] Sectores visibles con progreso, pendientes, estado y contexto.
- [ ] Contadores sin duplicación y progreso por hojas.
- [ ] Abrir sector desde el espacio interno; lector tiene una variante de consulta.
- [ ] Carga/vacío/error, refresco y cambios remotos.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M11 — Grupos

Referencia: `/groups y /groups/[id]`. Implementación: **Existente; revisión Android pendiente**.

- [ ] Listado/detalle, nombre/color/lectura pública y eliminación.
- [ ] Proyectos, sectores y navegación con búsqueda y estado conservados.
- [ ] Buscar/agregar/quitar miembros, administrar roles y proteger al propietario.
- [ ] Clientes con proyectos autorizados y etiquetas/valores/colores del grupo.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M12 — Notas y documentos

Referencia: `/notes, /notes/[id] y Documentos`. Implementación: **Existente; QA de proveedor pendiente**.

- [ ] Lista, alta, edición, borrado y documento del proyecto.
- [ ] Editor TipTap con formato, enlaces, listas, tablas y tareas.
- [ ] Autoguardado, estado/reintento, borrador y salida sin pérdida.
- [ ] Importar/exportar Markdown, imágenes y teclado en pantalla chica.
- [ ] Documento del portal usa el mismo lector con edición deshabilitada.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M13 — Archivos

Referencia: `Pestaña Archivos → /works/:id/files`. Implementación: **Existente; QA de proveedor pendiente**.

- [ ] Habilitar carpeta y navegar carpetas/subcarpetas.
- [ ] Subir con progreso/cancelación, descargar y abrir con el sistema.
- [ ] Crear carpeta, renombrar, eliminar y confirmar impacto.
- [ ] Compartir por enlace/usuario y revocar según capacidades del proveedor.
- [ ] Reautenticación, error, reintento y refresco tras cambios.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M14 — Recordatorios

Referencia: `/reminders → /more/reminders`. Implementación: **Existente; revisión Android pendiente**.

- [ ] Calendario mensual, navegación de fecha y próximas ocurrencias.
- [ ] Alta/edición/borrado, ámbitos y enlace a proyecto/sector.
- [ ] Recurrencias, cada N, varios días, fin por fecha/cantidad y avisos anticipados.
- [ ] Zona horaria del sistema, Vence hoy, descartar y posponer.
- [ ] Reanudación y consulta periódica de avisos.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M15 — Cuenta y configuración

Referencia: `/settings → /more/settings`. Implementación: **Existente; QA externo pendiente**.

- [ ] Perfil, servidor, versión, tema claro/oscuro/sistema persistido y cierre de sesión.
- [ ] Vincular/desvincular Nextcloud y regreso del flujo nativo.
- [ ] Conexiones MCP propias: alta, clave una vez, revocación y actividad.
- [ ] Clientes/lectores tienen cuenta, tema y cierre de sesión sin módulos internos.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M16 — Administración

Referencia: `/admin y /admin/*`. Implementación: **Existente; QA externo pendiente**.

- [ ] Inicio y módulos: acceso, correos permitidos, usuarios y clientes.
- [ ] Etiquetas/valores/colores, etapas y estados por ámbito.
- [ ] Almacenamiento: proveedor, credenciales, OAuth, carpeta raíz, prueba y trabajos/reintentos.
- [ ] Recordatorios del sistema: zona horaria y Gmail.
- [ ] Errores: filtro, detalle, resolver/reabrir. MCP: conexiones propias y actividad.
- [ ] Conservar borradores/secretos existentes ante errores y ocultar controles sin permiso.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M17 — Actividad y acceso de clientes

Referencia: `Pestañas de /works/[id]`. Implementación: **Implementado; pruebas de permisos**.

- [x] Actividad MCP del proyecto, fecha/hora y vacío/error/reintento.
- [x] No presentarla como historial general de todas las acciones.
- [x] Acceso cliente condicionado a canManageClients, independiente de canOperate.
- [x] Agregar por correo/nombre, estado Invitado/Activo y revocar con confirmación.
- [x] Enlace a Clientes del grupo y formularios que conservan datos ante errores.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M18 — Portal de clientes

Referencia: `/portal y /portal/works/[id]`. Implementación: **Implementado; API real verificada**.

- [x] Lista de proyectos otorgados, resumen, etapa, etiquetas, vencimiento y progreso.
- [x] Detalle con objetivos, tareas, subtareas, descripción y documento en consulta.
- [x] Actividad de estados paginada, sin autor interno, y stream /api/portal/stream.
- [x] Sin código/carpeta, grupo interno, adjuntos, archivos ni acciones de escritura.
- [x] Proyecto ajeno/archivado/plantilla responde 404; rutas internas responden 403.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M19 — Lector

Referencia: `/tv → /tv`. Implementación: **Implementado; API real verificada**.

- [x] Login lector y tablero adaptado al teléfono.
- [x] Misma visibilidad por ReaderGrant/lectura pública que la web.
- [x] Sin navegación al editor de sector ni controles de escritura.
- [x] Cuenta, tema, cierre de sesión, SSE y refresco al reanudar.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M20 — Cierre Android

Referencia: `Todos los recorridos`. Implementación: **En curso**.

- [ ] Suite Flutter, análisis Dart y backend aprobados; TypeScript/ESLint.
- [ ] Recorrido real web/app por cuatro roles con capturas emparejadas.
- [ ] Probar escritura en ambas direcciones, SSE, reanudación y recurso eliminado.
- [ ] Anchos 360/390/430, texto 150%, teclado y orientación horizontal.
- [ ] Nube operativa y gestos TalkBack en dispositivo físico antes de certificar cierre.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

### M21 — Cierre iOS

Referencia: `Todos los recorridos`. Implementación: **Bloqueada: falta Xcode completo**.

- [ ] Instalar/seleccionar Xcode completo y disponer de simulador o iPhone.
- [ ] Compilar y comprobar PKCE, callback y permisos por rol.
- [ ] Recorrer edición, teclado, segundo plano, selectores, archivos y OAuth.
- [ ] Comparar temas/ancho/texto y recorrer VoiceOver en dispositivo físico.
- [ ] Guardar evidencias; no reemplazar ejecución nativa por tests de widgets.

Cierre: registrar evidencia y resultado de cada punto; no marcar por inferencia.

## Interfaces y datos

- Auth móvil admite los cuatro roles conocidos. El proxy valida Bearer y límites
  de cliente aun con cookie. Los guards siguen autorizando cada recurso.
- CLIENT usa modelos/repositorio/providers de portal y `/api/portal/*`; el shell
  interno no se monta. READER usa tablero de consulta. La identidad/rol recrea
  router y repositorios dependientes; no reutilizar datos del usuario anterior.
- WorkDetail conserva `canManageClients`; actividad y grants usan endpoints web
  existentes. Los estados de sector abren el catálogo con `scope=sector:ID`.
- SSE del portal tiene endpoint separado y reconexión; reanudar recarga los datos.
  La revocación de grants en una conexión existente conserva el límite temporal
  actual del backend web; no se promete revocación instantánea del stream.
- `Routes.fromWebPath` traduce URLs relativas, filtros y objetivos. No registra
  Universal Links/App Links nuevos ni abre orígenes arbitrarios.

## Verificación y bloqueos

Línea de base: análisis sin issues y 321 tests Flutter. Los resultados de esta
entrega se agregan abajo al completar la ejecución.

Bloqueos externos: Xcode/simctl ausente; no se certifica ejecución iOS. Google
Drive/Gmail requieren cuentas configuradas; nube y lectores de pantalla requieren
recorrido real. No se marca la adaptación completa hasta cerrar M20/M21.

## Evidencia de ejecución de esta entrega

- Entorno web activo en localhost:55100 (puerto de Conductor); PostgreSQL/Nextcloud
  locales. Android conectado mediante adb reverse. Fixtures idempotentes preparados.
- Inventario regenerado: 28 páginas y 113 endpoints, todos clasificados.
- Suite backend: 1.435 pruebas aprobadas en 151 archivos. TypeScript y ESLint limpios.
- Suite Flutter: **345 pruebas aprobadas**; incluye regresiones
  de apertura de objetivo plegado y retirada de datos del tablero tras 403. Análisis Dart sin issues.
- Pruebas nuevas: roles, retirada de datos tras 404, cambio de rol, portal sin
  consultas internas, paginación/SSE, filtros combinados, anchos 360/390/430 y
  texto 150%, horizontal. Se corrigió el desborde de LoadingView en altura reducida.
- Comprobación HTTP reproducible (`node scripts/mobile-check.mjs`): cuatro logins
  PKCE, código reutilizado rechazado, token revocado 401, cliente limitado al portal,
  recurso ajeno 404, lector sin creación de tareas, actividad/grants para admin.
- Recorrido Android en emulador: Mi día, proyectos, detalle, actividad, sectores,
  grupos, tablero, notas, calendario y configuración; capturas claro/oscuro en
  `.context/mobile-parity/`. Login cliente/lector y consulta del portal/tablero comprobados. APK debug final compilado e instalado; web y Flutter con hot reload quedan activos.
- Android de referencia: 390 dp de ancho (1170 px a densidad 480), API 37. Las
  capturas web usan el mismo ancho lógico; el área útil difiere por barras nativas.
- Detector de diseño: sin hallazgos. No se certifica todavía el recorrido de
  cada mutación, proveedores reales, gestos TalkBack/VoiceOver ni iOS.
- Intento iOS: `flutter build ios --simulator --debug --no-pub` falla con
  “Application not configured for iOS”; no hay Xcode/simctl en esta máquina.

El próximo cierre requerido es M20: mutaciones completas en dispositivo, nube y lectores de pantalla; M21 requiere Xcode. Las tareas implementadas mantienen su QA pendiente explícito.
