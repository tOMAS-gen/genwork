# Plan de implementación: `paridad-visual`

Spec: [SPEC-paridad-visual.md](SPEC-paridad-visual.md) · Tareas: [tasks-paridad-visual.md](tasks-paridad-visual.md) · Estado: **aprobado** el 2026-10-26 (`/build auto`). Rama: `tOMAS-gen/paridad-visual-android`.

## Resumen

Primero se suma Marionette, porque acelera todo lo que viene después. Sigue el arreglo de fechas, que es el único cambio en la web. Después se escribe `diferencias.md` con las 34 pantallas antes de tocar un widget: es lo que dice qué se arregla en la base compartida y qué en cada pantalla. Con la base corregida se recorren las pantallas en tandas por zona, se agregan las cuatro piezas que faltan y se cierra con los estados.

## Decisiones de arquitectura

- **La fecha de entrega es un día de calendario.** La web guarda lo que elige el selector (`"2026-10-29"`) como medianoche UTC, la misma convención de `src/lib/time/system-tz.ts`. Mostrarla es leer el día en UTC, sin pasar a hora local. Hoy la lista, el portal y las tareas web convierten a Buenos Aires con `Intl.DateTimeFormat("es-AR")` y muestran el día anterior. El detalle corta el string y acierta. Android usa `parseDate(...).toLocal()`.
  - **Web:** un único helper en `src/lib/domain/dates/` que formatea con `timeZone: "UTC"` y que usan todas las vistas.
  - **Android:** los modelos leen `dueDate` con `parseDay`, que ya existe y hace eso mismo para los recordatorios.
  - **Urgencia:** "Vence hoy" y "Vencido" también comparan días de calendario contra el día de hoy en la zona del sistema.
- **Diferencias primero, widgets después.** El relevamiento de las 34 pantallas va antes del bloque B. Una diferencia que aparece en tres o más pantallas va a la base compartida. Así no se corrige lo mismo pantalla por pantalla.
- **La lista de tareas del bloque B es provisional.** Sale de lo que ya se vio en las capturas: tipografía, encabezado, menú, KPI, cards, filtros, dialogs y estados. La tarea 5 la confirma o la ajusta, y lo que cambie se le muestra al usuario en el checkpoint B.
- **Marionette solo en debug,** con el mismo patrón que GenStock (`MarionetteBinding` si `kDebugMode` y no es un test). Las capturas siguen saliendo de `adb screencap` con `paridad-android.sh cap`, porque el tema oscuro se cambia en el sistema. Marionette se usa para navegar, tocar por `ValueKey` y hacer hot reload.
- **Las tandas de pantallas siguen el inventario,** agrupadas por zona: cada una deja pares `despues` completos, revisables en el comparador.
- **Las piezas nuevas (bloque D) siguen la arquitectura de la app:** modelo en `data/models`, repositorio en `data/repositories` contra la API que ya existe, provider y pantalla en `features/`. No se cambia la API.
- **Un commit por componente o pantalla,** con su ID P/S en el mensaje.

## Tareas

| # | Tarea | Tamaño | Depende de |
|---|---|---|---|
| 1 | Marionette en debug y guía de uso | S | — |
| 2 | Fechas web: helper único, tests y vistas de proyectos | S | — |
| 3 | Fechas web: portal, tareas y urgencia | S | 2 |
| 4 | Fechas Android: `dueDate` como día de calendario | S | — |
| — | **Checkpoint A:** la misma fecha en las 4 vistas; capturas P05, P07, P33 y P34 | | 2, 3, 4 |
| 5 | `diferencias.md`: relevamiento de las 34 pantallas | M | 1 |
| 6 | Base: escala tipográfica y tokens | S | 5 |
| 7 | Base: encabezado de página y menú lateral; atrás cierra el menú (P03) | M | 5 |
| 8 | Base: KPI, cards de proyecto y barra de progreso | M | 6 |
| 9 | Base: chips, filtros, buscador, selector de orden y pestañas | M | 6 |
| 10 | Base: dialogs, hojas y vistas de estado | M | 6 |
| — | **Checkpoint B:** el usuario revisa la base en P03, P05 y P07 | | 6–10 |
| 11 | Tanda 1: P01–P04 (acceso, servidores, navegación, Mi día) | M | B |
| 12 | Tanda 2: P05–P10 (proyectos, crear, detalle, plantillas, tarea, tablero) | M | B |
| 13 | Tanda 3: P11–P19 (sectores, grupos, notas, documento, archivos, actividad) | M | B |
| 14 | Tanda 4: P21–P24a (recordatorios, notificaciones, cuenta, Vincular con Claude) | M | B |
| — | **Checkpoint C1:** revisión intermedia en el comparador | | 11–14 |
| 15 | Tanda 5: P25–P32 (administración) | M | C1 |
| 16 | Tanda 6: P33–P35 (portal como cliente, TV como lector) | S | C1 |
| 17 | Nueva: pestaña Materiales del proyecto | M | 12 |
| 18 | Nueva: P20 Materiales | M | 17 |
| 19 | Nueva: P24b App móvil | S | 14 |
| 20 | Nueva: P31b Integración con GenStock | M | 15 |
| — | **Checkpoint D:** pantallas nuevas con permisos de admin y de miembro | | 17–20 |
| 21 | Estados vacío, carga y error en las dos plataformas | M | 11–20 |
| 22 | Cierre: inventario `igual`, comparador y criterios de éxito | XS | 21 |
| — | **Checkpoint final:** criterios de éxito de la spec | | 22 |

Las tareas 1, 2 y 4 son independientes entre sí. De la 6 a la 10, la 7 no depende de la tipografía y se puede hacer en paralelo. Las tandas comparten un solo emulador y una sola sesión, así que van en serie.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Hay `dueDate` guardados con hora (MCP, seed QA con `Date.now() + 3 días`) | Medio | La regla es "el día en UTC", sea cual sea la hora. Hay un test para un valor con hora, y el caso del seed (01:05 UTC) queda cubierto. |
| Cambiar la fecha en la web mueve un día lo que la gente ya ve | Medio | Es el arreglo: hoy la lista muestra un día menos que el elegido. Se verifica con una fecha elegida desde la UI antes y después, y se avisa en el PR. |
| Un cambio en la base rompe pantallas que no se están mirando | Alto | Hay tests de widget por componente, se corren `ui_phase3_test` y `design_tokens_guard_test`, y el checkpoint B revisa tres pantallas antes de seguir. |
| Los tests de paridad que existen buscan textos o estructura que cambian | Medio | Se ajusta el finder solo si cambió la estructura, y el commit lo explica. Nunca se borra un test sin preguntar. |
| Marionette no conecta en el emulador (la URI del VM service cambia en cada arranque) | Bajo | La tarea 1 saca la URI del log de `flutter run` y la anota en el quickstart. Si falla, sigue `paridad-android.sh`. |
| La API de Materiales o GenStock no alcanza para la pantalla Android | Medio | Se lee la API antes de diseñar la pantalla. Si falta algo, se pregunta antes de tocar el backend (límite de la spec). |
| GenStock no está configurado en QA: Materiales solo muestra el estado vacío | Bajo | Se captura el vacío, que es el par web que existe. Los datos se prueban con tests de widget con respuestas falsas. |
| `docs/auditoria-ui-ux/` y `next-env.d.ts` siguen sin commitear | Bajo | No se incluyen en los commits de este módulo. |
