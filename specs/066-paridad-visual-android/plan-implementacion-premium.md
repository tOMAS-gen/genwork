# Plan de implementación: `implementacion-premium`

Spec: [SPEC-implementacion-premium.md](SPEC-implementacion-premium.md) · Tareas: [tasks-implementacion-premium.md](tasks-implementacion-premium.md) · Auditoría: [auditoria-premium.md](auditoria-premium.md) · Estado: **propuesto** el 2026-10-26, pendiente de aprobación. Rama: `tOMAS-gen/paridad-visual-android`.

## Resumen

El piloto (P09, tareas 1–5) ya está hecho. Ahora se lleva a código el resto de la auditoría premium: los 15 patrones sistémicos (PS1–PS15), los 12 hallazgos técnicos (T1–T13) y los hallazgos `Pxx-Mn` de las 41 pantallas, con los bocetos como referencia.

El orden es el que fija la auditoría. Primero van las bases (tokens, márgenes, tipografía y cabecera), que cambian todas las pantallas a la vez. Después vienen los componentes compartidos y, recién entonces, cada pantalla con lo que le queda. Al final van los hallazgos técnicos que no dependen del aspecto y, como última fase, la web.

## Decisiones del usuario (2026-10-26)

- **Aprueba todos los bocetos.** Se implementan los hallazgos de las 41 pantallas.
- **Android primero y la web al final.** Todas las fases de Android van antes. La última fase lleva a la web los cambios de sistema para que las dos vuelvan a verse iguales. Hasta esa fase, la web no cambia.
- **QR con `qr_flutter`.** Se suma la dependencia para mostrar el código en App móvil (P24b-M3).

## Decisiones de arquitectura

- **Del sistema a la pantalla.** Si un hallazgo de pantalla sale de un componente compartido, se corrige en el componente, en la fase 2. La tarea de la pantalla solo hace lo que es propio de ella y marca en la auditoría lo que ya resolvió el componente.
- **Los tokens cambian valores; los tests se actualizan.** `gen_colors_test` y `theme_tokens_test` fijan valores (por ejemplo, `screenTitle` en 24 y `outline` en `#E3E6EB`). Cambiar ese valor esperado al nuevo **no** es quitar una verificación: el test sigue comprobando el token. Cada cambio se lista en el commit. Las guardas (`design_tokens_guard_test`, contraste y overflow de `ui_phase3_test`) no se tocan.
- **El contraste no textual entra al test.** El contorno de campos y botones secundarios pasa a 3:1 (T11). El par se suma al test de contraste, que hoy solo mide texto. Es una verificación nueva, no una relajada.
- **Sin `showModalBottomSheet`.** La guarda lo prohíbe, así que en Crear proyecto (P06-M1) se usa la otra opción de la auditoría: diálogo siempre centrado y velo al 60 % en los dos temas.
- **Las claves (`ValueKey`) se conservan** cuando el control sigue existiendo con otra forma, como en el piloto. Si una acción pasa a un menú "⋯", el test abre el menú primero y verifica lo mismo.
- **Accesibilidad junto con el componente.** Los P1 técnicos se hacen con el componente que tocan: T1 con los campos (PS10), T3 con la fila de tarea (PS9), T4 con las migas y las filas (PS3, PS4) y T6 con el andamio de página (PS2). Las guías `androidTapTargetGuideline` y `labeledTapTargetGuideline` se extienden a las pantallas de trabajo diario.
- **Cada tarea de pantalla cierra con capturas `despues`** en claro y oscuro (`scripts/paridad-android.sh cap` y el ayudante con control de brillo). El boceto queda al lado en el comparador.
- **Un commit por tarea,** con los IDs (PS, T, Pxx-Mn) en el mensaje, y sin push.

## Tareas

