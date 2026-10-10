# genwork móvil — instrucciones para agentes

App Flutter de genwork (Android + iOS). Leé primero [`PLAN.md`](PLAN.md): decisiones,
qué está hecho y las tareas de UI (fase 3, `UI-01` … `UI-14`).

Para el producto y la marca: [`../PRODUCT.md`](../PRODUCT.md) y
[`../DESIGN.md`](../DESIGN.md). El contrato de la API está en
[`docs/api-contract.md`](docs/api-contract.md).

Cualquier cambio visual sigue [`docs/ui-genstock-parity-plan.md`](docs/ui-genstock-parity-plan.md)
(tokens, componentes portados de genstock y tareas DS-xx). Si contradice las reglas de abajo, gana ese documento.

## Arquitectura (no la cambies sin acordarlo)

```
lib/
  main.dart, app.dart        bootstrap, ProviderScope, MaterialApp.router
  core/
    auth/                    PKCE, sesión (SessionController), token seguro
    config/                  URL del sistema (primer inicio)
    network/                 ApiClient (dio + Bearer) y ApiException
    router/                  go_router, rutas, redirección por sesión
    live/                    cliente SSE
    theme/                   tema ← acá va el design system (UI-01)
    util/                    formato de fechas/colores, TipTap ↔ texto
    providers.dart           providers base y repositorios
  data/
    models/                  modelos (fromJson a mano)
    repositories/            un repositorio por recurso de la API
  features/<feature>/
    *_providers.dart         datos de la feature (Riverpod)
    *_screen.dart / *_sheet.dart / *_dialog.dart   ← presentación
  shared/widgets/            componentes reutilizables ← presentación
```

Flujo de datos: pantalla → `ref.watch(<provider>)` → repositorio → `ApiClient`.
Las mutaciones de tareas pasan por `TaskActions` (`features/tasks/task_actions.dart`),
que invalida las listas afectadas. El SSE (`features/shell/live_refresher.dart`)
también invalida al llegar eventos.

## Reglas para el trabajo de UI (Codex)

1. **Solo presentación.** Podés editar `lib/core/theme/`, `lib/shared/widgets/` y los
   `*_screen.dart`, `*_sheet.dart`, `*_dialog.dart` de `lib/features/`. No cambies
   modelos, repositorios, providers, router, auth ni el cliente HTTP. Si una
   pantalla necesita un dato que no existe, anotalo en `PLAN.md` → sección
   "Pedidos de datos" y seguí con lo demás.
2. **No rompas comportamiento.** Cada pantalla ya funciona: pull-to-refresh,
   reintentar, permisos (`canEdit`, `canOperate`, `canToggle`), estados de carga y
   error. El rediseño los conserva.
3. **Mantené las `ValueKey`.** Las usan los tests y la verificación con Marionette.
   Si agregás controles interactivos nuevos, ponéles una `ValueKey('<pantalla>_<accion>')`.
4. **Textos en castellano rioplatense** (vos: "Ingresá", "Probá de nuevo"). Sin
   anglicismos de UI cuando hay palabra en castellano.
5. **Estilo genwork** (ver `DESIGN.md` / `PRODUCT.md`): práctico y limpio, la
   información se entiende de un vistazo. Pills y badges **rectangulares** (radio
   6–8 px, no ovaladas). Para elegir colores, paleta visual, nunca nombres. Azul de
   marca `#3b5bfa` (claro) / `#5b7fff` (oscuro); fondos oscuros acromáticos.
6. **Claro y oscuro** completos, contraste WCAG AA, objetivos táctiles ≥ 48 dp,
   texto escalable.
7. **Dependencias**: podés sumar paquetes puramente visuales (íconos, skeletons,
   splash, launcher icons). No sumes otro manejo de estado ni de navegación.
8. **Antes de terminar**: `dart analyze` sin issues y `flutter test` en verde.
   Si cambiaste una firma pública de un widget compartido, actualizá sus usos.
9. **Verificación en emulador**: ejecutá la app actualizada y probá los flujos
   afectados en el emulador. Dejalo abierto con la implementación visible para
   que el usuario pueda revisarla. Guardá las capturas en `../.context/`.

## Comandos

```sh
cd mobile
flutter pub get
dart analyze
flutter test
flutter run            # ver README.md para apuntar a un servidor
```

## Pedidos de datos

(Codex: anotá acá lo que la UI necesite y la capa de datos no exponga todavía.)
