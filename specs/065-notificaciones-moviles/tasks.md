# Tasks: Notificaciones móviles — cierre Android

**Plan**: [plan.md](plan.md) · **Spec**: [spec.md](spec.md)

Comandos comunes: `A=~/Library/Android/sdk/platform-tools/adb`, teléfono `ZE2234JG9T` (moto e40, Android 11) y emulador `emulator-5554` (Android 16).

---

## Phase 1: Documentación y activación

### T1: Documentar el modelo privado y la guía de Firebase ✅

**Description:** actualizar `docs/mobile-notifications.md` con la decisión de genwork privado: un proyecto Firebase y la misma credencial en cada servidor propio, nunca compartida, y sin terceros ni intermediario. Agregar una guía paso a paso de la consola de Firebase. Commitear la spec, el plan y las tareas en la rama de PR #29 y subirlos.

**Acceptance criteria:**
- [x] No queda ninguna mención a "instalaciones de terceros" como escenario soportado; la decisión privada está explicada con su porqué.
- [x] La guía cubre crear el proyecto, registrar la app Android `ar.genwork.mobile`, descargar `google-services.json` y pasar sus valores a `mobile/config/firebase.android.json`, generar la clave de cuenta de servicio en `.firebase-secrets/firebase.json` y configurar las variables del servidor.
- [x] La guía advierte en negrita que nunca hay que pegar ni commitear la clave de la cuenta de servicio.

**Verification:**
- [x] `grep -n "tercer" docs/mobile-notifications.md` solo devuelve la decisión de no soportarlos.
- [ ] Lectura completa por el usuario, que es quien la va a seguir en T2.

**Dependencies:** ninguna · **Files:** `docs/mobile-notifications.md`, `mobile/PLAN.md`, `specs/065-notificaciones-moviles/*` · **Scope:** S

---

### T2: Crear el proyecto Firebase (usuario) ✅

**Description:** el usuario sigue la guía de T1. Claude acompaña paso a paso y verifica cada archivo sin mostrar secretos.

**Acceptance criteria:**
- [x] Existe `mobile/config/firebase.android.json` con las 4 claves completas (sin valores de ejemplo).
- [x] Existe `.firebase-secrets/firebase.json`, con `type: service_account` y un `project_id` igual al de la app.
- [x] Ninguno de los dos aparece en `git ls-files` ni en `git status`.

**Verification:**
- [x] `node -e` que imprime solo `type`, `project_id` y si `private_key` existe (sí/no).
- [x] `git ls-files | grep -i firebase` solo devuelve `firebase.example.json`.

**Dependencies:** T1 · **Files:** ninguno versionado · **Scope:** XS

---

**Notas (2026-10-25):** proyecto `genwork-43383`, app `ar.genwork.mobile`. La organización `gen.net.ar` bloqueaba crear claves (`iam.disableServiceAccountKeyCreation`); se anuló solo en el proyecto genwork, con `seo@` como Administrador de políticas. Envío en seco a FCM: credencial aceptada.

### Checkpoint A

> El PR #29 seguía abierto: la validación se hizo en `tOMAS-gen/notifications-android-validation`, apilada sobre #29.
- [ ] PR #29 mergeado por el usuario; rama nueva `tOMAS-gen/notifications-android-validation` desde main
- [x] T2 verificado

---

## Phase 2: Validación real

### T3: Entorno local con push e instalación del APK ✅

**Description:** crear o migrar las bases QA A y B, levantar el servidor A (`:3040`) con `PUSH_ENABLED=true`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `DEV_AUTH=true` y `AUTH_URL=http://localhost:3040`. Ejecutar `adb reverse tcp:3040 tcp:3040` en el teléfono. Compilar el APK debug con `--dart-define-from-file=config/firebase.android.json`, instalarlo, vincular el servidor e iniciar sesión.

**Acceptance criteria:**
- [x] `GET /api/me/notifications/preferences` devuelve `configured: true`.
- [x] Existe una fila `MobilePushDevice` con `platform=android`, `enabled=true` para la sesión del teléfono (el token no se imprime).
- [x] Ajustes de la app no muestra "push no configurado".

**Verification:**
- [x] Consulta SQL con conteo y plataforma.
- [x] Captura de Ajustes en `evidencias/t3-ajustes.png`.

**Dependencies:** T2, Checkpoint A · **Files:** ninguno (scripts en el scratchpad) · **Scope:** S

---

### T4: Recepción — US4 escenarios 1–3 ✅

**Description:** desde la web o la API como otro usuario, marcar urgente una tarea que menciona al usuario del teléfono, en tres estados de la app: cerrada (deslizada de recientes, sin forzar detención), en segundo plano y en primer plano. Después tocar la notificación.

**Acceptance criteria:**
- [x] Con la app cerrada y en segundo plano llega una notificación del sistema con texto genérico, en el canal "Tareas urgentes".
- [x] En primer plano aparece un solo aviso (sin duplicados) y la bandeja se actualiza.
- [x] Tocar la notificación abre la tarea correcta, incluso partiendo de la app cerrada.

