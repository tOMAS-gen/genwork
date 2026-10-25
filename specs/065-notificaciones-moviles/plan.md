# Implementation Plan: Notificaciones móviles — cierre Android

**Spec**: [spec.md](spec.md) · **Tasks**: [tasks.md](tasks.md) · **Created**: 2026-10-25

## Overview

La v1 ya está implementada (PR #29). Este plan cubre el cierre:

1. Llevar la documentación al modelo privado.
2. Escribir una guía de Firebase para alguien que no lo usó nunca.
3. Validar el push real en el moto e40 y en el emulador contra servidores locales.
4. Corregir con TDD los defectos que aparezcan.

iOS queda fuera.

## Architecture Decisions

- **Sin código nuevo por defecto.** Este cierre valida lo existente. Solo se toca código si una validación falla, y en ese caso primero se escribe un test que reproduzca el defecto.
- **Servidores locales accesibles desde el teléfono con `adb reverse`.** `localhost:3040` (servidor A) y `localhost:3041` (servidor B) se mapean al Mac por USB. Así `AUTH_URL=http://localhost:<puerto>` coincide con la URL vinculada en la app, sin exponer nada en la red local y sin HTTPS. El login usa `DEV_AUTH=true`, sin Google OAuth.
- **Bases aisladas.** `genwork_notifications_qa` para el servidor A y `genwork_notifications_qa_b` para el B. Nunca la base de trabajo.
- **Credenciales en `.firebase-secrets/`** (ya en `.gitignore`) y `mobile/config/firebase.android.json` (también ignorado). Claude verifica que existan y lee solo `project_id`; nunca imprime la clave privada.
- **Manejo del teléfono por `adb`** para tocar, sacar capturas, abrir la barra de notificaciones, forzar el cierre y cambiar ajustes. Las acciones de la app se hacen con Marionette cuando esté en modo debug. Evidencia en `evidencias/`.
- **Dos PR.** El primero agrega la documentación y esta spec a #29, y se mergea. El segundo, desde main, trae la evidencia de validación y los fixes si hacen falta.

## Dependency Graph

```
T1 docs + guía (PR #29) ──► T2 crear Firebase (usuario) ──► T3 entorno local + APK con Firebase
                    │                                              │
                    └──► merge #29 (usuario)                       ├──► T4 recepción: cerrada / fondo / primer plano / tap
                                                                   ├──► T5 control: permiso / preferencias / logout / sin Firebase
                                                                   └──► T6 dos servidores + reintentos + latencia
                                                                              │
                                                     T7 fixes (si aparecen) ◄─┘
                                                                              │
                                                                   T8 evidencia + PR de cierre
```

T4, T5 y T6 dependen de T3 y se hacen en ese orden, porque comparten el teléfono y los servidores. T7 se hace solo si alguna falla.

## Task List

Detalle y criterios en [tasks.md](tasks.md).

### Phase 1: Documentación y activación
- [x] T1: Documentar el modelo privado y la guía paso a paso de Firebase (PR #29)
- [x] T2: Crear el proyecto Firebase y dejar las credenciales locales (**usuario**, guiado por T1)

### Checkpoint A
- [ ] PR #29 mergeado (lo hace el usuario)
- [x] Credenciales presentes y fuera de `git ls-files`

### Phase 2: Validación real
- [x] T3: Levantar el entorno local con push activado e instalar el APK con Firebase en el moto e40 y el emulador
- [x] T4: Validar la recepción (US4 escenarios 1–3)
- [x] T5: Validar los controles del usuario y el servidor sin Firebase (US4 escenarios 5–8)

### Checkpoint B
- [x] Los escenarios 1–3 y 5–8 tienen evidencia; los defectos están listados
- [ ] Revisión con el usuario

### Phase 3: Robustez y cierre
- [x] T6: Dos servidores, reintentos y latencia (US4 escenarios 4 y 9, SC-002)
- [x] T7: Corregir los defectos encontrados (condicional, con TDD)
- [x] T8: Escribir la evidencia, actualizar la spec y abrir el PR de cierre

### Checkpoint C
- [x] SC-001 a SC-006 cumplidos
- [x] Suites en verde

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| El usuario se traba en la consola de Firebase | Alto (bloquea todo) | Guía con capturas y nombres exactos de cada botón. Claude verifica cada archivo apenas se crea |
| Se filtra la credencial (chat, commit, log) | Alto | Pedir que la guarde directo en `.firebase-secrets/`, no pegarla nunca. Claude lee solo `project_id`. Antes de cada commit, chequear `git ls-files` |
| Android 11 del moto e40 no tiene `POST_NOTIFICATIONS` | Bajo | Validar el diálogo de permiso en el emulador Android 16 y en el moto desactivar desde Ajustes |
| Ahorro de batería de Motorola retrasa o bloquea push con la app cerrada | Medio | Registrar si pasa. Probar con y sin optimización de batería. Es una limitación del sistema y se documenta, no se "arregla" |
| `adb reverse` se corta si se desconecta el USB | Bajo | Volver a ejecutarlo al reconectar. El push no depende de eso, solo el tap que abre la tarea |
| FCM acepta pero no entrega (no hay confirmación de entrega) | Medio | La evidencia es la notificación visible en el teléfono, no el estado SENT |
| Bugs reales en el flujo push | Medio | T7 con TDD. Si son grandes, se separan en otro PR |

## Open Questions

Ninguna bloqueante.
