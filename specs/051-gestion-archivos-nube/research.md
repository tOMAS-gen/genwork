# Research: Gestión completa de archivos en la nube

## R1 — Impersonación real en Nextcloud (app password por usuario)

**Decision**: Usar **Login Flow v2** de Nextcloud (`POST /index.php/login/v2`) para que cada usuario vincule su propia cuenta desde genwork. El flujo: (1) genwork pide un `login` + `poll.token/endpoint`; (2) redirige al usuario a `login` (pantalla real de Nextcloud, ya autenticado con su membresía real); (3) el usuario autoriza; (4) genwork hace poll y recibe `{ server, loginName, appPassword }`; (5) `appPassword` se cifra (`@/lib/crypto`) y se guarda en `StorageIdentity`. Las operaciones de ese usuario usan `createClient(url, { username: loginName, password: appPassword })` en vez de `cfg.adminUser`.

**Rationale**: Es el mecanismo estándar de Nextcloud para que una app de terceros obtenga credenciales de un usuario sin manejar su contraseña principal — el mismo patrón que usan el cliente de escritorio y apps como Talk. No requiere que el admin conozca ni gestione contraseñas de nadie. Además, como el usuario pasa por el login real de Nextcloud, se cumple literalmente el pedido ("cada usuario entra con su propia membresía").

**Alternatives considered**:
- *Impersonar vía OCS Provisioning API con credenciales admin*: la API de Nextcloud no permite generar un app password de otro usuario solo con credenciales de admin sin su consentimiento — no existe ese endpoint. Descartado por inexistente.
- *Guardar la contraseña real del usuario*: inseguro, y Nextcloud no expone la contraseña original vía API. Descartado.
- *Seguir con la cuenta admin + auditoría en genwork*: era la opción "simple" evaluada en Clarifications; el usuario la rechazó explícitamente a favor de impersonación real.

## R2 — Impersonación real en Google Drive (scope incremental sobre el login existente)

**Decision**: Ampliar el `Google` provider de next-auth (`src/server/auth.ts`) con el scope `https://www.googleapis.com/auth/drive.file` (acceso acotado a archivos creados/compartidos con la app, no todo el Drive) usando **authorization incremental** (`prompt: "consent"`, `access_type: "offline"` solo cuando el usuario decide vincular Drive desde `StorageAccountLink`, no en cada login). Se persiste el `refresh_token` de ESE usuario (cifrado) en `StorageIdentity`, separado del refresh token del admin (que sigue existiendo para crear el Shared Drive y compartir carpetas iniciales, spec 034).

**Rationale**: El login de genwork ya es con Google (spec 015) — pedir el scope de Drive en el mismo flujo evita un login aparte. `drive.file` (en vez de `drive` completo) es el scope de menor privilegio que permite operar sobre carpetas que el admin comparte explícitamente con el usuario, alineado con "solo va a tocar las carpetas que se están usando compartida" (respuesta del usuario en Clarifications).

**Alternatives considered**:
- *Scope `drive` completo*: da acceso a todo el Drive personal del usuario, no solo lo compartido por la plataforma — viola el principio de mínimo privilegio y lo que pidió el usuario. Descartado.
- *Pedir el scope en cada login*: fricción innecesaria para usuarios que no usan Drive. Se pide bajo demanda, una sola vez, desde `StorageAccountLink`.

## R3 — Compartir (FileShare): OCS Share API + Drive Permissions API

**Decision**: `share()` en `NextcloudProvider` usa la **OCS Share API** (`POST /ocs/v2.php/apps/files_sharing/api/v1/shares`) con `shareType=3` (link público, soporta `password`/`expireDate`) o `shareType=0` (usuario) / `shareType=1` (grupo) para altas internas — ejecutada con la credencial del usuario que comparte (R1), de forma que el share queda asociado a esa persona en Nextcloud también. En `GoogleDriveProvider`, `share()` usa la **Drive Permissions API** (`POST /files/{fileId}/permissions`) con `type=anyone` (link) o `type=user` (alta interna, por email). `FileShare` en Postgres guarda metadata liviana (quién, qué, con quién/link, vigente) para listarlo/revocarlo desde genwork sin tener que volver a consultar el proveedor en cada render.

**Rationale**: Ambas APIs son nativas de cada proveedor y ya cubren los dos modos que pide FR-010 (link + alta interna) sin reinventar un sistema de permisos propio.

**Alternatives considered**: Implementar "compartir" solo dentro de genwork (nunca tocar el proveedor) fue descartado — rompería SC-003 (el destinatario externo no tiene cuenta en genwork) y el pedido explícito de reflejar Nextcloud.

## R4 — Extensión de FilesBrowser (UI)

**Decision**: Se extiende `FilesBrowser.tsx` (ya soporta listar/navegar/subir) agregando: botón "Nueva carpeta" (modal con input de nombre), botón "Descargar" por fila (link a `download` existente), botón "Eliminar" por fila (modal de confirmación, FR-003), botón "Compartir" por fila (modal con las dos opciones de FR-010). Se reemplaza el link "Abrir en Nextcloud" como acción secundaria opcional, no como única vía (FR-002/FR-012 ya no aplican "solo lectura").

**Rationale**: Mismo componente, mismo patrón de estado (`useState` + `api()` helper) ya usado para upload — evita introducir una librería de manejo de estado nueva (Principio V).

## R5 — Vinculación de cuenta (StorageAccountLink)

**Decision**: Nueva sección en el perfil/ajustes del usuario ("Mi cuenta en la nube") con dos botones condicionales según el proveedor activo (`AccessConfig.storageProvider`): "Vincular Nextcloud" (dispara R1) o "Vincular Google Drive" (dispara R2). Si el usuario no vinculó su cuenta y la pestaña Archivos lo requiere, se muestra un mensaje claro con link directo a esa sección (en vez de fallar silenciosamente o caer a la cuenta admin — constraint del Technical Context).

**Rationale**: Punto único de vinculación, reusable independientemente de desde qué proyecto se dispare la necesidad.
