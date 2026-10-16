# genwork móvil — planificación (feature 064)

## Plan vigente — paridad completa M00–M21

Guía ejecutable y estado por sector:
[`docs/web-mobile-implementation-guide.md`](docs/web-mobile-implementation-guide.md).
Incluye entorno aislado, inventario de todas las URL, tareas por elemento,
roles SUPERADMIN/MEMBER/CLIENT/READER y evidencias Android/iOS.

Las secciones siguientes se conservan como historial. La limitación antigua a
roles internos y a cambios de presentación queda reemplazada por el alcance
M00–M21 autorizado. Una entrega histórica aprobada no certifica el QA nuevo.


App Flutter (Android + iOS) para usar genwork sin el navegador. Nativa, consume la
API REST existente con un token Bearer propio de la app.

Reparto del trabajo:

- **Claude**: backend de auth móvil + núcleo estructural de la app (datos, estado,
  navegación, pantallas funcionales con widgets simples). **Hecho** (fases 1 y 2).
- **Codex**: capa visual (fase 3) implementada y verificada en tests/Android.
  Pendiente la validación en iOS. Reglas en [`AGENTS.md`](AGENTS.md).
- Fases 4 y 5: funcionalidad que sigue y salida a tiendas.

---

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Tipo de app | Nativa Flutter + API REST | UI nativa; administración por módulos incorporada en el punto 9 |
| Ubicación | `mobile/` en este repo (monorepo) | Un cambio de API y su uso en la app van en el mismo PR |
| Primer inicio | El usuario escanea el QR de la web (**Configuración › App móvil**) o escribe la URL → se valida con `GET /api/auth/mobile/info` → se guarda como perfil de servidor → se abre directo el login del navegador (no hay pantalla de login nativa; cancelado o fallido, queda «Sin sesión» en la lista). Varios servidores: drawer › «Cambiar de servidor» o **Mi cuenta › Servidores** (estado de sesión de cada uno, cambiar, agregar, quitar), sesión propia por servidor | La app no tiene la URL fija (sirve para cualquier instalación de genwork) |
| Login | Navegador del sistema → login web existente (Google + lista de acceso) → deep link `genwork://auth?code=…` → canje PKCE por token | Reusa el OAuth web: no hacen falta client IDs de Google para iOS/Android, y vale igual la allowlist |
| Token | `genwork_mob_…` de larga vida, revocable. Solo se guarda su hash (`MobileSession`) | Mismo patrón que los tokens MCP |
| Roles | Solo SUPERADMIN y MEMBER. CLIENT (portal) y READER (TV) quedan afuera | Se chequea al emitir y en cada request |
| Estado / rutas | Riverpod 3 (sin codegen) + go_router 17 | Estándar, sin build_runner para que los agentes lo toquen fácil |
| HTTP | dio + `ApiException` con el contrato `{error:{code,message}}` | |
| Tiempo real | SSE `/api/stream` con Bearer → invalida providers. Al volver a primer plano refresca tareas, proyectos, sectores, avisos, notas y próximas ocurrencias | CAL-05 implementado; los borradores locales se conservan |
| Modelos | Clases Dart escritas a mano (`fromJson`), un `Task` único para todas las variantes del contrato | Menos ceremonia; campos ausentes quedan null |
| Notas/documentos | TipTap local en WebView, mismo esquema web; guardado JSON por API nativa | Conservar formato y contenido; punto 7 |
| Alcance inicial | Mi día, proyectos, tareas, sectores, notas, recordatorios | Base disponible para avanzar hacia la paridad con la web |
| Navegación (actualizada por pedido del usuario) | Drawer lateral como la web, sin barra inferior | Incorporar todas las opciones progresivamente; ver pasos de paridad |

---

## Fase 1 — Backend: auth móvil ✅ (Claude)

| # | Tarea | Archivos |
|---|---|---|
| B1 ✅ | Modelos `MobileSession` y `MobileAuthCode` + migración aditiva | `prisma/schema.prisma`, `prisma/migrations/20261009120000_add_mobile_sessions` |
| B2 ✅ | Lógica: PKCE S256, códigos de un solo uso (2 min), tokens, roles | `src/server/mobile-auth.ts` |
| B3 ✅ | `requireSession` acepta `Authorization: Bearer genwork_mob_…` (todas las rutas existentes funcionan sin tocarlas) | `src/server/auth.ts` |
| B4 ✅ | Proxy deja pasar el Bearer móvil a `/api/*` | `src/proxy.ts` |
| B5 ✅ | Endpoints `GET /api/auth/mobile/info`, `GET /api/auth/mobile/start`, `POST /api/auth/mobile/token`, `POST /api/auth/mobile/logout` | `src/app/api/auth/mobile/*` |
| B6 ✅ | Login web respeta `callbackUrl` (solo rutas relativas) | `src/app/login/page.tsx` |
| B7 ✅ | `/api/me` devuelve también nombre, correo e imagen | `src/app/api/me/route.ts` |
| B8 ✅ | Tests (17) | `src/server/__tests__/mobile-auth.test.ts` |

