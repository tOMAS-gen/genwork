# Evidencia: push real en Android (spec 065)

**Fecha**: 2026-10-25 · **Firebase**: proyecto `genwork-43383`, app `ar.genwork.mobile`
**Dispositivos**: moto e40 físico (Android 11, `ZE2234JG9T`) y emulador Android 16 (`emulator-5554`)
**Servidores**: dos `next dev` locales con bases PostgreSQL aisladas: A `:3040` (`genwork_notifications_qa`) y B `:3041` (`genwork_notifications_qa_b`). Accesibles desde el teléfono con `adb reverse`. Login `DEV_AUTH` como `admin@test.local`.
**Disparo**: `PATCH /api/tasks/:id {isUrgent:true}` con una sesión API aparte del mismo usuario. Las tareas mencionan `@admin`.

Las capturas de la barra de notificaciones están recortadas al aviso de genwork, sin las notificaciones personales del teléfono.

## US4: resultados

| # | Escenario | Resultado | Evidencia |
|---|---|---|---|
| 1 | App cerrada (deslizada de recientes, sin proceso) | ✅ Llega en el canal "Tareas urgentes" con texto genérico: *"genwork · Tenés un aviso de tarea urgente"* | `t4-1-app-cerrada-barra.png` |
| 2 | App en segundo plano | ✅ Llega en 6 s | `t4-2-segundo-plano-barra.png` |
| 2 | App en primer plano | ✅ No se duplica en el sistema. Aviso dentro de la app "Nuevo aviso · servidor · Ver" y la bandeja se actualiza sola | `t4-3-primer-plano.png` |
| 3 | Tocar la notificación con la app cerrada | ✅ Abre la Tarea A1 en el servidor correcto y la marca leída | `t4-1-tap-abre-tarea.png` |
| 4 | Dos servidores con Firebase | ✅ Llegan ambos avisos. Con la app en A, tocar el de B cambia a B y abre la Tarea B2. El de A abre la A7 | `t6-4-*.png` |
| 5 | Notificaciones apagadas en Ajustes (moto) | ✅ La app informa al servidor (`enabled=false`), no se crean envíos, el aviso queda en la bandeja y la app explica cómo activarlas. Al reactivarlas vuelve a `enabled=true` | `t5-5-permiso-apagado-ajustes-app.png` |
| 5 | Diálogo `POST_NOTIFICATIONS` rechazado (emulador) | ✅ Mismo resultado: dispositivo `enabled=false` y explicación en Preferencias | `t5-5-emulador-*.png` |
| 6 | Preferencia "Tareas urgentes" apagada | ✅ `urgent:false`, sin envíos, el aviso queda en la bandeja | `t5-6-preferencia-urgentes-off.png` |
| 7 | Cerrar sesión en A | ✅ Sesión con `revokedAt` y sin envíos posteriores | `t5-7-sin-sesion.png` |
| 8 | Servidor B sin `PUSH_ENABLED` | ✅ `configured:false`, "El servidor todavía no tiene habilitado el envío al teléfono", bandeja operativa, 0 envíos | `t5-8-servidor-sin-firebase.png` |
| 9 | Credencial inválida en el servidor | ✅ Envío en `PENDING` con `app/invalid-credential` y backoff. Al restaurar la credencial pasa a `SENT` (3.er intento) | SQL abajo |
| 9 | Token mal formado | ✅ (tras corregirlo, ver Defectos) `FAILED` en el 1.er intento, sin bloquear la cola: B siguió enviando. Al abrir la app se restaura el token real | SQL abajo |

```
-- credencial inválida → restaurada
PENDING | attempts 2 | app/invalid-credential   →   SENT | attempts 3
-- token corrupto, con la corrección
Tarea A11 | FAILED | 1 | messaging/invalid-argument
```

## SC-002: latencia con la app cerrada (moto e40)

Tiempo desde el `PATCH` hasta que el aviso aparece en el sistema, en 10 avisos seguidos:

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| 20 s | 30 s | 28 s | 29 s | 31 s | 29 s | 29 s | 31 s | 29 s | 29 s |

**10 de 10 llegaron en menos de 1 minuto** (máximo 31 s). Casi todo el tiempo es la espera del ticker de 30 s. La entrega de FCM fue de ~1–2 s. No se observó demora por el ahorro de batería de Motorola.

## Defectos hallados y corregidos (T7)

1. **El aviso en primer plano no se cerraba nunca.** En Flutter 3.44, una `SnackBar` con acción persiste hasta que se descarta. "Nuevo aviso · localhost:3040" seguía visible después de cerrar sesión y de cambiar al servidor B. Se corrigió con `persist: false`. Test: `mobile/test/features/push_listener_snackbar_test.dart`.
2. **Un token mal formado se reintentaba 7 veces durante horas.** FCM HTTP v1 responde `messaging/invalid-argument` (400), que la cola trataba como falla temporal. Ahora queda `FAILED` de inmediato y el dispositivo no se desactiva, porque ese código también puede deberse al mensaje. Test: `tests/unit/mobile-push-errors.test.ts` y un caso de integración.
3. **Relojes mezclados en la cola.** `dispatchPush` comparaba `dueAt` (Node) con `NOW()` de PostgreSQL. Con la base 1–2 ms atrasada (medido en 99 de 100 muestras), un aviso recién creado esperaba al siguiente tick. Por eso la suite de integración fallaba en 3 de 4 corridas. Ahora usa el mismo `now`: 8 de 8 corridas en verde.

## Observaciones fuera de alcance

- Con contador, la campana del encabezado expone como etiqueta accesible solo el número ("19") en lugar de "Notificaciones". TalkBack no anuncia qué es.
- Las capturas son de builds debug con `DEV_AUTH`. La firma de release y el login con Google quedan para la distribución.
- iOS no se validó (spec: diferido).
