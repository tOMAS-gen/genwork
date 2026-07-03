# Research: Gestión de trabajos por cliente y sector con etiquetado inline

**Fecha**: 2026-07-02 | **Spec**: [spec.md](spec.md)

Resuelve todos los NEEDS CLARIFICATION del Technical Context del plan.

## R1. Framework de aplicación

- **Decision**: Next.js 14+ (App Router) con TypeScript, aplicación fullstack única.
- **Rationale**: Un solo framework y un solo lenguaje para frontend + backend (Principio V,
  un solo desarrollador). Auth.js integra Google OAuth en horas, no días. El ecosistema tiene el
  mejor editor tipo Notion disponible (TipTap). El dashboard para TV es una página web más.
  Server-Sent Events y route handlers cubren el backend sin servicio aparte.
- **Alternatives considered**:
  - Go backend + frontend React separado: dos codebases, dos despliegues; más infraestructura
    sin beneficio a esta escala (<30 usuarios).
  - Flutter Web: editor de documentación rica inmaduro en Flutter; el caso de uso es
    principalmente web/escritorio, no móvil nativo.

## R2. Base de datos

- **Decision**: PostgreSQL 16 con Prisma ORM.
- **Rationale**: Multiusuario concurrente; Nextcloud (que viene en el mismo docker-compose) ya
  requiere una base de datos — se reutiliza la misma instancia de Postgres con dos databases
  (genwork y nextcloud), cero costo operativo extra. Prisma da tipos end-to-end con TypeScript.
- **Alternatives considered**: SQLite (alcanza en volumen, pero Postgres ya está en el stack por
  Nextcloud y evita migración futura); MySQL (sin ventaja diferencial).

## R3. Editor de documentación (página estilo Notion)

- **Decision**: TipTap (sobre ProseMirror) con extensiones: imágenes, adjuntos, headings, listas.
  Contenido persistido como JSON de ProseMirror en Postgres; binarios (imágenes/archivos) suben a
  la carpeta Nextcloud del trabajo y se referencian por URL interna.
- **Rationale**: Estándar de facto para editores tipo Notion en web; extensible para el caso
  clave del proyecto (menciones/etiquetas inline, ver R4).
- **Alternatives considered**: Editor.js (menos flexible para extensiones inline); textarea +
  Markdown (no cumple la experiencia "como Notion" pedida explícitamente).

## R4. Parser y autocompletado de etiquetas `/` `#` `@`

- **Decision**: Tokenizer propio en `src/lib/domain/tags/` (lógica pura, sin dependencias de UI)
  + extensión Mention de TipTap para autocompletado en el input de tareas. Las etiquetas se
  resuelven a IDs de entidad al confirmar la tarea (el vínculo apunta a la entidad, no al texto
  — Principio II y FR-015). Escape con doble símbolo (`//`, `##`, `@@`) para literales.
- **Rationale**: Lógica core del dominio → debe ser testeable aislada (constitution exige tests).
  Mention de TipTap ya maneja triggers por carácter, popup de sugerencias y navegación teclado.
- **Alternatives considered**: Regex sobre texto plano al guardar (pierde autocompletado en vivo);
  librerías de "social input" (mantenimiento dudoso, menos control del matching insensible a
  mayúsculas/acentos).

## R5. Autenticación y control de acceso

- **Decision**: Auth.js (NextAuth v5) con provider Google, estrategia de sesión JWT. El callback
  `signIn` valida el correo contra la configuración de acceso (modo dominio o lista) en Postgres.
  Primer usuario en iniciar sesión tras la instalación = super-admin. Autorización por capa de
  dominio propia (`src/lib/domain/permissions/`): funciones puras que responden "¿puede X operar
  en Y?" según rol global, membresías de grupo y permisos por sector.
- **Rationale**: Google como único método es requisito de la spec (FR-017). Permisos como
  funciones puras → testeables sin base de datos.
- **Alternatives considered**: Firebase Auth (agrega dependencia de nube externa para un sistema
  self-hosted); implementación OAuth manual (reinventar la rueda con riesgo de seguridad).

## R6. Integración Nextcloud

- **Decision**: Nextcloud 29+ desplegado en el mismo docker-compose, con app **Group Folders**.
  genwork se conecta con una cuenta de servicio admin (URL + app password) configurable desde el
  módulo de conexión (permite apuntar a un Nextcloud externo). Operaciones:
  - **OCS Provisioning API**: crear usuario Nextcloud al autorizar un usuario genwork (FR-033);
    crear grupo Nextcloud + Group Folder al crear un grupo genwork (FR-034); alta/baja de
    miembros en el grupo Nextcloud al entrar/salir del grupo genwork.
  - **WebDAV**: crear carpeta por trabajo dentro del Group Folder (o carpeta personal), subir y
    leer archivos (FR-029), descargar la carpeta completa para el export (FR-030).
  - Los usuarios instalan el cliente de escritorio oficial de Nextcloud y ven sincronizadas las
    carpetas de sus grupos (FR-035) — sin desarrollo propio.