Verificado de punta a punta contra un servidor dev: start sin sesión → login →
código → canje → API con Bearer (me, my-day, works, sectors, notes, deliveries,
crear proyecto y tarea) → SSE recibe `task-changed` → replay del código rechazado →
token inválido 401 → logout revoca → Lector recibe `error=forbidden`.

## Fase 2 — Núcleo Flutter ✅ (Claude)

| # | Tarea | Archivos |
|---|---|---|
| F1 ✅ | Proyecto Flutter, dependencias, `genwork://` en Android, nombre de app, ATS/cleartext solo para dev | `pubspec.yaml`, `android/…/AndroidManifest.xml`, `ios/Runner/Info.plist` |
| F2 ✅ | URL del sistema: normalización + persistencia | `lib/core/config/` |
| F3 ✅ | Auth: PKCE, `AuthRepository` (navegador del sistema + canje), token en Keychain/Keystore, `SessionController` | `lib/core/auth/`, `lib/data/repositories/auth_repository.dart` |
| F4 ✅ | Cliente API con Bearer, errores tipados, 401 → logout | `lib/core/network/` |
| F5 ✅ | Router con redirección por sesión (splash → setup → servidores → app; el login es del navegador) y shell con ramas independientes (ahora accesibles desde el drawer) | `lib/core/router/`, `lib/features/shell/` |
| F6 ✅ | Modelos y repositorios de todo el MVP | `lib/data/` |
| F7 ✅ | Providers por feature + `TaskActions` (mutaciones que refrescan) | `lib/features/*/…_providers.dart`, `lib/features/tasks/task_actions.dart` |
| F8 ✅ | SSE + refresco al volver a primer plano | `lib/core/live/`, `lib/features/shell/live_refresher.dart` |
| F9 ✅ | Pantallas funcionales con widgets simples: setup, login, Mi día, proyectos (lista, alta, detalle por secciones), detalle de tarea (estado, Mi día, descripción, subtareas, historial, borrar), sectores (lista, tablero con filtro), notas (lista, editor texto plano), recordatorios (notificaciones, próximas, alta/edición simple), cuenta | `lib/features/` |
| F10 ✅ | Widgets compartidos básicos | `lib/shared/widgets/` |
| F11 ✅ | Tests: URL, PKCE, redirecciones, TipTap, modelos, errores, widget de primer inicio (19) | `test/` |

## Fase 3 — UI implementada (Codex)

Cada tarea toca solo presentación. Ver reglas en `AGENTS.md`. Orden sugerido: UI-01 y
UI-02 primero (el resto los usa).

| # | Tarea | Archivos principales | Criterio de aceptación |
|---|---|---|---|
| UI-01 ✅ | **Design system**: tokens de color, espaciado, radios, tipografía y sombras como `ThemeExtension`; light/dark completos | `lib/core/theme/` | Ninguna pantalla usa colores/medidas sueltas; claro y oscuro con contraste AA |
| UI-02 ✅ | **Componentes compartidos**: rediseño de `TaskTile` (check grande, swipe → completar / Mi día), `ColorPill`, `ProgressLine`, skeletons en lugar de spinners, `EmptyView`/`ErrorView` con ilustración o ícono | `lib/shared/widgets/` | Mismas firmas públicas (o las pantallas actualizadas); `ValueKey`s intactas |
| UI-03 ✅ | **Setup y login**: marca (logo de `public/`), estados de validación/carga/error, teclado URL | `features/setup/`, `features/auth/` | Error de URL y de login visibles; botón deshabilitado mientras valida |
| UI-04 ✅ | **Shell y navegación**: drawer lateral, transiciones, app bars consistentes | `features/shell/home_shell.dart`, `core/theme/` | Las secciones mantienen su estado al cambiar |
| UI-05 ✅ | **Mi día**: cabecera con fecha, pendientes / "Te mencionan" / completadas hoy (colapsable), vacío amigable | `features/my_day/my_day_screen.dart` | Pull-to-refresh y check funcionan igual |
| UI-06 ✅ | **Proyectos (lista)**: cards con progreso, etapa, etiqueta principal, vencimiento; favoritos arriba; búsqueda; filtro por grupo (dato ya disponible en `groupName`) | `features/works/works_list_screen.dart`, `create_work_dialog.dart` | Alta de proyecto navega al detalle |
| UI-07 ✅ | **Detalle de proyecto**: cabecera, secciones colapsables por objetivo, subtareas, selector de sección del composer más claro | `features/works/work_detail_screen.dart` | Crear tarea en la sección elegida; sin permiso no aparece el composer |
| UI-08 ✅ | **Detalle de tarea (sheet)**: jerarquía clara, selector de estado, toggle Mi día, descripción, subtareas, historial | `features/tasks/task_detail_sheet.dart` | Todas las acciones actuales siguen disponibles |
| UI-09 ✅ | **Sectores**: lista con color/pendientes; tablero con filtro, grupos por proyecto, menciones solo lectura | `features/sectors/` | Navegar del grupo al proyecto funciona |
| UI-10 ✅ | **Notas**: lista con preview, editor limpio, aviso de "nota con formato" | `features/notes/` | Guardado al salir sigue funcionando |
| UI-11 ✅ | **Recordatorios**: notificaciones (descartar/posponer), agenda de próximas, formulario | `features/reminders/` | Mismas acciones; formulario usable con una mano |
| UI-12 ✅ | **Cuenta**: avatar, servidor, cerrar sesión, versión de la app | `features/account/` | |
| UI-13 ✅ | **Ícono y splash nativos** (`flutter_launcher_icons`, `flutter_native_splash`) con la marca | `pubspec.yaml`, assets | Ícono y splash en Android e iOS |
| UI-14 ✅ | **Accesibilidad**: `Semantics`, objetivos táctiles ≥ 48 dp, escalado de texto hasta 1.5×, `reduce motion` | todo `lib/features/` | Sin overflow a 1.5× en pantalla de 360 dp |


