# Notificaciones móviles

La app ofrece una bandeja persistente y push opcional en Android/iOS. El servidor
resuelve los destinatarios y los horarios; Firebase solamente transporta mensajes.
No se implementa push web ni un intermediario para instalaciones de terceros.

## Reglas

- `@usuario`, operadores de `@sector` y operadores de `#sector`, sin duplicados.
  Se usa el motor de permisos existente; CLIENT/READER quedan excluidos.
- La urgencia se activa desde el detalle, exige permiso de edición y genera un
  evento por transición false → true. Desactivar no avisa; reactivar crea otro.
- Los recordatorios de tareas usan esas referencias al dispararse. Su alcance
  sigue determinando quién administra el recordatorio, pero no amplía destinatarios.
  Los demás recordatorios conservan INDIVIDUAL/GROUP/GLOBAL.
- Los disparos de tareas se registran transaccionalmente: cambiar menciones
  después no agrega destinatarios retroactivamente. Cada próxima ocurrencia
  vuelve a resolverlos. Sin destinatarios, el disparo se consume sin envíos.
- Lectura, descarte y posposición son por usuario. Descartar/posponer desde los
  endpoints anteriores actualiza también la nueva bandeja y cancela envíos pendientes.
- Todos los servidores vinculados con sesión iniciada pueden enviar push. Tocar
  un aviso valida servidor guardado, cuenta, sesión y acceso antes de abrir la tarea.
- La pantalla bloqueada muestra texto genérico, sin nombres de tareas. Los avisos
  ya aceptados por FCM no pueden retirarse de manera garantizada al cerrar sesión.
  Los nuevos envíos se bloquean al revocar la sesión; los taps locales se descartan.

## Configuración del servidor

1. Crear un proyecto Firebase compartido por tus instalaciones y registrar las apps:
   Android `ar.net.gen.genwork_mobile`; iOS `ar.net.gen.genworkMobile`.
2. Habilitar FCM y una identidad de servicio con permiso de envío. Montar su JSON
   **fuera del repositorio**, solo en los servidores que administrás. Nunca dentro
   del APK/IPA ni en variables `NEXT_PUBLIC_*`.
3. Configurar `GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase.json`,
   `FIREBASE_PROJECT_ID=<proyecto>` y `PUSH_ENABLED=true`.
   `AUTH_URL` debe ser la URL pública usada para vincular ese servidor en la app.
4. Aplicar `npx prisma migrate deploy` antes de arrancar el backend actualizado.
   La migración es aditiva y excluye entregas históricas del envío push.
5. El proceso Node debe permanecer activo: el ticker existente procesa cada 30 s.
   La cola usa PostgreSQL y leases para admitir varias réplicas y recuperarse de
   caídas. Un deploy serverless sin proceso persistente requiere otro ejecutor.

Sin `PUSH_ENABLED=true` y `FIREBASE_PROJECT_ID`, la bandeja funciona y los nuevos
avisos no acumulan envíos para una activación posterior. No se reenvía todo el
historial al registrar un teléfono nuevo. Una aceptación de FCM no prueba entrega
al dispositivo; la cola distingue PENDING/SENDING/SENT/FAILED/CANCELLED.

## Configuración de la app

Copiar `mobile/config/firebase.example.json` a `firebase.android.json` y a
`firebase.ios.json`, con los valores de **cada app** registrados en Firebase.
La inicialización usa FirebaseOptions explícitas; no requiere guardar credenciales
de servidor ni google-services.json en el proyecto.

```sh
cd mobile
flutter build apk --release --dart-define-from-file=config/firebase.android.json
flutter build ipa --release --dart-define-from-file=config/firebase.ios.json
```

Sin esos defines, la app arranca con bandeja y preferencias, y explica que push
no está configurado. Firebase Messaging 17 todavía expone registration tokens:
se usa ese contrato compatible con `firebase-admin.send({token})`, no FID.

Android: permiso POST_NOTIFICATIONS y canales Recordatorios/Tareas urgentes.
Requiere servicios de Google. El usuario controla sonido e importancia desde
los ajustes del teléfono. La firma Android de release del proyecto sigue siendo
la de desarrollo: preparar el keystore antes de distribuir.