| # | Tarea | Tamaño | Depende de |
|---|---|---|---|
| | **Fase 1 — Bases** | | |
| 6 | Oscuro con escalones, contorno a 3:1 e interruptor con tema (PS1, T11, PS15) | M | — |
| 7 | Escala tipográfica de cuatro pasos (D2) | S | — |
| 8 | Margen único de 16 dp, título de barra alineado e insets (PS2, P02-M2, T6) | M | — |
| 9 | Cabecera compacta en las raíces (PS3) | M | 7, 8 |
| 10 | Cabecera de subpantalla y entidad con miga (PS13, P14-M1, P17-M1, T4 migas) | M | 9 |
| — | **Checkpoint 1:** capturas de las 41 pantallas en claro y oscuro; el usuario revisa | | 6–10 |
| | **Fase 2 — Componentes** | | |
| 11 | Filas de ajustes agrupadas de 56 dp (PS4, T4 `listTileTheme`) | M | 9 |
| 12 | Acciones de fila en "⋯" y botones de guardar con forma (PS5) | M | 11 |
| 13 | Una sola receta de campo, con rótulo accesible y copiar adentro (PS10, T1) | M | 6 |
| 14 | Un solo estado vacío (PS11) | S | 7 |
| 15 | Color con significado: progreso, plazo y estado (PS7) | M | 6 |
| 16 | El nombre como título de la card de entidad (PS6) | M | 15 |
| 17 | Franja de KPI de 72 dp (PS8) | S | 7 |
| 18 | Fila de tarea con una sola acción visible (PS9, T3) | M | 6 |
| 19 | Compositor de 48 dp con el teclado en cuenta (PS14, T8) | M | 18 |
| 20 | Pestañas de Configuración legibles (PS12) | S | 9 |
| — | **Checkpoint 2:** capturas; el usuario revisa los componentes en P05, P07, P23 y P28 | | 11–20 |
| | **Fase 3 — Pantallas** | | |
| 21 | Acceso y Servidores (P01, P02) | M | C2 |
| 22 | Navegación (P03, T9 drawer, T4 drawer) | S | C2 |
| 23 | Mi día y Tablero (P04, P10) | M | C2 |
| 24 | Proyectos, Crear proyecto y Plantillas (P05, P06, P08) | M | C2 |
| 25 | Detalle de proyecto y su pestaña Materiales (P07, P07M) | M | C2 |
| 26 | Sectores y grupos (P11–P14) | M | C2 |
| 27 | Notas y Documento (P15–P17) | M | C2 |
| 28 | Archivos, Actividad y Acceso cliente (P18, P19) | S | C2 |
| 29 | Materiales y Recordatorios (P20, P21, T4 mes) | M | C2 |
| 30 | Vence hoy, Cuenta, Vincular con Claude y App móvil con QR (P22–P24b) | M | C2 |
| 31 | Configuración, Acceso, Usuarios y Clientes (P25–P27) | M | C2 |
| 32 | Catálogos: Etapas, Etiquetas y Estados (P28, P29) | M | C2 |
| 33 | Sistema: Recordatorios, Almacenamiento, Genstock y Errores (P30–P32) | M | C2 |
| 34 | Portal y TV (P33–P35) | M | C2 |
| — | **Checkpoint 3:** las 41 pantallas contra su boceto; el usuario revisa en el comparador | | 21–34 |
| | **Fase 4 — Técnico** | | |
| 35 | Listas virtualizadas (T2) | L | C3 |
| 36 | Atrás predictivo y arranque sin esperar a Firebase (T5, T13) | S | C3 |
| 37 | Tablet y ventanas anchas (T7) | M | C3 |
| 38 | TalkBack: una parada por fila y colores con nombre (T9 tabla, T10) | S | C3 |
| — | **Checkpoint 4:** re-auditoría técnica en emulador (360 × 800, 800 × 360, tablet, letra 1,3 y 2,0) | | 35–38 |
| | **Fase 5 — Web** | | |
| 39 | Web: tokens oscuros, contorno a 3:1 y margen de 16 (PS1, T11, PS2) | M | C4 |
| 40 | Web: cabeceras de raíz, subpantalla y entidad (PS3, PS13) | M | 39 |
| 41 | Web: filas, acciones, campos y vacíos (PS4, PS5, PS10, PS11) | M | 40 |
| 42 | Web: cards de entidad, color, KPI, fila de tarea y pestañas (PS6–PS9, PS12) | M | 41 |
| 43 | Cierre: banco de capturas web/Android de las 41 pantallas, auditoría e inventario | M | 42 |
| — | **Checkpoint final:** Android y la web vuelven a coincidir; el usuario revisa antes de un PR | | 39–43 |

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Los cambios de base (fase 1) mueven las 41 pantallas a la vez y rompen tests que miden posiciones o textos. | Alto | Una tarea por base, con la suite completa en cada una. Checkpoint 1 con capturas de todas las pantallas antes de seguir. |
| Con el emulador abierto, la suite de Flutter tardó 53 minutos. | Medio | Correr la suite completa con el emulador cerrado o pausado. Durante la tarea, usar el test enfocado y, al cerrarla, la suite completa. |
| Mover acciones a "⋯" (fila de tarea, filas de ajustes) cambia cómo las tocan unos 10 tests. | Medio | Se conservan las claves. El test abre el menú y verifica la misma acción. No se quita ninguna aserción. |
| Un hallazgo de pantalla pide algo que la app no tiene (por ejemplo, el alta de material desde el vacío de P07M-M3). | Bajo | Se conecta con el flujo que ya existe (`work_materials_screen._add`). Si no existe, se anota y se pregunta, sin inventar la función. |
| Mi día (P04-M3) une la fecha y el progreso en una línea, y QA10 verifica la fecha. | Bajo | El test se adapta al nuevo formato y sigue verificando que la fecha se muestre. |
| Mientras dure el trabajo, Android y la web vuelven a verse distintos. | Medio | La fase 5 los iguala otra vez con el banco `comparativa`. No conviene abrir un PR a `main` hasta cerrarla, salvo que el usuario decida otra cosa. |
| Listas virtualizadas (T2): cambiar `Column` por slivers puede romper el marco de panel de la web. | Medio | `DecoratedSliver` para el marco. Medir antes y después con un proyecto de 200 tareas en `--profile`. |

## Preguntas abiertas

- **PR.** ¿Se abre un PR al cerrar Android (checkpoint 4) o recién después de la web (fase 5)? El plan asume que es después de la web.
- **Web, fase 5.** El detalle de esas tareas se ajusta después del checkpoint 4, cuando se sepa qué cambió de verdad en Android. Antes de tocar Next.js hay que leer `node_modules/next/dist/docs/` (AGENTS.md).