### Verificación de fase 3 — 2026-10-09

- `dart analyze`: sin issues.
- `flutter test --dart-define=UI_PREVIEWS=true`: **31 tests en verde**
  (29 pruebas habituales y 2 capturas optativas).
- `flutter build apk --debug`: APK generado. Inicio/login inspeccionado en el
  emulador Android; ícono y splash generados para Android e iOS.
- Pruebas de presentación con Montserrat real, ancho 360 dp y texto a 1.5× en
  claro/oscuro; setup/login también a 360 dp y 1.5×.
- Verificados: filtros combinados, estado de las cinco pestañas, completar/Mi día
  por gesto, permisos de lectura, creación en la sección elegida, guardado de
  notas al salir y conservación del texto ante errores. Contraste AA comprobado
  para texto principal/secundario, botón primario y selección en ambos temas.
- Capturas reproducibles con datos de prueba:
  `.context/phase3-light.png` y `.context/phase3-dark.png` (gitignored).
- Las notas esperan el guardado antes de cerrar. El historial de estados se carga
  al expandirlo; las menciones del sector permanecen en solo lectura.
- Las fuentes y licencias están incluidas en `assets/fonts/`; no necesitan red.

**Validación pendiente:** ejecución nativa y login en iOS, y recorrido manual
con VoiceOver/TalkBack. La implementación visual está lista; estas pruebas de
plataforma no se sustituyen por los tests de widgets.

## Paridad con la web — implementación paso a paso

Pedido actualizado: usar un drawer como el de la web y llevar todas sus opciones
al móvil. Esto amplía el alcance inicial, que dejaba administración y grupos en
la web. Referencia revisada: `src/components/nav/DrawerNav.tsx`.

**Auditoría funcional — 2026-10-09:**
[`docs/web-mobile-parity-audit.md`](docs/web-mobile-parity-audit.md).
Detalla lo disponible, faltantes por sección, diferencias de comportamiento,
dependencias de datos, permisos y orden recomendado. Es una revisión de código;
no reemplaza la validación E2E. Los pasos siguientes resumen el alcance y la
auditoría desglosa las entregas.

| Paso | Estado | Entrega | Verificación |
|---|---|---|---|
| P1 | ✅ | Sustituir la barra inferior por un drawer: perfil, Mis notas, Mi día y referencias, Proyectos, Sectores, Recordatorios y Mi cuenta | Cierra al navegar y al volver atrás; selección correcta; conserva búsqueda y detalle; 360 dp/1.5× en claro y oscuro |
| P2 | ✅ | Proyectos y Sectores desplegables; accesos con colores y contadores; Todos, Mis proyectos, Favoritos y Archivados | Orden por pendientes y nombre; creador y grupos por ID; rutas conservan filtro; ver entrega del punto 2 |
| P3 | ✅ | Grupos: lista/detalle, miembros/roles, clientes, etiquetas y acceso a proyectos/sectores | Punto 4 de la auditoría; permisos, confirmaciones y QA Android |
| P4 | ✅ | Vista de tareas; evitar duplicados en Mi día/referencias, alinear progreso y navegación al origen; acceso a Vence hoy | Paridad de consultas, contadores y acciones con la web |
| P5 | ✅ | Plantillas de objetivo y gestión de objetivos | Crear/aplicar/editar según permisos |
| P6 | ✅ Implementado; QA externo pendiente | Configuración: cuenta y secciones del sistema, incluidas etiquetas/estados/usuarios e integraciones disponibles en web | Relevar cada sección, respetar rol y no mostrar administración a quien no tiene permiso |
| P7 | Parcial | Documentos/notas enriquecidas y archivos implementados (punto 7 de auditoría); quedan recordatorios avanzados y otras diferencias | Android + tests; pendiente iOS/nube real |