- **Rationale**: Decidido con el usuario en clarificación. Group Folders da carpetas compartidas
  por grupo administradas centralmente (exactamente FR-034). Archivos planos en disco del
  servidor facilitan el export.
- **Alternatives considered**: ownCloud Infinite Scale (más liviano pero menos plugins y
  comunidad); Seafile (sync excelente pero almacena en bloques propios — complica export);
  filesystem/MinIO (descartados: sin cliente de sincronización de escritorio, requisito duro).
- **Riesgo conocido**: acoplamiento de cuentas genwork↔Nextcloud requiere idempotencia (reintentos
  si Nextcloud está caído al crear usuario/grupo) → cola simple de tareas pendientes en Postgres.

## R7. Exportación/archivado portable

- **Decision**: El archivado genera un paquete ZIP descargable construido en el servidor:
  `archivos/*` (descargados de la mini nube), `documentacion.pdf` + fuente JSON, y `tareas.md`
  con el registro completo (texto, etiquetas, estados, autores, fechas). El usuario descarga el
  paquete y lo guarda donde prefiera (su Drive, otra nube, disco). Operación transaccional hacia
  el usuario: el trabajo pasa a ARCHIVED solo tras export confirmado (FR-031); el paquete
  generado se retiene temporalmente en el servidor hasta la confirmación de descarga.
- **Rationale**: Corrección del usuario en clarificación — el destino lo elige cada uno; el
  sistema no necesita credenciales de nubes externas para archivar. Formatos estándar legibles
  sin el sistema (FR-030).
- **Alternatives considered**: subir directo a Google Drive vía API (descartado como mecanismo
  de archivado: ata el export a una nube concreta); carpeta sin comprimir (más pasos para el
  usuario al mover el paquete).

## R8. Actualización en vivo (todas las vistas)

- **Decision**: Server-Sent Events (SSE) global: un endpoint de stream al que se suscriben todas
  las pantallas (trabajo, sector, dashboard). El servidor emite eventos `task-changed` /
  `work-changed` con los IDs afectados; cada cliente re-consulta solo si el evento toca lo que
  está mostrando. Fallback: re-fetch cada 60 s.
- **Rationale**: Requisito FR-036 — cualquier persona viendo la misma pantalla ve el cambio al
  instante (el TV es un caso más). Los clientes solo miran; las escrituras van por la API normal
  → SSE (unidireccional) alcanza y es más simple que WebSocket (Principio V).
- **Alternatives considered**: WebSocket (bidireccional innecesario); polling puro (latencia
  visible y carga constante).

## R11. Proveedor de almacenamiento conectable (FR-037)

- **Decision**: Interfaz `StorageProvider` en `src/lib/storage/` con operaciones: aprovisionar
  usuario, crear carpeta de grupo compartida, alta/baja de miembro, crear carpeta de trabajo,
  subir/leer/listar archivos. Implementación v1: `NextcloudProvider` (OCS + WebDAV, default).
  Implementación alternativa: `GoogleDriveProvider` (Drive API: carpetas compartidas por grupo
  vía permissions, sync con el cliente oficial Google Drive for Desktop) — se diseña la interfaz
  ahora, se implementa Nextcloud primero; Drive puede entrar en v1.x sin tocar el dominio.
- **Rationale**: Pedido del usuario: empresas que ya usan Google Drive pueden conectarlo en vez
  de Nextcloud. La abstracción evita acoplar el dominio a Nextcloud.
- **Alternatives considered**: soportar ambos desde el día 1 (duplica esfuerzo de la primera
  entrega); solo Nextcloud hardcodeado (obliga refactor futuro seguro).

## R9. Testing

- **Decision**: Vitest para la lógica core obligatoria por constitution: parser de etiquetas,
  motor de permisos, resolución de vistas/filtros, transiciones de estado y flujo de archivado
  (con Nextcloud/Drive mockeados). Playwright para smoke e2e de los flujos P1–P2 (opcional).
- **Rationale**: Constitution exige tests de dominio antes de dar por completo; UI verificable
  manualmente.

## R10. Despliegue

- **Decision**: docker-compose con 4 servicios: `genwork` (Next.js standalone), `postgres`
  (databases genwork + nextcloud), `nextcloud`, `caddy` (proxy TLS). Un `.env` único documentado.
  El módulo de conexión de genwork trae preconfigurados los valores del Nextcloud incluido y
  permite reemplazarlos por un Nextcloud externo.
- **Rationale**: "Vienen juntos pero separados" — decisión del usuario en clarificación. Un
  comando (`docker compose up`) levanta todo.
- **Alternatives considered**: instalación manual por servicio (fricción alta); embeber Nextcloud
  en la imagen de genwork (acoplamiento falso, rompe la opción de Nextcloud externo).
