# Notificaciones móviles

La app ofrece una bandeja persistente y push opcional en Android/iOS. El servidor
resuelve los destinatarios y los horarios; Firebase solamente transporta mensajes.
No se implementa push web.

## Modelo de distribución: genwork es privado

Todos los servidores de genwork los administra una sola persona; no hay
instalaciones de terceros. Por eso alcanza con **un único proyecto Firebase**:

- La app se compila con ese proyecto, y cada token FCM que genera solo acepta
  envíos de ese proyecto.
- Cada servidor propio recibe una copia de la **misma credencial de envío**
  (JSON de cuenta de servicio). Un teléfono vinculado a varios servidores
  recibe avisos de todos.
- La credencial **nunca se comparte**: con ella se puede mandar cualquier aviso
  a cualquier teléfono con la app, y revocarla obliga a rotarla en todos los
  servidores. Tampoco se construye un intermediario para terceros.
- Cloud Messaging no tiene costo. El límite es de 600.000 mensajes por minuto por
  proyecto, compartido entre todos los servidores.

Sin Firebase configurado, la bandeja, el contador en vivo y los emails siguen
funcionando. Solo falta el aviso en el teléfono con la app cerrada.

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

## Activación de Firebase paso a paso

Se hace una sola vez y sirve para todos los servidores. Hace falta una cuenta de
Google; no se carga tarjeta. Los nombres de botones pueden variar levemente.

> ⚠️ **La clave de la cuenta de servicio (paso 4) es un secreto.** No pegarla en
> chats, issues ni commits, ni mandarla por mail. Guardarla solo en
> `.firebase-secrets/` (ignorado por git) y en los servidores propios.

1. **Crear el proyecto.** Entrar a <https://console.firebase.google.com> y
   tocar **Crear un proyecto**. Nombre sugerido: `genwork`. Google Analytics
   no hace falta: desactivarlo. Tocar **Crear proyecto** y esperar.
2. **Registrar la app Android.** En la portada del proyecto, tocar el ícono de
   Android (**Agregar app**). Datos:
   - Nombre del paquete: `ar.net.gen.genwork_mobile` (exacto).
   - Sobrenombre: `genwork Android`.
   - SHA-1: dejar vacío (no lo usa push).

   Tocar **Registrar app** y después **Descargar google-services.json**. Los
   pasos siguientes del asistente (agregar SDK y Gradle) se saltean con
   **Siguiente** y **Ir a la consola**: la app ya los resuelve.
3. **Confirmar Cloud Messaging.** Engranaje ⚙️ → **Configuración del proyecto** →
   pestaña **Cloud Messaging**. *API de Firebase Cloud Messaging (V1)* tiene que
   decir **Habilitada**. Si no, usar el menú ⋮ de esa fila para habilitarla.
4. **Generar la credencial de envío.** En la misma configuración, abrir la pestaña
   **Cuentas de servicio** → **Generar nueva clave privada** → **Generar clave**.
   Se descarga un JSON.
5. **Guardar los archivos.** En la raíz del repo, crear `.firebase-secrets/` y
   mover ahí los dos archivos con estos nombres exactos:
   - `.firebase-secrets/google-services.json` (paso 2)
   - `.firebase-secrets/firebase.json` (paso 4, el secreto)
6. **Generar la configuración de la app** desde la raíz del repo:

   ```sh
   node -e '
   const g = require("./.firebase-secrets/google-services.json");
   const c = g.client.find(c => c.client_info.android_client_info.package_name === "ar.net.gen.genwork_mobile");
   require("fs").writeFileSync("mobile/config/firebase.android.json", JSON.stringify({
     FIREBASE_PROJECT_ID: g.project_info.project_id,
     FIREBASE_API_KEY: c.api_key[0].current_key,
     FIREBASE_APP_ID: c.client_info.mobilesdk_app_id,
     FIREBASE_SENDER_ID: g.project_info.project_number,
   }, null, 2) + "\n");'
   ```

   Estos valores identifican la app y viajan dentro del APK: no son secretos.
7. **Verificar** que nada quedó versionado: `git status --short` no debe listar
   `.firebase-secrets/` ni `firebase.android.json`.

iOS necesita además una cuenta Apple Developer: registrar la app
`ar.net.gen.genworkMobile` en el mismo proyecto y cargar la clave APNs (ver
**Configuración de la app**).

## Configuración del servidor

1. Copiar `.firebase-secrets/firebase.json` a cada servidor propio, **fuera del
   repositorio** (por ejemplo, como secreto de Docker). Nunca va dentro del
   APK/IPA ni en variables `NEXT_PUBLIC_*`.
2. Configurar `GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase.json`,
   `FIREBASE_PROJECT_ID=<proyecto>` y `PUSH_ENABLED=true`.
   `AUTH_URL` debe ser la URL pública usada para vincular ese servidor en la app.
3. Aplicar `npx prisma migrate deploy` antes de arrancar el backend actualizado.
   La migración es aditiva y excluye entregas históricas del envío push.
4. El proceso Node debe permanecer activo: el ticker existente procesa cada 30 s.
   La cola usa PostgreSQL y leases para admitir varias réplicas y recuperarse de
   caídas. Un deploy serverless sin proceso persistente requiere otro ejecutor.

Sin `PUSH_ENABLED=true` y `FIREBASE_PROJECT_ID`, la bandeja funciona y los nuevos
avisos no acumulan envíos para una activación posterior. No se reenvía todo el
historial al registrar un teléfono nuevo. Una aceptación de FCM no prueba entrega
al dispositivo; la cola distingue PENDING/SENDING/SENT/FAILED/CANCELLED.

## Configuración de la app

`mobile/config/firebase.android.json` se genera en el paso 6 de la activación.
Para iOS, copiar `mobile/config/firebase.example.json` a `firebase.ios.json` con
los valores de la app iOS. Ambos están en `.gitignore`. La inicialización usa
FirebaseOptions explícitas: `google-services.json` no se versiona ni se agrega
al proyecto Android.

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