En P1 los destinos disponibles funcionan. Las opciones pendientes se incorporan
con sus pantallas y acciones en los pasos siguientes. Mi cuenta todavía no
equivale a toda la Configuración de la web; cerrar sesión está en cuenta y drawer.
Las rutas existentes y sus ramas se conservaron para mantener estado y enlaces.
Los editores de notas/recordatorios usan su navegación de regreso; no se abre el
drawer por gesto desde ellos, para evitar abandonar una edición sin guardar.

Validación P1: `dart analyze` sin issues y
`flutter test --dart-define=UI_PREVIEWS=true`: **34 tests en verde**
(32 habituales + 2 capturas). Las capturas actuales del drawer, con datos de
prueba, están en `.context/drawer-light.png` y `.context/drawer-dark.png`.

### Auditoría: punto 1 del orden recomendado — CAL-01–05

Implementado: deduplicación de Mi día/referencias con indicadores; permisos de
estado y texto separados en referencias de sector; zona horaria del sistema para
recordatorios; detalle de tarea reactivo a subtareas/metadatos; refresco de notas
y agenda al reanudar sin pisar borradores. Se amplían providers/modelos/repositorios
para esta entrega funcional, conservando la arquitectura de la app.

La zona IANA usa `timezone` y la consulta autenticada existente
`GET /api/reminders/timezone`. No cambia el contrato del servidor. El detalle de
tareas usa los endpoints existentes de su contexto, sin asumir acceso al proyecto
cuando la tarea se abrió desde una referencia de sector.

Verificado con `dart analyze` sin issues y `flutter test`: **46 tests en verde**
(14 nuevos). Regresiones en `test/features/daily_parity_test.dart`. Alcance en
[`docs/web-mobile-parity-audit.md`](docs/web-mobile-parity-audit.md).

### Auditoría: punto 2 del orden recomendado — drawer de Proyectos/Sectores

Implementado el drawer desplegable con los diez primeros elementos por pendientes
(descendente), desempate alfabético español y enlace al listado completo. El total
de cada sección incluye todos los elementos visibles, incluso fuera de esos diez;
los contadores cero se ocultan. Colores de proyecto por etiqueta principal (o primera
clave) y colores/ámbitos de sector conservados desde la API.

Todos, Mis proyectos, Favoritos y Archivados son destinos reales con selección
activa. Mis proyectos usa `createdById`; los filtros de grupo usan IDs y la búsqueda
incluye descripción. Se conservan búsqueda/filtros al recorrer secciones y al volver
desde el detalle. Las rutas distinguen `filter=mine`, `filter=favorites` y
`status=ARCHIVED`. El acceso a Plantillas se agrega junto con su pantalla en el
punto 6 del orden recomendado (P5 de esta tabla).

Los modelos conservan creador, propietario, IDs de etiquetas/sectores, contador
canónico y ámbito estructurado de sectores. Se consumen los endpoints existentes;
la visibilidad sigue siendo la que devuelve el servidor. SSE refresca los contadores
también al archivar/restaurar proyectos o sacar tareas de un proyecto.

Verificado: `dart analyze` sin issues, `flutter test` con **55 tests en verde**
(9 nuevos en `test/features/navigation_parity_test.dart`), navegación con router
real y HTTP simulado, reintento, carga/vacío, SSE, 360 dp y texto 1.5× claro/oscuro.
Capturas optativas con `UI_PREVIEWS=true` en `.context/nav02/` (gitignored).
Pendiente el recorrido contra servidor real en dispositivo; los tests no lo sustituyen.

### Auditoría: punto 3 del orden recomendado — proyectos y sectores

Implementados PRO-03/04 y SEC-01/02. Proyecto: editar nombre/descripción/fecha,
archivar/restaurar, borrar con nombre exacto, cambiar/quitar etapa y administrar
etiquetas principales/secundarias. Sector: buscar, filtrar por ámbito, ordenar,
plegar agrupaciones, crear, renombrar, cambiar color y borrar con conteos del
servidor. Se conservan los permisos de referencias de CAL-02.