iOS: una cuenta Apple Developer debe habilitar Push Notifications en el App ID,
generar la clave APNs y cargarla en Firebase. El proyecto agrega el entitlement
`aps-environment` (development en Debug, production en Profile/Release) y
`remote-notification`. Conservar el swizzling de Firebase habilitado. Generar
perfiles de firma con esa capacidad. Hace falta Xcode completo y un iPhone para
validar la entrega real.

Referencias oficiales:
[Configurar Flutter/FCM](https://firebase.google.com/docs/cloud-messaging/flutter/get-started),
[recepción y restricciones del ciclo de vida](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages).

## Contrato API

Todos los endpoints nuevos requieren SUPERADMIN/MEMBER. Dispositivos exigen
además un Bearer de MobileSession vigente y propio; una cookie no alcanza.

| Endpoint | Contrato |
| --- | --- |
| `PUT /api/mobile/push-device` | `{installationId: UUID, token, platform: android\|ios, enabled}`; upsert, rotación y reasignación de cuenta. Devuelve `{configured}`. |
| `DELETE /api/mobile/push-device` | `{installationId}`; elimina únicamente la asociación de la sesión actual. |
| `GET /api/me/notifications` | `?kind=REMINDER\|URGENT&cursor=<id>`; `{notifications, unreadCount, nextCursor}`, páginas de 30. |
| `GET /api/me/notifications/:id` | Destino autorizado: `{task}` con permisos y subtareas visibles, o `{reminderId, linkType, linkId}`. |
| `PATCH /api/me/notifications/:id` | `{action: READ\|DISMISS}`; 204. |
| `GET /api/me/notifications/preferences` | `{reminders, urgent, configured}`. |
| `PATCH /api/me/notifications/preferences` | `{reminders: boolean, urgent: boolean}` por usuario/servidor. |
| `GET /api/tasks/:id/notifications` | `{task, recipientCount}` para detalle y vista previa de destinatarios. |
| `PATCH /api/tasks/:id` | Nueva variante `{isUrgent: boolean, editContext: work\|sector}`. |

Las notificaciones incluyen `id`, `kind`, `title`, `dueAt`, `readAt` y `deliveryId`.
Posponer sigue usando `PATCH /api/reminders/deliveries/:id` con
`{action:SNOOZE,preset:1h|tomorrow}`. La tarea agrega `isUrgent`, por defecto false.
Los endpoints anteriores siguen disponibles para clientes móviles viejos.

## Verificación y operación

```sh
npm test
npx tsc --noEmit
cd mobile && dart analyze && flutter test
```

Las pruebas PostgreSQL son optativas para no tocar una base de trabajo. Crear una
base local vacía cuyo nombre incluya `genwork_notifications_qa`, aplicar el esquema
y la migración, y ejecutar desde la raíz:

```sh
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5433/genwork_notifications_qa \
NOTIFICATIONS_INTEGRATION=true npx vitest run tests/integration/mobile-notifications.test.ts
```

Usar una base exclusiva de pruebas **sin otros usuarios**. Los tests crean y
eliminan solo sus fixtures; simulan FCM, pero usan transacciones y locks reales.
Para probar la migración sobre una base vacía también se puede aplicar primero
el esquema anterior con Prisma y después el SQL de la nueva migración.

Consultar estados y retrasos en PostgreSQL (no registrar tokens):

```sql
SELECT status, count(*), min("createdAt") FROM "MobilePushJob" GROUP BY status;
SELECT "lastError", count(*) FROM "MobilePushJob"
WHERE status = 'FAILED' GROUP BY "lastError";
```

Verificar en Android e iPhone: permiso rechazado/aceptado, primer plano, segundo
plano, inicio desde aviso, cambio de servidor, cierre de sesión, pérdida de acceso,
rotación del token, posposición, desconexión y recuperación. Respetar las
restricciones del sistema: detener forzosamente la app puede impedir recepción.
No hay alarmas críticas ni garantía de recepción inmediata/exactamente una vez.