**Verification:**
- [x] Capturas de la barra de notificaciones y de la tarea abierta: `evidencias/t4-*.png`.
- [x] Los jobs correspondientes quedan en `SENT`.

**Dependencies:** T3 · **Scope:** S (solo validación)

---

### T5: Controles — US4 escenarios 5–8 ✅

**Description:**
- **5:** desactivar las notificaciones de la app en Ajustes del moto. En el emulador, rechazar el diálogo `POST_NOTIFICATIONS`.
- **6:** apagar "Urgentes" en las preferencias.
- **7:** cerrar sesión en el servidor A y generar un aviso.
- **8:** levantar el servidor B (`:3041`) sin `PUSH_ENABLED`, vincularlo y revisar Ajustes y la bandeja.

**Acceptance criteria:**
- [x] En 5 y 6 no llega push, pero el aviso figura en la bandeja; Ajustes explica cómo activar el permiso.
- [x] En 7 no llega push del servidor A después del logout: su `MobileSession` queda con `revokedAt` y no se crean jobs nuevos para ese dispositivo.
- [x] En 8, Ajustes indica que el push no está configurado en B, la bandeja funciona y B no crea jobs.

**Verification:**
- [x] Capturas `evidencias/t5-*.png` y conteo de `MobilePushJob` por escenario.

**Dependencies:** T3 (T4 recomendado antes) · **Scope:** S

---

### Checkpoint B
- [x] Escenarios 1–3 y 5–8 con evidencia; lista de defectos (puede estar vacía)
- [ ] Revisión con el usuario antes de seguir

---

## Phase 3: Robustez y cierre

### T6: Dos servidores, reintentos y latencia — US4 escenarios 4 y 9, SC-002 ✅

**Description:**
- **4:** reiniciar el servidor B con Firebase, iniciar sesión en A y en B, generar un aviso en cada uno y tocar los dos.
- **9:** arrancar A con un `GOOGLE_APPLICATION_CREDENTIALS` inválido, generar un aviso, ver que el job vuelve a `PENDING` con `lastError`, y restaurar la credencial hasta que pase a `SENT`. Después corromper el token del dispositivo en la base QA y verificar que queda `FAILED` sin bloquear los otros jobs.
- **SC-002:** 10 avisos con la app cerrada, midiendo cuánto tarda cada uno desde que se crea hasta que se ve en el teléfono.

**Acceptance criteria:**
- [x] Los avisos de A y de B llegan, y cada tap abre la tarea en su servidor.
- [x] El reintento se recupera solo y el token inválido termina en `FAILED` sin afectar al resto.
- [x] Al menos 9 de 10 avisos llegan en menos de 1 minuto (si no, se documenta la causa, por ejemplo el ahorro de batería).

**Verification:**
- [x] Capturas `evidencias/t6-*.png`, salida SQL de los estados y tabla de latencias en `evidencias/README.md`.

**Dependencies:** T4, T5 · **Scope:** S

---

### T7: Corregir defectos (condicional) ✅

**Description:** por cada defecto de T4–T6, escribir primero un test que falle (Vitest o `flutter test`), después corregirlo y repetir el escenario real.

**Acceptance criteria:**
- [x] Cada defecto tiene su test de regresión y el escenario real pasa.
- [x] Suites completas en verde.

**Verification:** `npm test`, `npx tsc --noEmit`, `cd mobile && dart analyze lib test && flutter test`.

**Resultado:** 3 defectos corregidos (aviso en primer plano persistente, token mal formado reintentado, relojes mezclados en la cola). Ver [evidencias](evidencias/README.md).

**Dependencies:** T4–T6 · **Scope:** según el defecto; si uno pasa de M, se hace en una tarea o PR aparte

---

### T8: Evidencia y PR de cierre ✅

**Description:** escribir `evidencias/README.md` con un resumen por escenario (pasa/falla, fecha, dispositivo) y las limitaciones observadas. Marcar US4 como validada en Android en la spec y actualizar la sección "Notificaciones móviles" de `mobile/PLAN.md`. Abrir el PR.

**Acceptance criteria:**
- [x] Los 9 escenarios de US4 y SC-002 a SC-005 tienen resultado y evidencia.
- [x] `git ls-files` sin credenciales (SC-004); capturas sin tokens ni datos sensibles.
- [x] PR abierto con el resumen (sin mención a Claude).

**Verification:** revisión del usuario; `git ls-files | grep -iE "firebase|secret"`.

**Dependencies:** T6 (y T7 si hubo) · **Files:** `specs/065-notificaciones-moviles/{spec.md,evidencias/}`, `mobile/PLAN.md` · **Scope:** S

---

### Checkpoint C
- [x] SC-001 a SC-006 cumplidos
- [x] Suites en verde
- [x] PR de cierre listo para revisión