Se amplían modelos, repositorios y providers dentro de la arquitectura existente.
No cambia la API. Los catálogos de etapas/etiquetas usan el ámbito del proyecto;
las membresías ADMIN de grupos se conservan para el alta de sectores. Editar y
borrar sectores es exclusivo de SUPERADMIN. Los archivados solo permiten nombre,
etiquetas, restauración y borrado. Errores mantienen formularios/confirmaciones.

Verificado: `dart analyze` sin issues y **71 tests** en verde (16 nuevos), incluidos
403, doble envío, borrado durante SSE y formularios 360 dp/1.5× en ambos temas.
QA en Pixel 9a contra el servidor local: proyecto temporal editado, etiquetas,
archivado/restauración y borrado; sectores con alta, edición, filtros y borrado.
El catálogo de etapas del ámbito personal está vacío en ese servidor; cambios
con opciones disponibles verificados en tests. Capturas y logs: `.context/ops03/`.
La tabla P3 anterior sigue referida a Grupos: es el punto 4 de la auditoría.

## Entrega del punto 4 de la auditoría — Grupos

Implementados NAV-03 y GRP-01–03: drawer, lista/detalle, alta/edición/borrado,
miembros/roles con propietario protegido, lectura para no miembros/TV, clientes
con proyectos autorizados y etiquetas propias con valores/colores. Repositorio,
providers y rutas mantienen la arquitectura existente.

Borrado de grupo pide nombre exacto y explica la cascada del esquema; el texto
web actual que dice conservar proyectos no coincide con esa implementación.
Borrados de etiquetas usadas requieren confirmar el impacto 409; clientes con
accesos archivados advierten su pérdida antes de sincronizar. Los controles
administrativos se limitan a SUPERADMIN o MEMBER con membresía ADMIN.

Verificación: `dart analyze` limpio, 87 tests (16 nuevos), HTTP simulado con roles,
errores y reintentos, router real/SSE, formularios 360 dp/1.5× claro/oscuro.
QA Android y capturas en `.context/groups04/`. Los cambios remotos sin evento SSE
requieren refresco manual o reanudar la app. Ver detalle en la auditoría actualizada.
El punto 5 se detalla a continuación.

## Entrega del punto 5 de la auditoría — Vista de tareas y Mi día

Implementados DIA-02/03 y NAV-04/06. Mi día cuenta tareas hoja como la web,
muestra avance y enlaza el proyecto/sector de origen sin duplicar referencias.
Vista de tareas consulta `/api/board`: sectores, pendientes, estados y contexto
proyecto/objetivo/padre; progreso por hojas y total sin duplicados entre sectores.
Las filas son de consulta y la cabecera lleva al sector.

Vence hoy tiene destino propio y contador en el drawer; reutiliza las acciones
de avisos recibidos (descartar y posponer una hora/mañana). Incluye todos los
avisos pendientes devueltos por la API, incluso de días anteriores. Se refresca
al abrir, reanudar y cada 60 segundos en primer plano. Cerrar sesión está también
en el drawer y reutiliza la revocación y limpieza segura existentes.

Verificación: `dart analyze` limpio y **103 tests en verde** (16 nuevos), con
router real, transporte HTTP simulado, SSE, errores/reintento, doble envío,
contadores, permisos, ciclo de vida y 360 dp/1.5× claro/oscuro. Recorrido Android
contra servidor local: tarea temporal con dos subtareas, avance 1/2, enlace al
sector y panorama general. Vence hoy sin avisos reales; acciones de notificaciones
verificadas con HTTP simulado. Capturas y registro en `.context/day05/`.
Se corrigió el regreso tras borrar un proyecto/sector abierto desde otra rama,
sin recuperar el detalle eliminado; dos regresiones reproducen el fallo previo.
El sector temporal y sus tres tareas se eliminaron al finalizar. Cierre de sesión
verificado con transporte simulado; se dejó iniciada la sesión del emulador.
No cambia el servidor. Validación nativa de iOS pendiente.

El punto 6 se detalla a continuación.

## Entrega del punto 6 — objetivos, plantillas y organización

Implementados OBJ-01–03, TAR-01–05 y el destino Plantillas de NAV-02. Objetivos:
alta, título/descripción, subir/bajar, borrar conservando o eliminando tareas,
guardar como plantilla e insertar copias. Plantillas: lista/búsqueda, alta,
edición y tareas, creación de proyecto desde plantilla; sin objetivos anidados.

Organización: mover raíces entre objetivos/Generales, anidar o separar tareas,
orden completo por sección y por padre con controles Subir/Bajar. Lista/tablero
por estado en proyecto/sector, con tarjetas independientes para subtareas.
Enlaces de origen y referencias por ID; vencimiento propio o heredado de la
subtarea abierta más próxima. Lectura, archivados y permisos conservados.

