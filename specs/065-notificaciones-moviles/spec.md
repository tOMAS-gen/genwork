# Feature Specification: Notificaciones móviles — bandeja, urgencia y push

**Feature Branch**: `tOMAS-gen/feat-mobile-notifications-special` (PR #29)

**Created**: 2026-10-25

**Status**: v1 implementada · spec aprobada 2026-10-25 · cierre (push real Android) pendiente

**Input**: User description: "continúa con el proceso de notificaciones" — formalizar lo ya implementado y definir el cierre: activar Firebase y validar push real.

## Clarifications

### Session 2026-10-25

- Q: ¿Qué cubre esta spec? → A: **Lo ya implementado + el cierre**. No hay funcionalidad nueva.
- Q: ¿Qué cuentas externas hay? → A: **Solo Google (Firebase)**. Apple Developer todavía no, así que iOS queda diferido.
- Q: ¿Firebase tiene costo? → A: Cloud Messaging es gratis sin importar el volumen. El único límite es de 600.000 mensajes/minuto por proyecto.
- Q: ¿Dónde y con qué se valida? → A: **Servidor local** con bases QA aisladas; **moto e40 físico** (Android 11) conectado por USB, más el emulador (Android 16) para el permiso en tiempo de ejecución.
- Q: ¿Keystore de release? → A: **Después**; no bloquea la validación con APK debug.
- Q: ¿Cómo se reparten los PR? → A: Docs al modelo privado dentro de #29 → merge → validación real en un PR chico con evidencia.
- Q: ¿Pueden usar push servidores de terceros? → A: **No. Decisión de producto: genwork es privado** y todos los servidores los administra el dueño. Hay un solo proyecto Firebase y la misma credencial de envío en cada servidor propio. No se comparte la credencial con nadie ni se construye un intermediario.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Modelo de distribución | genwork es privado; un único administrador para todos los servidores | Permite compartir un solo proyecto Firebase sin exponer la credencial |
| Proyecto Firebase | Uno solo, compilado en la app (`--dart-define-from-file`) | Un token FCM solo puede recibir envíos del proyecto con el que se generó |
| Credencial de envío | JSON de cuenta de servicio, montado fuera del repo en cada servidor propio | Con ella se puede mandar avisos a cualquier token del proyecto: nunca va en el APK/IPA ni en `NEXT_PUBLIC_*` |
| Sin Firebase configurado | Bandeja, contador en vivo y email siguen funcionando; solo falta el push con la app cerrada | Activación opcional y gradual |
| Intermediario para terceros | Fuera de alcance, sin planes | Se descarta por la decisión de producto anterior |
| iOS | Diferido hasta tener Apple Developer y Xcode completo | Hacen falta la clave APNs, perfiles de firma y un iPhone |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Bandeja de avisos en la app (Priority: P1) ✅ implementada

Como usuario interno, quiero ver en la app todos mis avisos (recordatorios disparados y tareas urgentes) para enterarme de lo pendiente aunque no tenga push.

**Independent Test**: disparar un recordatorio de una tarea que menciona al usuario y verificar que aparece en la bandeja con el contador actualizado.

**Acceptance Scenarios**:

1. **Given** un recordatorio de tarea disparado, **When** el usuario mencionado abre la bandeja, **Then** ve el aviso con título, fecha y estado no leído, y el contador lo incluye.
2. **Given** un aviso en la bandeja, **When** el usuario lo marca leído, lo descarta o lo pospone (1 h o mañana), **Then** el cambio es solo para ese usuario. Descartar o posponer también cancela los envíos push pendientes.
3. **Given** los filtros Recordatorios/Urgentes, **When** se aplica uno, **Then** solo se listan avisos de ese tipo, en páginas de 30.
4. **Given** un aviso, **When** el usuario lo toca, **Then** se abre la tarea solo si sigue teniendo acceso. Si no, se informa que no está disponible.

---

### User Story 2 — Marcar una tarea como urgente (Priority: P1) ✅ implementada

Como usuario con permiso de edición, quiero marcar una tarea como urgente desde su detalle para avisar a los responsables.

**Acceptance Scenarios**:

1. **Given** una tarea no urgente, **When** el usuario la marca urgente, **Then** se genera un aviso para cada destinatario.
2. **Given** una tarea urgente, **When** se desmarca, **Then** no se avisa a nadie. **When** se vuelve a marcar, **Then** se genera un aviso nuevo.
3. **Given** un usuario sin permiso de edición, **When** intenta marcarla, **Then** la API la rechaza y la app no ofrece el control.
4. **Given** el detalle de la tarea, **When** el usuario va a marcarla, **Then** ve cuántas personas recibirán el aviso.

---

### User Story 3 — Destinatarios por menciones y sectores (Priority: P1) ✅ implementada

**Acceptance Scenarios**:

1. **Given** una tarea con `@usuario`, `@sector` y `#sector`, **When** se dispara un aviso, **Then** lo reciben el usuario mencionado y los operadores de ambos sectores, sin duplicados.
2. **Given** usuarios CLIENT o READER entre los candidatos, **When** se resuelven los destinatarios, **Then** quedan excluidos.
3. **Given** un aviso ya disparado, **When** después cambian las menciones, **Then** no se agregan destinatarios a ese disparo. La próxima ocurrencia sí vuelve a resolverlos.
4. **Given** un disparo sin destinatarios, **When** se procesa, **Then** se consume sin envíos y sin error.
5. **Given** recordatorios que no están vinculados a tareas, **When** se disparan, **Then** conservan su alcance INDIVIDUAL/GROUP/GLOBAL.

---

### User Story 4 — Push al teléfono con la app cerrada (Priority: P1) 🟡 código listo · validación real pendiente

Como usuario, quiero recibir el aviso en el teléfono aunque la app esté cerrada, para no tener que abrirla a revisar.

**Independent Test**: con Firebase activado en un servidor, cerrar la app en un Android real, marcar una tarea urgente desde la web y verificar que el aviso llega y abre la tarea.

**Acceptance Scenarios**:

1. **Given** un teléfono con sesión iniciada y permiso concedido, **When** se genera un aviso con la app **cerrada**, **Then** llega una notificación del sistema con texto genérico, sin el nombre de la tarea.
2. **Given** la app en **segundo plano** o en **primer plano**, **When** se genera un aviso, **Then** se muestra sin duplicarse y la bandeja se actualiza.
3. **Given** una notificación recibida, **When** el usuario la toca, **Then** la app valida servidor, cuenta, sesión y acceso, y abre la tarea.
4. **Given** la app vinculada a dos servidores propios con Firebase, **When** cada uno genera un aviso, **Then** llegan ambos, y tocar cada uno abre el servidor correcto.
5. **Given** el permiso de notificaciones rechazado, **When** se genera un aviso, **Then** no llega push, la bandeja lo muestra y Ajustes explica cómo activar el permiso.
6. **Given** las preferencias del usuario con "Urgentes" apagado, **When** se marca urgente una tarea, **Then** no llega push pero el aviso está en la bandeja.
7. **Given** el usuario cierra sesión en un servidor, **When** ese servidor genera avisos nuevos, **Then** no llegan push de ese servidor.
8. **Given** un servidor sin `PUSH_ENABLED`/`FIREBASE_PROJECT_ID`, **When** el usuario abre Ajustes, **Then** la app indica que el push no está configurado en ese servidor y la bandeja sigue funcionando.
9. **Given** un fallo temporal de FCM, **When** el ticker reintenta, **Then** el envío pasa a SENT tras recuperarse. Si el token es inválido o se agotan 7 intentos, queda FAILED y no bloquea la cola.

---

### User Story 5 — iOS (Priority: P3) ⏸ diferida

Igual que US4, en iPhone. Se retoma cuando haya cuenta Apple Developer, clave APNs cargada en Firebase, Xcode completo y un iPhone. El código y los entitlements ya están en el proyecto; no se valida en esta etapa.

---

### Edge Cases

- **Token rotado por Firebase**: la app vuelve a registrarlo (`PUT /api/mobile/push-device`) y los envíos siguen llegando al token nuevo.
- **Mismo teléfono con otra cuenta en el mismo servidor**: el dispositivo se reasigna a la sesión nueva; la cuenta anterior deja de recibir.
- **Pérdida de acceso a la tarea** después del envío: tocar el aviso no abre la tarea y lo informa.
- **Varias réplicas del backend**: los leases impiden enviar dos veces el mismo job.
- **Avisos ya aceptados por FCM al cerrar sesión**: pueden llegar igual (limitación de FCM). El tap se descarta localmente.
- **App forzada a detenerse en Android**: el sistema puede no entregar push. Es una limitación conocida, no un defecto.

## Requirements *(mandatory)*

### Implementados (v1)

- **FR-001**: La bandeja DEBE ser por usuario y por servidor, con lectura, descarte, posposición, filtros por tipo y paginación de 30.
- **FR-002**: Los destinatarios DEBEN resolverse con el motor de permisos existente: `@usuario`, operadores de `@sector` y `#sector`, sin duplicados, excluyendo CLIENT/READER.
- **FR-003**: Marcar urgente DEBE exigir permiso de edición y generar un evento por cada transición false → true.
- **FR-004**: El push DEBE pasar por una cola en PostgreSQL con estados PENDING/SENDING/SENT/FAILED/CANCELLED, leases de 2 minutos, backoff exponencial (30 s a 1 h) y como máximo 7 intentos.
- **FR-005**: Sin `PUSH_ENABLED=true` y `FIREBASE_PROJECT_ID`, NO DEBEN acumularse envíos para una activación posterior. La migración NO DEBE enviar avisos históricos.
- **FR-006**: Los endpoints de dispositivo DEBEN exigir un Bearer de `MobileSession` vigente; una cookie no alcanza.
- **FR-007**: El contenido visible en la pantalla bloqueada DEBE ser genérico.
- **FR-008**: Los endpoints anteriores de recordatorios DEBEN seguir funcionando para clientes móviles viejos.

### Cierre (esta etapa)

- **FR-009**: La documentación DEBE reflejar el modelo privado: un único proyecto Firebase, la misma credencial en cada servidor propio y la prohibición de compartirla. Hay que quitar las menciones a "instalaciones de terceros".
- **FR-010**: DEBE existir una guía paso a paso, para alguien sin experiencia en Firebase, que cubra crear el proyecto, registrar la app Android, generar la credencial de envío, armar `mobile/config/firebase.android.json` y configurar el servidor.
- **FR-011**: Los escenarios 1–9 de US4 DEBEN validarse en un Android real, o en un emulador con Google Play, contra un servidor con Firebase activado, guardando evidencia (capturas y estados de `MobilePushJob`).
- **FR-012**: Ningún archivo de credenciales (`firebase.android.json`, `firebase.ios.json`, JSON de cuenta de servicio) DEBE quedar commiteado.

### Key Entities

- **MobileNotification**: aviso de la bandeja de un usuario. `kind` REMINDER|URGENT, tarea o entrega asociada, `readAt`/`dismissedAt`, y versión de push. Único por `(sourceKey, userId)`.
- **MobilePushDevice**: instalación de la app registrada en una `MobileSession`, con `token` FCM único y `platform` android|ios.
- **MobilePushJob**: envío de una versión de un aviso a un dispositivo, con estado, intentos, lease y último error.
- **PushPreference**: switches `reminders`/`urgent` por usuario en cada servidor.
- **ReminderNotificationDispatch**: marca transaccional de que una ocurrencia de recordatorio ya generó sus avisos.
- **NotificationConfig**: fecha de activación, para excluir el historial anterior.

## Tech Stack

- Backend: Next.js 16 (App Router), Prisma + PostgreSQL, `firebase-admin@^14.5` (envío FCM HTTP v1 con `applicationDefault()`), Vitest.
- App: Flutter, Riverpod 3, go_router 17, dio, `firebase_messaging` 17 (registration tokens, compatibles con `send({token})`), notificaciones locales con canales Android "Recordatorios" y "Tareas urgentes".

## Commands

```sh
# Backend
npm test
npx tsc --noEmit
npm run lint

# Integración PostgreSQL (base aislada cuyo nombre contenga genwork_notifications_qa)
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5433/genwork_notifications_qa \
NOTIFICATIONS_INTEGRATION=true npx vitest run tests/integration/mobile-notifications.test.ts

# App
cd mobile && dart analyze lib test && flutter test
cd mobile && flutter build apk --debug --dart-define-from-file=config/firebase.android.json

# Servidor con push activado (fuera del repo)
PUSH_ENABLED=true FIREBASE_PROJECT_ID=<proyecto> \
GOOGLE_APPLICATION_CREDENTIALS=/ruta/fuera/del/repo/firebase.json npm run dev

# Observabilidad de la cola
psql "$DATABASE_URL" -c 'SELECT status, count(*) FROM "MobilePushJob" GROUP BY status;'
```

> `dart analyze` corrido junto con `flutter test` dio falsos positivos (15k issues). Correrlo solo.

## Project Structure

```
src/server/notifications/       → recipients.ts (audiencia), service.ts (bandeja/eventos), push.ts (cola FCM)
src/app/api/me/notifications/   → bandeja, destino y preferencias
src/app/api/mobile/push-device/ → registro de dispositivo
src/app/api/tasks/[id]/         → urgencia (PATCH) y vista previa de destinatarios
prisma/migrations/20261017120000_mobile_notifications/ → migración aditiva
mobile/lib/core/notifications/  → push_service.dart (Firebase, permisos, taps)
mobile/lib/features/notifications/ → bandeja y preferencias
mobile/config/                  → firebase.example.json (versionado); los reales están en .gitignore
tests/unit/, tests/integration/, mobile/test/ → pruebas
docs/mobile-notifications.md    → guía de activación y contrato API
specs/065-notificaciones-moviles/ → esta spec y su evidencia de cierre
```

## Code Style

Seguir los archivos existentes. Por ejemplo, el reintento de la cola en `src/server/notifications/push.ts`:

```ts
export function retryDelay(attempts: number) {
  return Math.min(3600, 30 * 2 ** Math.min(attempts, 7)) * 1000;
}
```

Funciones chicas, nombres en inglés en el código, textos de UI y documentación en español, errores API con el contrato `{error:{code,message}}`.

## Testing Strategy

- **Unit (Vitest)**: resolución de destinatarios, reglas de urgencia y backoff. Corren sin base ni red.
- **Integración (Vitest + PostgreSQL real, FCM simulado)**: transacciones, leases, cancelación, migración. Son optativas, con una base exclusiva.
- **Flutter (widget/unit)**: bandeja, preferencias, push_service, 360 dp, texto al 150 %, temas claro y oscuro.
- **Manual E2E (cierre)**: escenarios US4 1–9 en Android real con Firebase real. La evidencia va en `specs/065-notificaciones-moviles/evidencias/`. **Ninguna prueba simulada certifica la entrega real.**

## Boundaries

- **Always**: correr `npm test`, `tsc`, `dart analyze` y `flutter test` antes de cada commit. Mantener las credenciales fuera del repo. Texto genérico en pantalla bloqueada. Commits sin co-autoría de Claude.
- **Ask first**: tocar el servidor de producción o desplegar, cambios de esquema Prisma, nuevas dependencias, generar o subir el keystore de release, crear o modificar recursos en la consola de Firebase en nombre del usuario.
- **Never**: commitear o pegar en el chat el JSON de cuenta de servicio, poner credenciales de servidor en la app o en `NEXT_PUBLIC_*`, compartir la credencial con terceros, reenviar el historial de avisos, usar la base de trabajo para las pruebas de integración.

## Success Criteria *(mandatory)*

- **SC-001** ✅: suites backend (1532) y Flutter (455) en verde; `tsc` y `dart analyze` sin hallazgos (verificado el 2026-10-25, PR #29).
- **SC-002**: con la app cerrada en Android, un aviso urgente llega en menos de 1 minuto en al menos 9 de 10 intentos (el ticker procesa cada 30 s) y su job queda SENT.
- **SC-003**: los 9 escenarios de US4 pasan en Android real, con evidencia guardada.
- **SC-004**: `git ls-files` no contiene ningún archivo de credenciales de Firebase.
- **SC-005**: la guía de activación permite a alguien sin experiencia previa en Firebase dejar un servidor enviando push sin más ayuda.
- **SC-006**: PR #29 mergeado con la documentación actualizada al modelo privado.

## Open Questions

Resueltas (ver Clarifications). Nota: en Android 11 no existe el permiso `POST_NOTIFICATIONS`; el escenario 5 de US4 se valida desactivando las notificaciones de la app en Ajustes del teléfono, y el diálogo de permiso del sistema se valida en el emulador Android 16.