Editor: autocompletado / # @ $, resaltado de sintaxis y fechas, descripción,
una tarea por línea y aviso de destino distinto. Reintento de lote conserva solo
líneas pendientes; fallo del PATCH de descripción conserva el ID ya creado.
Referencias sin resolver permiten corregir o crear explícitamente el recurso;
una etiqueta ambigua requiere un valor con nombre único, según el contrato web.

Verificación: `dart analyze` sin issues, **125 tests en verde** (22 nuevos),
router real y HTTP simulado, errores/reintentos, permisos, orden, borrado,
lotes parciales, respuesta atrasada del autocompletado y 360 dp/1.5× en ambos temas.
QA Android contra servidor local con recursos temporales; capturas y registro en
`.context/objectives06/`. Los recursos temporales se eliminaron al terminar.
Emulador abierto en Plantillas de objetivo. Sin cambios de endpoints ni dependencias.
Validación nativa de iOS pendiente. El punto 7 (documentos, notas y archivos)
se detalla en su entrega más abajo.

## Fase 4 — Funcionalidad siguiente (sin asignar)

| # | Tarea | Notas |
|---|---|---|
| N1 | **Push de recordatorios** (FCM/APNs) | Backend: registrar device token por `MobileSession` y enviar cuando se dispara un `ReminderDelivery` (hoy solo hay campanita + mail) |
| N2 | **Dispositivos vinculados** en la web (listar / revocar `MobileSession`) | Ajustes → Mi cuenta, igual que las conexiones MCP |
| N3 ✅ | **Autocompletar sintaxis** en el composer (`/` `#` `@` `$`) | Hay `GET /api/tags/suggest` |
| N4 ✅ | **Objetivos**: crear / renombrar / borrar | Endpoints ya existen (`/api/works/[id]/objectives`, `/api/objectives/[id]`) |
| N5 ✅ | **Reordenar** tareas y subtareas | Controles Subir/Bajar, lista completa por sección/padre; endpoints existentes |
| N6 | **Filtros** por etiqueta / estado en sector y proyecto | `labelValueId`, `statusId` en `/api/sectors/[id]/tasks` |
| N7 ✅ | **Archivos del proyecto** | Selector nativo, carpetas, transferencias y compartidos. Captura directa de cámara fuera del punto 7. |
| N8 ✅ | **Editor enriquecido de notas** | TipTap local, lectura/edición, Markdown y autoguardado |
| N9 | **Caché offline** de lectura (última respuesta por provider) | |
| N10 | **QA con Marionette**: binding de Marionette en debug para verificar UI | Ver skill `flutter-ui` |
| N11 | **Universal links / App Links** (`https://…/works/<id>` abre la app) | |

## Fase 5 — Salida a tiendas (sin asignar)

| # | Tarea |
|---|---|
| R1 | Bundle/application id definitivo (hoy `ar.net.gen.genwork_mobile`) y nombre de tienda |
| R2 | Firma Android (keystore de release, hoy firma con debug) y certificados iOS (cuenta Apple Developer) |
| R3 | Build en CI (GitHub Actions: `flutter analyze`, `flutter test`, apk/ipa) |
| R4 | Política de privacidad y fichas de tienda (Play Console / App Store Connect) |
| R5 | Distribución interna primero (Play internal testing / TestFlight) |

---

## Fase 6 — Paridad visual con genstock (DS-00 … DS-30) ✅ 2026-10-11

Unificar la UI con los componentes Flutter de genstock y los valores de la web genwork
(azul, neutros acromáticos, claro/oscuro/sistema). Plan paso a paso, pensado para ejecutarse
una tarea por sesión: [`docs/ui-genstock-parity-plan.md`](docs/ui-genstock-parity-plan.md).

| Fase | Tareas | Entrega |
|---|---|---|
| A | DS-00 … DS-04 | Línea de base, `GenColors`, geometría/tipografía/íconos, `ThemeData` nuevo, `ThemeToggle` |
| B | DS-05 … DS-10 | Componentes portados: chips, estados, diálogos, paneles/encabezados, búsqueda/filtros/tabs, contadores/progreso |
| C | DS-11 … DS-13 | `TaskTile`/composer, drawer estilo sidebar, detalle de tarea a pantalla completa |
| D | DS-14 … DS-27 | Migración pantalla por pantalla |
| E | DS-28 … DS-30 | Guardia de tokens (test), nativo, QA visual y documentación |

**Estado:** completa. `dart analyze` sin issues; `flutter test` 319 verdes (323 con `--dart-define=UI_PREVIEWS=true`).
Cada pantalla se comparó con la web a 390 px. Evidencia en `.context/ds-final/`; bitácora y hallazgos por tarea en
[`docs/ui-genstock-parity-plan.md`](docs/ui-genstock-parity-plan.md); resumen en `design-system/genwork/GENSTOCK_PARITY.md` (sección «Móvil»).

## Riesgos y pendientes conocidos

- El APK debug compila con `flutter_web_auth_2` 5.1.0 y AGP 9. Flutter
  advierte sobre la migración futura del plugin a Kotlin integrado; no se
  modificó auth en la fase de UI.
- iOS no se compiló en esta máquina (Xcode incompleto). Falta probar el login en
  un iPhone/simulador.
- El SSE vive en memoria de un solo proceso del servidor (limitación existente,
  igual que la web).
- Dev en el teléfono: el servidor tiene que ser alcanzable desde el dispositivo y
  `AUTH_URL` tiene que ser esa misma URL (ver `README.md`).

## Entrega del punto 7 — documentos, notas enriquecidas y archivos

DOC-01–03 y ARC-01–02 implementados. Accesos Documentación/Archivos en cada
proyecto; notas y documentos comparten TipTap local con el esquema de la web,
barra de formato, listas de tareas, tablas y enlaces. Autoguardado serial por
revisión, reintento y salida protegida conservan el borrador frente a errores.
Importación Markdown por agregado y exportación UTF-8 con selectores nativos.
Adjuntos de imágenes en proyectos; descargas privadas por Bearer, sin tokens en
el WebView. Nodos, marcas o atributos desconocidos bloquean edición del cuerpo.

Archivos: habilitar carpeta según permiso, estado de preparación, navegación por
ruta/ID, crear carpetas, renombrar, borrar con confirmación, subir múltiples
archivos con progreso/cancelación y descargar/abrir en otra app. Compartidos por
usuario o enlace, contraseña/vencimiento, listado, copiar y revocar. Los errores
de identidad y capacidades del proveedor se muestran sin simular éxito.

Validación: 144 tests Flutter, análisis estático limpio, prueba del bundle TipTap
en Chromium y recorrido Android con servidor local. Importar/exportar Markdown,
autoguardado y conservación del formato verificados en el dispositivo. Se
corrigieron el guardado inicial involuntario del editor y la desconexión del
puente al reemplazar la vista tras un refresco remoto; regresión automatizada.
La nube quedó preparando la carpeta: transferencias/compartidos e imágenes
privadas requieren QA contra un proveedor listo. iOS sigue pendiente.
Evidencias y registro: `.context/documents07/`. Siguiente punto: 8, recordatorios
avanzados; no se incluye en esta entrega.

Al finalizar el punto 7 se eliminó el proyecto QA temporal y se dejó abierta la
nota **QA07 Nota temporal** como ejemplo para revisión. Los datos preexistentes
no se modificaron. Captura final: `.context/documents07/emulador-final.png`.

## Entrega del punto 8 — recordatorios avanzados

REC-01–03 implementados. Recordatorios ofrece agenda y calendario mensual,
selección de día, anterior/siguiente, salto por fecha y regreso a hoy. Consulta
meses completos al servidor, sin el límite de 60 días de la agenda. El alta
desde el calendario conserva el día elegido y la zona horaria del sistema.

Formulario con alcance individual/grupo/global según rol y pertenencia,
vínculos a proyecto/sector, varios días semanales, intervalos cada N días,
semanas o meses, fin por fecha/cantidad y hasta 20 avisos con anticipación y
hora independientes. En edición se conservan alcance/grupo y vínculos no
resueltos; `canMutate` impide modificaciones no autorizadas. Validación de
rangos/duplicados, borrado confirmado y protección del borrador al salir.

Validación: 160 tests Flutter (16 nuevos), análisis limpio; calendario y
formulario a 360dp/150% en claro/oscuro. Android: navegación hasta enero de 2027,
alta desde el 15 de enero, dos avisos, repetición cada tres meses con cuatro
ocurrencias, vínculo a proyecto y reapertura. Edición semanal lunes/miércoles/
viernes persistida y reabierta. Se elimina el recordatorio temporal QA08 al
terminar, sin modificar recursos preexistentes. Evidencias: `.context/reminders08/`.
Permisos y errores se cubren con HTTP simulado; iOS sigue pendiente. Próximo
punto: 9, configuración y administración por módulos.


## Entrega del punto 9 — configuración y administración

CFG-01–02, ADM-01–07 y NAV-05 implementados. Configuración se abre desde el
drawer y Mi cuenta. Tema claro/oscuro/sistema persistido, información del
servidor, vinculación Nextcloud y conexiones MCP propias con clave de una sola
visualización y actividad. Google Drive utiliza la cuenta de la organización,
como la web actual.

Administración por rol: acceso por dominio/lista, correos permitidos, usuarios
MEMBER/READER y permisos por grupo, clientes externos con proyectos, etiquetas
con valores/colores, etapas y estados por ámbito. Borrados confirmados, permisos
del servidor, reordenación y borradores conservados ante errores. Almacenamiento:
proveedor/configuración, contraseñas existentes preservadas, Drive/carpeta raíz,
prueba de conexión y trabajos/reintentos. Recordatorios: zona horaria y conexión/
desconexión Gmail. Errores: filtro, detalle y resolver/reabrir.

OAuth móvil de Google implementado en el backend con estado aleatorio, código
cifrado, PKCE ligado a la misma sesión, diez minutos de validez, consumo único
y revalidación de rol tras el canje. Migración aditiva `MobileIntegrationFlow`.
Instrucciones de despliegue y callback en `docs/api-contract.md`.

Verificación: **183 tests Flutter** (23 nuevos), análisis Dart limpio, **32 tests
backend** de autenticación/integraciones (15 nuevos), TypeScript/ESLint limpios,
esquema Prisma válido y APK debug compilado. Widgets a 360dp y texto 150% en
claro/oscuro; pruebas simuladas de permisos, errores, confirmaciones, OAuth,
sondeo/cancelación Nextcloud y selector de carpetas Drive.

Android con servidor local: navegación a los módulos, tema, catálogos y datos
administrativos; alta de etiqueta personal QA09 y valor verde, edición y
eliminación confirmada. No quedan esos datos temporales. No se modificaron
cuentas, acceso, proveedor, zona horaria ni la nota QA07. La tabla aditiva se
creó en `genwork_mobile_dev`; esta base de pruebas usa db push y no tiene
historial de migraciones. No se aplicó el conjunto histórico de migraciones.

**Pendiente:** autorización Google/Nextcloud y operaciones de nube con cuentas
reales configuradas, iOS y QA transversal del punto 10. El emulador queda abierto
en Configuración. Evidencias y logs: `.context/settings09/`.


## Punto 10 — QA conjunto web/app (avance verificado)

Web y Android local: escritura en ambas direcciones, reanudación, persistencia,
permisos y eliminación remota. Se corrigieron detalles antiguos al mover tareas,
refresco de archivos/compartidos, recuperación SSE, revalidación del rol visible
y controles antiguos tras errores 401/403/404. Fallos transitorios conservan
los borradores. Recursos temporales QA10 eliminados; datos previos conservados.

197 tests Flutter, 1.412 del servidor (147 archivos), análisis Dart/TypeScript
limpios y APK debug. Pruebas automáticas de accesibilidad más texto ampliado en
Android. Emulador abierto con la versión actualizada.

**El punto 10 no se da por cerrado:** faltan iOS (Xcode/simctl no disponible),
proveedores reales configurados y el recorrido completo con lectores de pantalla
y roles en dispositivos. Matriz, evidencias y reproducción en
[`docs/qa-cross-platform.md`](docs/qa-cross-platform.md).

Segunda pasada (roles y lector de pantalla): matriz MEMBER/SUPERADMIN de grupos
y sectores verificada en Android, API y web; árbol de accesibilidad recorrido.
Correcciones en servidor (acceso al crear tareas, dueño de grupo, borrado de
grupo con tareas), web (controles según permisos) y app (selector de grupo, día
de Mi día, etiquetas de TalkBack). 205 tests Flutter, 1.422 del servidor.
Quedan iOS, nube real y gestos de TalkBack/VoiceOver en dispositivo físico.

## Entrega M00–M19 — paridad ampliada (2026-10-15)

Entorno local QA aislado y comandos Conductor; inventario de 28 páginas y 113
endpoints; filtros combinados/orden de proyectos, resumen compacto, descripción
plegable, actividad MCP y acceso cliente por proyecto. Estados de sector con
ámbito inicial, referencias agrupadas y enlaces a objetivos que reabren la sección.

Login móvil para los cuatro roles con navegación separada. CLIENT usa DTO/API/SSE
del portal; READER usa tablero en consulta. El proxy mantiene el límite del portal
con Bearer incluso si también hay cookie. Cambio de identidad/rol elimina las ramas
anteriores; errores 403 del tablero retiran datos previos.

QA y evidencias se detallan en la guía vigente. **M20/M21 siguen abiertos**: no se
certifican todas las mutaciones en dispositivos, nube real ni lectores de pantalla;
iOS no compila en esta máquina sin Xcode completo. El historial previo se conserva.

Verificación final Mxx: **345 tests Flutter**, **1.435 tests backend**, análisis Dart,
TypeScript, ESLint y detector visual sin hallazgos. APK debug compilado/instalado.
Comparación actual: web y app como lector; evidencias en `.context/mobile-parity/`.
