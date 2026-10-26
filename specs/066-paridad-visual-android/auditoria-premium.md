# Auditoría premium — genwork Android y web móvil

Fecha: 2026-10-26. Spec: [SPEC-auditoria-premium.md](SPEC-auditoria-premium.md). Capturas: `.context/paridad-visual/despues/` (Android igualado a la web, 390 px lógicos).

Como Android y la web móvil ya se ven iguales, cada hallazgo vale para las dos.

## 1. Dirección premium

genwork ya tiene la base correcta: superficies planas, un solo acento, Montserrat y textos claros. Lo que lo separa de una interfaz premium no es la falta de adornos, sino de **precisión**. Hay cabeceras que repiten información, una escala tipográfica con demasiados tamaños, filas con tres o cuatro íconos del mismo peso, colores que cambian de significado de una pantalla a otra y bloques que gastan media pantalla antes del contenido.

La dirección es **"taller preciso"**: menos piezas, cada una medida, con el color reservado para lo que significa algo. Se conserva la identidad de DESIGN.md: Montserrat, azul `#3b5bfa`/`#5b7fff`, superficies planas sin sombra, radios 4/6/8/12 y Material Symbols.

| ID | Principio | Hoy | Premium |
|---|---|---|---|
| **D1** | **Una sola cabecera por pantalla** | Barra con logo + bloque de página con tile de ícono de 44 px, título de 24 px y regla. En las raíces el contenido real empieza a ~210 px. | Título de pantalla de 20/700 sin tile en las raíces; el tile queda para el encabezado de una entidad (proyecto, sector, grupo). La acción principal se alinea con el título. El contenido empieza antes de los 160 px. |
| **D2** | **Escala de cuatro pasos** | Muchos tamaños y pesos mezclados; Roboto Mono en rótulos y en la fecha de Mi día. | 20/700 título · 15/600 título de card o sección · 13/400 cuerpo · 11/700 rótulo en mayúsculas con tracking 0,06 em. Roboto Mono solo para cifras y códigos, con números tabulares. |
| **D3** | **Resúmenes compactos** | Cuatro cards KPI de ~100 px cada una (media pantalla). | Una franja de 4 valores en una sola card con divisores verticales: cifra 20/700 mono, rótulo 11/700. ~72 px de alto. |
| **D4** | **El nombre primero** | El nombre del proyecto aparece como chip gris en mayúsculas. | El nombre de la entidad es el título de su card (15/600, hasta dos líneas). Los chips quedan para metadatos: etiquetas, estado, grupo. |
| **D5** | **Color con significado único** | El progreso es verde en una card y azul en el detalle; "3 días restantes" va en ámbar e itálica; estados seleccionados que parecen deshabilitados. | Progreso siempre en azul de marca y verde solo al 100 %. Plazo: neutro con margen, ámbar a ≤3 días, rojo si venció, sin itálica. Un estado seleccionado se lee como seleccionado: fondo de acento al 12 % y texto de acento con contraste ≥4,5:1. |
| **D6** | **Una acción visible por fila** | Filas de tarea con contador, sol, "+" y "×" al mismo peso, que empujan el texto a dos líneas. | La fila muestra el checkbox, el título y como mucho un indicador de estado (Mi día). Las acciones secundarias van a un menú "⋯", a una pulsación larga o a un deslizamiento. Íconos de 20 px en gris neutro; color solo para un estado activo. |
| **D7** | **Secciones con rótulo y divisor** | Bloques grises parciales dentro de las cards, botones de guardar como enlaces sueltos y campos de estilos distintos. | Dentro de una card, cada sección es un rótulo de 11/700 y su contenido, separadas por divisores de 1 px. Guardar es un botón (relleno o tonal) alineado a la derecha del grupo que guarda. Todos los campos usan el mismo relleno `#f1f3f6` y radio 6. |
| **D8** | **Ritmo de 4/8** | Separaciones irregulares entre bloques y columnas que no comparten línea de inicio. | Padding 16 en cards, 12 entre cards, 24 entre secciones de página. Filas de 48 o 56 dp. Todo arranca en la misma línea de 16 px. |
| **D9** | **Navegación que se entiende sola** | Pestañas desplazables que abren cortadas ("…ta"); migas de pan tan grandes como el cuerpo. | La pestaña activa siempre a la vista y la primera completa. Migas de 12/500 en gris, que no compiten con el título. |
| **D10** | **Oscuro con escalones** | Card `#1c1c1c` sobre página `#0c0c0c`, pero el campo dentro de la card es `#151515`: el escalón se invierte. El borde `#272727` de los botones contorneados casi no se ve sobre la card. Verde `#3ecf8e` y ámbar `#facc15` saturados. | Escalones que siempre suben: página `#0c0c0c`, card `#151515`, campo `#1c1c1c`, borde `#272727` (y `#333` en controles). Acento `#5b7fff`; verde y ámbar desaturados para ≥4,5:1 sin vibrar. |

## Resumen

- **41 pantallas** (P01–P35, con P07, P19, P26 y P28 divididas): **152 hallazgos premium**, ninguno bloqueante. Hay 62 P1, 71 P2 y 19 P3.
- Los principios más tocados son D7 (secciones, botones y campos, 30), D1 (cabecera, 24), D8 (ritmo, 23) y D5 (color, 20).
- **Auditoría técnica nativa: 12/20, Aceptable.** Hay 12 hallazgos: 4 P1, 7 P2 y 1 P3. Los principales son formularios sin nombre para TalkBack, listas sin virtualizar, la fila de tarea que aplasta el texto y áreas táctiles de menos de 48 dp.
- **15 patrones sistémicos** (PS1–PS15) concentran la mayor parte del trabajo. Están en la sección 4, con el orden sugerido.
- Los bocetos de cada pantalla están en `.context/paridad-visual/despues/*-boceto.png` y se ven en el comparador (`despues/index.html`).

## 2. Auditoría técnica nativa

Revisión del código de `mobile/lib` según `audit.native` de impeccable, sin emulador. No se reporta lo que ya garantizan los tests (`design_tokens_guard_test`, `ui_phase3_test`, `accessibility_audit_test`, `qa10_roles_a11y_test`) ni las decisiones de producto (copia de la web móvil, cuerpo de 13 px).

Se descartó un hallazgo T12 («dependencia y permiso de cámara sin uso»): era falso. El escáner QR de la pantalla de acceso se usa a través de `qrScannerBuilderProvider` (`server_setup_screen.dart:206`).

### Puntajes

| # | Dimensión | Puntaje | Hallazgo clave |
|---|-----------|:------:|----------------|
| 1 | Accesibilidad (TalkBack) | **2** | Campos de formulario y filtros sin nombre accesible; varias áreas táctiles de 34–44 dp |
| 2 | Rendimiento | **2** | Las listas principales (proyectos, tareas del proyecto y del sector) se arman enteras en una `Column`; tabla con `IntrinsicColumnWidth` |
| 3 | Apariencia y tema | **3** | Tokens y modo oscuro sólidos; bordes de campos y botones secundarios a 1,25:1 (no texto) |
| 4 | Conformidad con Android | **3** | La transición propia anula el atrás predictivo; las listas no aplican el inset inferior en modo edge-to-edge |
| 5 | Adaptación | **2** | Sin diseño para tablet ni ventanas anchas; la fila de tarea deja unos 90 dp para el texto en un teléfono de 360 dp |
| **Total** | | **12/20** | **Aceptable: hace falta trabajo significativo** |

### Veredicto de conformidad con Android

**Pasa, con reservas.** Se lee como una app Material 3 coherente: componentes de Material, `PopScope` correcto en el shell y en los formularios (el atrás cierra el drawer y espera guardados), snackbars flotantes, `adjustResize`, sin orientación bloqueada, movimiento reducido respetado y un único set de íconos. Lo que la delata como port es técnico, no de navegación: la transición de página propia apaga la vista previa del atrás predictivo (targetSdk 36), las listas ignoran el inset inferior del modo edge-to-edge, hay áreas táctiles por debajo de 48 dp y los formularios no le dicen a TalkBack qué campo está editando. En tablet es una UI de teléfono estirada.

### Resumen

- Hallazgos: 12 → **P0: 0 · P1: 4 · P2: 7 · P3: 1**.
- Los tres más importantes: T1 (formularios mudos para TalkBack), T2 (listas sin virtualizar), T3 (la fila de tarea aplasta el texto).
- Próximo paso: corregir los P1 extendiendo a las pantallas de trabajo diario los tests que hoy solo cubren Configuración (`androidTapTargetGuideline` y `labeledTapTargetGuideline`).

---

### Hallazgos

#### T1 · [P1] Campos, selectores e interruptores sin nombre accesible
- **Dimensión:** Accesibilidad · **Sectores:** S06, S07, S10, S12, S16, S25.
- **Ubicación:**
  - `shared/widgets/labeled_field.dart:18-32`: `LabeledField` dibuja el rótulo como un `Text` hermano y no lo asocia al campo. Lo usan 10 campos sin `labelText`/`hintText`: `features/works/create_work_dialog.dart:109-152` (Ámbito, Nombre, Descripción), `features/tasks/task_row_actions.dart:97` (Subtarea), `features/materials/work_materials_screen.dart:205-224` y `:297-316` (Cantidad, Notas), `features/settings/genstock_settings_screen.dart:129` (URL).
  - `shared/widgets/list_toolbar.dart:435-460`: `ToolbarFilterField` repite el patrón en los desplegables de filtros (`features/works/works_filters_panel.dart:107-125`, `:127-160`; `features/sectors/sectors_list_screen.dart:101-110`).
  - `features/materials/work_materials_screen.dart:160-174`: `Switch` «Solo insumos» sin etiqueta, con `shrinkWrap`; el texto de al lado no es tocable.
  - `features/works/works_filters_panel.dart:183-201`: `Checkbox` de grupo sin etiqueta, como nodo separado del `InkWell` que lleva el texto.
- **Impacto:** TalkBack anuncia «Cuadro de edición», «Desplegable» o «Interruptor, desactivado» sin decir cuál. En el alta de proyecto, la persona no sabe si escribe el nombre o la descripción. El filtro por grupo suma dos paradas por opción, y la casilla no tiene nombre.
- **Corrección:** `LabeledField` y `ToolbarFilterField` deberían envolver al hijo en `Semantics(label: label, child: …)` y excluir el `Text` visual (`ExcludeSemantics`), o pasar el rótulo al `InputDecoration` con `label` oculto. En el switch y en las casillas: `SwitchListTile`/`CheckboxListTile`, o `MergeSemantics` sobre fila + control. Agregar `labeledTapTargetGuideline` a los tests del alta de proyecto, los filtros y los materiales.
- **Comando:** `/impeccable harden`.

#### T2 · [P1] Listas principales sin virtualizar
- **Dimensión:** Rendimiento · **Sectores:** S06, S08, S12.
- **Ubicación:**
  - `features/works/works_list_screen.dart:306-320`: todas las `WorkCard` van dentro de una `Column`, que es un solo hijo del `ListView` (`:203`).
  - `features/works/work_table.dart:202-206`: vista de lista como `Table` con `IntrinsicColumnWidth` y todas las filas. Las medidas intrínsecas obligan a medir dos veces cada celda.
  - `features/works/work_detail_screen.dart:250` y `:373`: todas las secciones y tareas del proyecto, dentro de un `WorkspacePanel` → `Column`.
  - `features/sectors/sector_detail_screen.dart:133-144` y `:184`: `rows()` arma una `Column` por grupo.
  - `shared/widgets/workspace_panel.dart:38-55`: `WorkspaceListPanel` usa una `Column` (Mi día y otras).
  - Solo hay 4 `ListView.builder`/`separated` en toda la app (portal, notas, acceso).
- **Impacto:** cada `TaskTile` lleva `Dismissible`, `InkWell`, una casilla y hasta tres `IconButton` con `Tooltip`. Un proyecto o sector con 150–300 tareas y subtareas construye y mide todo de una vez al abrir, y en cada `setState`: tocar Mi día, alternar tablero o escribir en el buscador de proyectos. Se traduce en saltos de cuadros en el scroll y en una apertura lenta en gama media.
- **Corrección:** pasar a `CustomScrollView` con `SliverList.builder`/`SliverList.separated` por sección (encabezados con `SliverToBoxAdapter` o `SliverMainAxisGroup`), y dibujar el marco del panel con `DecoratedSliver`. En la tabla, `FixedColumnWidth`/`FlexColumnWidth`, o filas con anchos fijos en un `ListView.builder`. Medir antes y después con `flutter run --profile` y un proyecto de 200 tareas *(verificar en dispositivo)*.
- **Comando:** `/impeccable optimize`.

#### T3 · [P1] La fila de tarea deja muy poco ancho para el texto
- **Dimensión:** Adaptación · **Sectores:** S08, S10, S12.
- **Ubicación:** `shared/widgets/task_tile.dart:112-117` (relleno de 8 y 16), `:145` (casilla de 48), `:220-265` (Mi día, agregar subtarea y eliminar: tres `IconButton` de 48 dp siempre visibles), `:323-325` (subtareas con margen de 32 dp).
- **Impacto:** en el detalle de proyecto, a 360 dp, quedan 360 − 24 (lista) − 24 (panel) − 24 (relleno de la fila) − 48 (casilla) − 144 (acciones) ≈ **90 dp para el texto de la tarea**: unos 12 caracteres por línea al 100 % y 7–8 al 150 %. Las tareas largas se convierten en columnas de dos o tres palabras. El test de overflow no lo detecta porque el texto envuelve sin desbordar.
- **Corrección:** dejar visible solo Mi día y llevar «Agregar subtarea» y «Eliminar» a un `PopupMenuButton` («Más acciones», 48 dp), o mostrarlos debajo del texto cuando el ancho sea menor a ~420 dp (`LayoutBuilder`). Agregar a `ui_phase3_test` una aserción de ancho mínimo del texto (≥ 160 dp a 360 dp).
- **Comando:** `/impeccable layout`.

#### T4 · [P1] Áreas táctiles por debajo de 48 dp
- **Dimensión:** Accesibilidad · **Sectores:** S04, S06, S08, S05, S16, S17.
- **Ubicación (altura aproximada a 100 %):**
  - Enlaces de texto `InkWell` con relleno vertical de 8: `shared/widgets/breadcrumb.dart:32-38` (~35 dp, en todos los detalles), `features/my_day/my_day_screen.dart:301-309` (~34 dp, origen de la tarea), `features/materials/materials_screen.dart:138-145` (~37 dp).
  - `features/reminders/reminder_calendar.dart:48-56`: botón del mes con `minimumSize: Size.zero` y `shrinkWrap` (~24 dp).
  - `shared/widgets/list_toolbar.dart:398`: chip para quitar un filtro activo, `minHeight: 36`.
  - `features/shell/drawer_tile.dart:60`: ítems de subsección del drawer (proyectos, sectores y grupos) con `minTileHeight: 44`; `core/theme/app_theme.dart:209`: `ListTile` de una línea con 44.
  - `features/works/works_filters_panel.dart:192`: opción de grupo con `minHeight: 44`.
  - `features/works/work_table.dart:68-71`: celdas tocables de ~37 dp.
- **Impacto:** toques fallidos en taller y con guantes. Las migas son la vía principal para volver a la lista desde el detalle. Los tests de tamaño solo cubren Configuración y los ítems de primer nivel del drawer.
- **Corrección:** un `ConstrainedBox(minHeight: kMinInteractiveDimension)` en `Breadcrumb` y en los enlaces de texto, o un componente `TextLink` compartido. Quitar `Size.zero`/`shrinkWrap` del botón del mes; llevar el chip de filtro, `DrawerTile.compact` y `listTileTheme.minTileHeight` a 48. Agregar `androidTapTargetGuideline` a los tests de Proyectos, detalle de proyecto, Mi día, Recordatorios y drawer.
- **Comando:** `/impeccable harden`.

#### T5 · [P2] Atrás predictivo sin vista previa
- **Dimensión:** Conformidad · **Sector:** S04.
- **Ubicación:** `core/theme/app_theme.dart:399-421`: `_AppTransition` (fundido) reemplaza en Android el `PredictiveBackPageTransitionsBuilder` que Flutter 3.44 trae por defecto. `android/app/src/main/AndroidManifest.xml:6-19` no declara `android:enableOnBackInvokedCallback="true"`, y el `targetSdk` es 36 (`flutter.targetSdkVersion`).
- **Impacto:** en Android 16 el gesto atrás no muestra la página anterior mientras se arrastra: la pantalla se corta de golpe al soltar. En Android 13–15 tampoco aparece la animación de volver al inicio. Un usuario fluido lo nota como «no nativo».
- **Corrección:** en Android, `PredictiveBackPageTransitionsBuilder`. Si se quiere mantener el fundido de 150–200 ms de DESIGN.md, combinarlo: fundido para `push` y predictivo para `pop`; si `disableAnimations` está activo, conservar el corte. Declarar `enableOnBackInvokedCallback="true"` en `<application>` y probar los `PopScope` con `canPop: false` (documentos, recordatorios, archivos) *(verificar en dispositivo)*.
- **Comando:** `/impeccable animate`.

#### T6 · [P2] Insets del sistema no aplicados en el contenido desplazable
- **Dimensión:** Conformidad · **Sectores:** S03, S04.
- **Ubicación:** `shared/widgets/gen_page_scaffold.dart:66-91`: el cuerpo es `Padding(bodyPadding)` → `ListView`, sin `SafeArea` y sin sumar `MediaQuery.paddingOf(context)`. Las listas con `padding` explícito no reciben el inset automático: `features/settings/settings_screen.dart:90` (`EdgeInsets.zero`), `features/sectors/sector_detail_screen.dart:174`, `features/account/account_screen.dart:39`, `features/files/files_screen.dart:417`, entre otras. En todo `lib/` no hay usos de `viewPadding`/`paddingOf` (solo 8 `SafeArea`). `values/styles.xml` usa `windowLayoutInDisplayCutoutMode=shortEdges`.
- **Impacto:** con targetSdk 36, Android 15+ dibuja la app de borde a borde. Con la navegación de 3 botones (48 dp), el final de las listas queda debajo de la barra y no se puede tocar: la última card de Configuración solo tiene 16 dp de margen. En horizontal, con cámara frontal en el costado, el contenido a 12 dp del borde queda bajo el recorte *(verificar en dispositivo con navegación de 3 botones y en horizontal)*.
- **Corrección:** en `GenPageScaffold`, sumar `MediaQuery.paddingOf(context)` al `bodyPadding` (inferior, izquierda y derecha) o envolver el cuerpo en `SafeArea(top: false)`. En los `ListView` con `padding` explícito, usar `padding.add(EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom))`. Dejar que el fondo pase por debajo de la barra y desplazar solo el contenido.
- **Comando:** `/impeccable adapt`.

#### T7 · [P2] Sin diseño para tablet ni ventanas anchas
- **Dimensión:** Adaptación · **Sectores:** S04, S06, S08.
- **Ubicación:** no hay breakpoints de ancho en el shell (`features/shell/home_shell.dart:171-175`, drawer siempre modal). El único límite de ancho de contenido es `AppSpace.contentMax`, en `shared/widgets/auth_card.dart:31`. Las listas, el detalle y los formularios ocupan todo el ancho. Los tests usan solo 360 × 800.
- **Impacto:** en tablet, en pantalla dividida o en plegables abiertos, las líneas de texto superan los 100 caracteres, las cards de 1000 dp tienen la acción a un extremo y el drawer modal desperdicia la columna de navegación que la web muestra fija (DESIGN.md: sidebar de 240 px, rail de 48 px).
- **Corrección:** con `MediaQuery.sizeOf(context).width ≥ 840`, drawer fijo (`NavigationDrawer` permanente) o rail de 48 dp; ≥ 600, limitar el contenido a ~720 dp centrado y pasar las `WorkCard` a una grilla. Agregar al test de overflow una corrida a 800 × 360 (horizontal) y 1024 × 768.
- **Comando:** `/impeccable adapt`.

#### T8 · [P2] Diálogos y compositor con el teclado abierto en horizontal
- **Dimensión:** Adaptación · **Sectores:** S07, S10.
- **Ubicación:** `shared/widgets/app_work_dialog.dart:36-77` y `shared/widgets/adaptive_modal.dart:55-89`: diálogo centrado con encabezado y pie fijos, más `insetPadding` vertical de 24. `shared/widgets/task_composer.dart:183-186`: `maxHeight` del compositor calculado con `MediaQuery.sizeOf(context).height * .42`, la altura total y no la que deja el teclado.
- **Impacto:** en horizontal (~360 dp de alto), el teclado deja unos 150 dp. Encabezado y pie de los diálogos ocupan unos 120 dp, así que el campo queda casi sin espacio visible o el `Column` desborda. En el detalle de proyecto, el compositor puede tapar toda la lista *(verificar en dispositivo; los tests no cubren horizontal ni teclado)*.
- **Corrección:** calcular el máximo del compositor sobre `height − viewInsets.bottom`. En diálogos con poca altura disponible (< 400 dp), usar `Dialog.fullscreen` o desplazar también el encabezado y el pie.
- **Comando:** `/impeccable adapt`.

#### T9 · [P2] TalkBack: paradas redundantes y anuncios repetidos
- **Dimensión:** Accesibilidad · **Sectores:** S04, S06.
- **Ubicación:** `features/works/work_table.dart:68-71`: cada celda es un `InkWell` propio, con 7 paradas por fila que repiten la misma acción («Grupo», «45 %», una fecha suelta…), y las celdas vacías (`SizedBox.shrink`) también son tocables. `features/shell/drawer_resource_section.dart:188-193`: un `Tooltip` envuelve cada ítem de proyecto, sector o grupo y TalkBack lee el nombre dos veces («Producción — Señalética… Señalética · Producción»).
- **Impacto:** recorrer 30 proyectos en vista de lista lleva más de 200 gestos, y cada celda llega sin contexto de fila.
- **Corrección:** una sola acción por fila (`InkWell` sobre la fila, o `MergeSemantics` con una etiqueta compuesta: «Señalética, grupo Producción, 45 %, vence 30 oct, en progreso»). Quitar el `Tooltip` del ítem del drawer, o pasarle `excludeFromSemantics: true`.
- **Comando:** `/impeccable harden`.

#### T10 · [P2] Paleta de colores anunciada en hexadecimal
- **Dimensión:** Accesibilidad · **Sectores:** S12, S13, S22.
- **Ubicación:** `shared/widgets/color_palette.dart:94-100`: `Semantics(label: 'Color $hex')` más `tooltip: 'Color $hex'` en cada muestra de la lista de 17 colores (`:29-48`).
- **Impacto:** TalkBack lee «Color numeral e f cuatro cuatro cuatro cuatro», y dos veces (etiqueta y tooltip). Para quien no ve la muestra, elegir el color de un sector o una etiqueta es adivinar.
- **Corrección:** un mapa `hex → nombre` («Rojo», «Naranja», «Ámbar»… «Azul de marca») en `ColorPalette`, usado como `label` y `tooltip`; dejar solo uno de los dos. Mantener la paleta visual, que es lo que pidió el producto.
- **Comando:** `/impeccable clarify`.

#### T11 · [P2] Contraste no textual de campos y botones secundarios
- **Dimensión:** Apariencia y tema · **Sector:** S03.
- **Ubicación:** `core/theme/app_theme.dart:230-232` (`border`/`enabledBorder` = `c.outline`), `shared/widgets/app_work_dialog.dart:101-103` (botón secundario con borde `c.outline`), `shared/widgets/list_toolbar.dart:241`. Valores en `core/theme/gen_colors.dart:177` (`#E3E6EB`) y `:218` (`#333333`).
- **Impacto:** el borde del campo contra la superficie mide **1,25:1 en claro** (`#E3E6EB` sobre `#FFFFFF`) y **1,45:1 en oscuro** (`#333333` sobre `#151515`), y el relleno del campo contra la superficie, 1,12:1. WCAG 1.4.11 pide 3:1 para el contorno que identifica un control. Con sol o brillo bajo en el taller, los campos vacíos y los botones secundarios desaparecen. El test de contraste solo mide texto.
- **Corrección:** usar `c.border` o un token `fieldBorder` de ≥ 3:1 para el contorno en reposo de campos y botones secundarios (por ejemplo, `#8A90A0` en claro y `#6B6B6B` en oscuro). Coordinarlo con `@gen/ui`, porque el token es compartido con la web. Agregar el par al test de contraste.
- **Comando:** `/impeccable colorize`.

#### T13 · [P3] Trabajo antes del primer cuadro
- **Dimensión:** Rendimiento · **Sector:** S02.
- **Ubicación:** `main.dart:24-28`: `initializeDateFormatting`, `SharedPreferences`, `Firebase.initializeApp`, `getInitialMessage` y, si la app se abrió desde un aviso, una lectura de `flutter_secure_storage` (`core/notifications/push_service.dart:60-87`, `:99`), todo antes de `runApp`.
- **Impacto:** la pantalla de inicio nativa dura más en gama baja (Keystore y Firebase en frío suelen tomar 150–400 ms) *(medir con `adb shell am start -W`)*.
- **Corrección:** llamar a `runApp` después de `SharedPreferences` y mover `push.initialize()` a un `unawaited` tras el primer cuadro, con el `initialEvent` resuelto por un `Future` que consulte el router.
- **Comando:** `/impeccable optimize`.

---

### Patrones sistémicos

1. **Rótulo visual sin vínculo semántico.** `LabeledField` y `ToolbarFilterField` son la forma estándar de rotular campos, y ninguno le pasa el rótulo al campo (T1). Corregirlos arregla 15 campos de una vez.
2. **«Panel = Column».** `WorkspacePanel` y `WorkspaceListPanel` envuelven listas enteras en una `Column` para dibujar el marco de la web, y eso anula la virtualización en todas las pantallas que los usan (T2).
3. **Enlaces de texto con `InkWell` y relleno de 8.** Se repiten en migas, origen de la tarea, materiales y filtros, siempre por debajo de 48 dp (T4). Falta un componente `TextLink` con altura mínima.
4. **Cobertura de tests desbalanceada.** Las guías de tamaño y etiqueta solo corren en Configuración; el overflow solo a 360 × 800 en vertical; el contraste solo mide texto. Los hallazgos T1, T3, T4, T7, T8 y T11 están justo en esos huecos.
5. **Insets delegados al `Scaffold`.** Fuera del drawer, el detalle de tarea, el compositor y el pie de recordatorios, nadie lee `MediaQuery.paddingOf` (T6).

### Lo que está bien hecho

- **Tokens de verdad:** `GenColors` como `ThemeExtension` con claro y oscuro completos, `ColorScheme` armado a mano desde los tokens y una guarda que impide `Colors.*`, `Color(0x…)`, radios, `EdgeInsets` y `SizedBox` literales en `features/` y `shared/`. Los colores de etiqueta (datos del usuario) pasan por `chipText`/`chipFill` y `readableOn`.
- **Contraste de texto:** `muted` da 5,6–6,5:1 y `brand`, 4,6–5,2:1 en todas las superficies medidas, en ambos temas.
- **Movimiento reducido:** transición de página, `Dismissible`, `AnimatedSize`, skeleton y drawer de filtros consultan `MediaQuery.disableAnimationsOf`.
- **Texto del sistema:** no hay `textScaler` bloqueado. Las alturas de control, pestañas, chips y celdas del calendario crecen con la escala (`WorkspaceMetrics.controlHeight`, `reminder_calendar.dart:186-189`), y el editor WebView recibe la escala. Solo el logo (`brand_name.dart`) no escala, y es correcto.
- **TalkBack bien resuelto donde se trabajó:** días del calendario con fecha completa y cantidad, casillas de tarea con el texto de la tarea, encabezados marcados con `header: true`, `liveRegion` en estados de error y vacío, todos los `IconButton` y `PopupMenuButton` con `tooltip`, y el drawer con `semanticLabel`.
- **Atrás y datos:** `PopScope` en el shell (el atrás cierra el drawer en Android 14+) y en todos los formularios con operaciones en curso; el documento guarda antes de salir y no pierde cambios si falla.
- **Red y batería:** el sondeo de avisos cada minuto se pausa fuera de `resumed`, eventos en vivo con reintento exponencial, sin reintentos automáticos de Riverpod.
- **Tema clásico de Android:** `LaunchTheme` y `NormalTheme` con variante `values-night`, `forceDarkAllowed=false`, `adjustResize`, orientación libre y `configChanges` completos.

### Acciones recomendadas

1. **[P1] `/impeccable harden`:** rótulos semánticos en `LabeledField` y `ToolbarFilterField`, switch y casillas con etiqueta (T1); componente `TextLink` y mínimos de 48 dp (T4); guías de tamaño y etiqueta en las pantallas de trabajo diario.
2. **[P1] `/impeccable optimize`:** listas de proyectos, de tareas del proyecto y del sector con slivers perezosos; tabla sin medidas intrínsecas (T2).
3. **[P1] `/impeccable layout`:** fila de tarea con acciones secundarias en un menú y texto de al menos 160 dp a 360 dp (T3).
4. **[P2] `/impeccable adapt`:** insets en `GenPageScaffold` (T6), breakpoints para tablet (T7), teclado en horizontal (T8).
5. **[P2] `/impeccable animate`:** atrás predictivo en Android (T5).
6. **[P2] `/impeccable harden`:** una sola parada por fila en la tabla y drawer sin `Tooltip` duplicado (T9).
7. **[P2] `/impeccable clarify`:** nombres de color en la paleta (T10).
8. **[P2] `/impeccable colorize`:** contorno de campos a 3:1, coordinado con `@gen/ui` (T11).
9. **[P3] `/impeccable optimize`:** arranque sin esperar a Firebase (T13).
10. **`/impeccable polish`** como pasada final.

Después de corregir, repetir la auditoría con un emulador (360 × 800, 800 × 360 y tablet de 1280 × 800), `font_scale 1.3` y `2.0`, navegación de 3 botones y TalkBack.

## 3. Hallazgos por pantalla

Cada pantalla tiene sus hallazgos `Pxx-Mn` (prioridad P0–P3 y principio D) y el brief que se usó para su boceto. Las medidas están en dp lógicos (1 dp = 3 px de la captura). Las capturas oscuras de P03, P04, P07, P08 y P10 se rehicieron el 2026-10-26 porque eran copias de las claras; para esas pantallas el oscuro se revisó sobre la referencia web, que es igual.

### P01 Acceso

Captura: `antes/P01-acceso-sinsesion-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P01-M1 | P1 | D3 | El visor de cámara es un hueco blanco de ~340 dp de alto (y≈220–560 dp), sin forma ni marco. En el medio quedan un ícono QR de ~20 dp y el error en 15/400 gris. La card llega a 656 dp de alto y la única acción útil queda en y≈575 dp. | Visor cuadrado de 240 × 240 dp con fondo de campo `#f1f3f6` y radio 8, con cuatro esquinas de encuadre de 24 dp en acento. Dentro del visor, el error con un ícono de 32 px y texto 13/400. La card baja a unos 520 dp. |
| P01-M2 | P1 | D2 | No hay jerarquía entre los textos: la marca mide ~22 dp, el subtítulo "Gestión de proyectos…" va en 15/400 gris y la instrucción principal "Escaneá el QR de tu sistema" en 15/400 negro. La instrucción se lee como un subtítulo más. | "Escaneá el QR de tu sistema" en 20/700 como título de la card. Subtítulo de marca en 13/400 gris, pegado al logo (8 dp) y separado del título por 24 dp. |
| P01-M3 | P2 | D7 | "Escribir dirección a mano" es un enlace azul 15/600 con ícono de teclado y queda flotando en el blanco. Si la cámara falla, es la única salida, pero pesa como una acción secundaria. | Botón tonal a ancho completo, de 44 dp: fondo de acento al 12 %, texto de acento 13/600 y radio 6. Cuando hay error de cámara, se vuelve botón relleno. |
| P01-M4 | P2 | D7 | "Cómo conseguir el código" (16/600) y tres pasos en párrafo 15/400 gris con el número dentro del texto. Las líneas que siguen arrancan en el borde, sin sangría, y el bloque no tiene divisor que lo separe del visor. | Divisor de 1 px y rótulo "CÓMO CONSEGUIR EL CÓDIGO" 11/700 con tracking. Cada paso con su número en un círculo de 20 dp (11/700 mono) y texto 13/400 con sangría colgante de 32 dp. |

**Oscuro:** la card es `#1c1c1c` sobre `#0c0c0c`, un escalón más arriba de lo que pide D10 (card `#151515`) (sistémico: tokens de superficie). El resto no tiene hallazgos propios.

**Brief de boceto:**
- Convertir el hueco blanco del centro en un visor cuadrado de 240 dp con fondo gris claro, radio 8 y cuatro esquinas azules de encuadre. Poner el ícono QR de 32 px y el texto de error dentro del visor.
- Pasar "Escaneá el QR de tu sistema" a título negrita de 20 px, centrado debajo del logo.
- Reemplazar el enlace "Escribir dirección a mano" por un botón tonal azul claro de ancho completo y 44 dp de alto, con el ícono de teclado a la izquierda.
- Poner un divisor de 1 px arriba de "Cómo conseguir el código", pasar el rótulo a mayúsculas pequeñas y mostrar los tres pasos con el número en un círculo gris de 20 dp a la izquierda.

### P02 Servidores

Captura: `despues/P02-servidores-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P02-M1 | P1 | D4 | La card del servidor mide ~110 dp para tres líneas, con ~32 dp de aire arriba y abajo. Usa tres voces tipográficas: el nombre en 16/700, la URL en Roboto Mono 13 gris y "Sesión iniciada · admin@test.local" en 15/400 negro. El estado de la sesión no se distingue del correo. | Fila de 72 dp con padding 16: nombre 15/600, URL en mono 12 gris y, debajo, punto verde de 8 px + "Sesión iniciada" 12/500 y el correo 12/400 gris. |
| P02-M2 | P2 | D8 | El título de la barra, "Servidores", empieza en x≈72 dp, mientras la card y el botón arrancan en 16 dp. Hay dos líneas de inicio a 56 dp de distancia (sistémico: barra superior). | Título de la barra en x≈56 dp: flecha de 24 dp en 16 dp y 16 dp de separación. Se aplica a todas las barras. |
| P02-M3 | P2 | D6 | El tacho de 24 dp, en gris oscuro `#5c5c70`, tiene el mismo peso que el check azul del servidor activo. La acción destructiva queda tan visible como el estado. | Reemplazar el tacho por "⋯" de 20 dp en gris claro (Quitar, Cambiar) o dejarlo para el deslizamiento de la fila. |
| P02-M4 | P3 | D5 | El servidor activo se marca con un círculo-check de 24 dp en azul, un patrón que no se usa en ningún otro lugar. DESIGN.md define la selección con una lengüeta de 3 px. | Lengüeta de acento de 3 px en el borde izquierdo de la fila activa y sin el círculo. Si hay varios servidores, van en una sola card con divisores de 1 px. |

**Oscuro:** sin hallazgos propios (card `#1c1c1c`, ver P01).

**Brief de boceto:**
- Compactar la card del servidor a 72 dp de alto, con nombre en negrita de 15 px, URL monoespaciada gris de 12 px y una tercera línea con un punto verde de 8 px y "Sesión iniciada · admin@test.local" en 12 px.
- Quitar el círculo-check azul y marcar el servidor activo con una barra azul de 3 px en el borde izquierdo de la card.
- Cambiar el ícono de tacho por un "⋯" gris claro de 20 px.
- Mover el título "Servidores" de la barra hacia la izquierda, a 56 dp del borde, más cerca de la flecha.

### P03 Navegación

Captura: `despues/P03-navegacion-admin-light-390-android.png` (+ dark: **la Android oscura es copia de la clara**; revisado sobre `P03-navegacion-admin-dark-390-web.png`)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P03-M1 | P1 | D2 | El cajón usa seis estilos: "ESPACIO DE TRABAJO" en 11/700 con tracking, el nombre en 16/500, los ítems principales en 15/400 negro, los subítems en 15/400 gris `#5c5c70`, "PROYECTOS" en 11/700 y "ver todos" en 14/700 negro. "ver todos" es lo más oscuro del bloque y compite con el ítem activo. | Ítems y subítems en 14/500: primarios en texto principal y subítems en el mismo tamaño en gris. "ver todos" en 12/600 de acento. Nombre de usuario en 15/600. |
| P03-M2 | P1 | D8 | Hay dos ejes de íconos y de texto. Los ítems principales tienen el ícono en x≈32 dp y el texto en 52 dp; los subítems, el ícono en 39 dp y el texto en 60 dp. Las filas principales miden ~52 dp y las de subítem ~44 dp. | Un solo eje: íconos de 20 px en 16 dp (o en 32 dp para el nivel 2, con la guía vertical en 24 dp) y texto en 48/64 dp. Filas de 44 dp en todo el cajón. |
| P03-M3 | P2 | D4 | Los proyectos se ven como "QA produccion — Cartel…": el grupo va primero y el nombre del proyecto, que es lo que se busca, queda cortado en las tres filas. | Nombre del proyecto primero, en 14/500 ("Cartelería del local"), y el grupo como sufijo 12/400 gris o como rótulo de subgrupo. |
| P03-M4 | P2 | D5 | Los contadores "6" y "2" son círculos de 24 dp con borde gris `#d2d6de` y fondo claro. Parecen botones y pesan lo mismo que el texto del ítem. | Contadores de 18 dp de alto, sin borde, con fondo `#e9ecf1`, 11/600 en mono tabular y gris. |

**Oscuro:** en la referencia web oscura, el activo (fondo azul oscuro y texto `#5b7fff`) está bien. No hay hallazgos propios, pero falta una captura Android oscura real.

**Brief de boceto:**
- Igualar todas las filas del cajón a 44 dp de alto, con los íconos alineados en una sola columna y el texto en una sola línea de inicio.
- Pasar "ver todos" a texto azul pequeño de 12 px y bajar todos los ítems a 14 px de peso medio.
- Reescribir las filas de proyecto con el nombre primero ("Cartelería del local") y el grupo en gris pequeño a continuación, sin truncar el nombre.
- Reemplazar los círculos con borde de los contadores por pastillas grises de 18 dp sin borde, con números monoespaciados de 11 px.

### P04 Mi día

Captura: `despues/P04-midia-admin-light-390-android.png` (+ `-s2`; + dark: **la Android oscura es copia de la clara**; revisado sobre `P04-midia-admin-dark-390-web.png`)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P04-M1 | P1 | D1 | La cabecera de página llega hasta y≈209 dp: tile de ícono de 38 dp, título 24/700, subtítulo de dos líneas en 15/400 y regla. La primera tarea aparece recién en y≈365 dp (sistémico: cabecera de página). | Título 20/700 sin tile, subtítulo de una línea en 13/400 gris y sin regla. El contenido arranca antes de los 160 dp. |
| P04-M2 | P1 | D6 | Cada fila de tarea tiene chevron, título, contador "1/2", sol ámbar, "+" y "×", con controles de 24 dp separados unos 48 dp. El título queda en ~38 % del ancho y se parte en dos líneas ("Preparar los / originales"), con filas de 75 a 88 dp (sistémico: fila de tarea). | Checkbox o chevron + título en una línea + como máximo un sol de 16 px si está en Mi día. "+" y "×" van a "⋯" o al deslizamiento. Filas de 48 dp. |
| P04-M3 | P1 | D2 | Arriba de la lista hay dos líneas sueltas en dos familias: "lunes 26 de octubre" en Roboto Mono 13 gris y "Mi día: **3 de 9** completadas hoy" en 15/400 con cifras en 700. | Una sola línea, "Lunes 26 de octubre · 3 de 9 completadas", en 13/500 Montserrat con las cifras en mono tabular, y debajo una barra de progreso azul de 4 dp a ancho completo. |
| P04-M4 | P2 | D4 | Cada grupo repite "☀ Mi día" en 14/700 antes de la ruta "Cartelería del local › Preparación y entrega" en 14/400 gris: aparece cinco veces en dos pantallas, y es justamente el título de la página. | Encabezado de grupo: nombre del proyecto en 13/600 y "› Preparación y entrega" en 13/400 gris, sin "☀ Mi día". |
| P04-M5 | P2 | D5 | El sol activo es ámbar `#f59e0b` en las filas, pero el mismo concepto es azul en el tile de la cabecera y en el interruptor de P09. Además, D5 reserva el ámbar para el plazo de ≤3 días. | Sol activo en el azul de marca y sol inactivo en gris neutro `#8a8f98`, el mismo criterio en filas, cabecera y detalle. |

**Oscuro:** en la web oscura, el sol pasa a amarillo saturado `#facc15` y vibra sobre la card `#1c1c1c` (se resuelve con M5). Falta la captura Android oscura.

**Brief de boceto:**
- Quitar el tile azul con el sol junto al título y la regla horizontal. Dejar "Mi día y referencias" en negrita de 20 px y el subtítulo en una sola línea gris de 13 px.
- Unir la fecha y el contador en una línea ("Lunes 26 de octubre · 3 de 9 completadas") con una barra de progreso azul fina debajo.
- Dejar cada fila de tarea en una línea: checkbox, título completo y un sol azul pequeño a la derecha; quitar los íconos "+" y "×" visibles.
- Reemplazar los encabezados "☀ Mi día · Cartelería del local › …" por solo "Cartelería del local" en negrita de 13 px y "› Preparación y entrega" en gris.

### P05 Proyectos

Captura: `despues/P05-proyectos-admin-light-390-android.png` (+ dark; + `P05-…-s2-web.png` para las cards)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P05-M1 | P1 | D3 | Las cuatro cards KPI, en grilla de 2 × 2, ocupan ~190 dp (dos filas de ~87 dp + 12 de separación). El rótulo va en mono 13 gris ("Total · 100%") y el porcentaje repite datos obvios ("Total · 100%") (sistémico: KPI). | Una sola card de 72 dp con 4 columnas separadas por divisores verticales de 1 px: cifra 20/700 en mono y rótulo 11/700 Montserrat en mayúsculas. Sin porcentajes. |
| P05-M2 | P1 | D4 | El nombre del proyecto va como chip gris `#e9ecf1` en mayúsculas 15/700 ("PROYECTO PRIVADO"), con la estrella y "⋯" ~16 dp más abajo de su eje. La card mide ~196 dp para cuatro datos (sistémico: card de proyecto). | Nombre 15/600 en caja normal como título de la card, alineado con la estrella y "⋯", y el grupo en 12/400 gris debajo. Card de ~128 dp. |
| P05-M3 | P1 | D5 | La barra de progreso es verde `#15803d` (en el detalle de P07 es azul) y "3 días restantes" va en ámbar oscuro `#954616` e itálica, junto a "Entrega: 29/10/2026" en 15/400. | Barra de 4 dp en el azul de marca, verde solo al 100 %. Meta en una línea 12/500: "29 oct · 3 días" con el plazo en ámbar sin itálica. "1/3 tareas" y "33 %" en mono 12 en la misma fila que la barra. |
| P05-M4 | P2 | D7 | La barra de búsqueda mezcla tres estilos: buscador relleno de 47 dp, "Filtros" con borde de 44 dp, "Más recientes" como texto sin borde y el selector grilla/lista en un contenedor gris. "3 proyectos" va en una franja aparte con divisor dentro de la misma card (sistémico: barra de listado). | Todos los controles de 40 dp con radio 6 y relleno `#f1f3f6`. "3 PROYECTOS" en 11/700 fuera de la card, como rótulo de la lista. |
| P05-M5 | P2 | D8 | El margen de página es de ~12 dp (cards en x≈12) y el padding interno de la card de herramientas ~8 dp. P02 usa 16 dp (sistémico: gutter de página). | Margen de página de 16 dp, padding de card de 16 y 12 dp entre cards. |

**Oscuro:** el progreso `#3ecf8e` y el plazo `#f5cd4b` vibran sobre la card `#1c1c1c`. El buscador (`#151515`) es más oscuro que la card que lo contiene, un escalón invertido respecto de D10 (sistémico: tokens de superficie).

**Brief de boceto:**
- Reemplazar las 4 cards KPI por una sola card de 72 dp con 4 columnas separadas por divisores verticales: cifra en negrita de 20 px y rótulo en mayúsculas de 11 px (TOTAL, EN PROGRESO, COMPLETADOS, PENDIENTES).
- En cada card de proyecto, quitar el chip gris y mostrar el nombre "Proyecto privado" como título en negrita de 15 px, con la estrella y "⋯" alineados en la misma línea.
- Pintar la barra de progreso en azul de marca y poner "1/3 · 33 %" en la misma línea, a la derecha.
- Escribir el plazo como "29 oct · 3 días" en una línea de 12 px, con "3 días" en ámbar sin itálica.
- Unificar la fila Filtros / Más recientes / vista en controles de 40 dp con el mismo fondo gris claro y sacar "3 proyectos" fuera de la card como rótulo pequeño en mayúsculas.

### P06 Crear proyecto

Captura: `despues/P06-crear-proyecto-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P06-M1 | P1 | D8 | El diálogo no tiene una posición fija: en claro arranca en y≈76 dp, pegado a la barra, y en oscuro en y≈216 dp. En oscuro, el velo casi no oscurece (`#0a0a0a` sobre `#0c0c0c`) y los filtros de abajo ("Todas las etiquetas", "Grupos") siguen legibles y compiten con el formulario. | Hoja inferior anclada al pie, con radio 12 arriba y la misma posición en ambos temas, o diálogo siempre centrado. Velo negro al 60 % en los dos temas. |
| P06-M2 | P2 | D2 | Los rótulos "Ámbito", "Nombre" y "Descripción (opcional)" van en 15/500 gris: el mismo tamaño que el valor y el placeholder (15/400). Los campos miden 47 dp. | Rótulos en 12/600 de texto secundario, 6 dp por encima del campo. Campos de 44 dp con valor en 14/400. |
| P06-M3 | P2 | D7 | "Ámbito" usa el triángulo relleno ▼ de Material, mientras la barra de P05 usa el chevron de Material Symbols. El contador "0 / 2.000" queda ~16 dp a la izquierda del borde del campo. | Chevron "expand_more" de 20 px en gris en todos los desplegables. Contador 11/500 en mono, alineado al borde derecho del campo. |
| P06-M4 | P3 | D7 | "Cancelar" es un botón con borde y texto de acento, del mismo alto (40 dp) y con casi el mismo peso visual que "Crear proyecto". | "Cancelar" como botón de texto gris 13/600 sin borde, con "Crear proyecto" como único botón con forma. |

**Oscuro:** los campos `#151515` dentro del diálogo `#262626` escalonan bien, pero el velo casi nulo (M1) hace que el diálogo no se despegue de la página.

**Brief de boceto:**
- Convertir el diálogo en una hoja inferior anclada al pie de la pantalla, con esquinas superiores de radio 12 y el fondo oscurecido de forma pareja.
- Achicar los rótulos de campo a 12 px en gris y acercarlos a su campo.
- Cambiar el triángulo negro del desplegable "Ámbito" por un chevron fino gris y alinear "0 / 2.000" al borde derecho del campo de descripción.
- Dejar "Cancelar" como texto gris sin borde a la izquierda del botón azul "Crear proyecto".

### P07 Detalle de proyecto

Captura: `despues/P07-detalle-proyecto-admin-light-390-android.png` (+ `-s2`; + dark: **la Android oscura es copia de la clara**; revisado sobre `P07-detalle-proyecto-admin-dark-390-web.png`)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P07-M1 | P1 | D3 | El compositor fijo del pie ("Agregar tarea en / Generales" de 47 dp + campo con enviar de 47 dp + enlace "Descripción y ayuda") ocupa ~155 dp, el 23 % del alto visible, también mientras se lee la cabecera del proyecto. | Una sola barra de 56 dp: campo "Nueva tarea en Generales…" con un chip selector de destino 12/600 a la izquierda, dentro del campo, y botón enviar de 40 dp. "Descripción y ayuda" pasa a un ícono "?" en el campo. |
| P07-M2 | P1 | D7 | La card de cabecera cambia de fondo a mitad de camino: la descripción va en una caja gris `#f1f3f6` con borde y, desde y≈555 dp, la card pasa de `#ffffff` a `#f1f3f6` en el bloque "Etiquetas / Código / carpeta", que además queda cortado por el compositor (sistémico: cabecera de entidad). | Card blanca única. Las secciones Descripción · Avance · Fecha límite · Etiquetas · Código van separadas por divisores de 1 px. Descripción como texto plano 13/400 de 3 líneas, sin caja. |
| P07-M3 | P2 | D2 | En la misma pantalla conviven dos estilos de rótulo: "Descripción", "Avance", "Fecha límite" y "Etiquetas" en 14/500 gris en caja normal, y "TAREAS GENERALES" en 11/700 en mayúsculas con tracking. | Todos los rótulos de sección en 11/700, en mayúsculas y con tracking de 0,06 em. |
| P07-M4 | P2 | D6 | En `-s2` hay tres filas de controles (~150 dp) antes de la primera tarea: "Nuevo objetivo" (166 dp) e "Insertar plantilla" (175 dp) apilados con anchos distintos, más el segmentado Lista/Tablero. "Ordenar tareas" es un enlace suelto alineado a la derecha. | Una sola fila de 40 dp: segmentado Lista \| Tablero a la izquierda y, a la derecha, "+ Objetivo" (botón con borde) y "⋯" con Insertar plantilla y Ordenar tareas. |
| P07-M5 | P2 | D9 | Las migas "Todos los proyectos / Cartelería del local" van en 15/400, el tamaño del cuerpo, y repiten el título que aparece 50 dp más abajo (sistémico: migas). | Migas en 12/500 gris con solo el nivel padre ("Todos los proyectos ›"). El título queda como única mención del nombre. |

**Oscuro:** en la web oscura, la descripción va en una caja `#151515`, más oscura que la card `#1c1c1c` (escalón invertido, sistémico), y "3 días restantes" en amarillo saturado `#facc15` (ver P05-M3). Falta la captura Android oscura.

**Brief de boceto:**
- Reducir el bloque fijo del pie a una sola barra de 56 dp: campo "Nueva tarea en Generales…" con un chip "Generales ▾" pequeño dentro, a la izquierda, y el botón azul de enviar. Quitar la línea "Descripción y ayuda".
- Dejar la card de cabecera toda blanca: descripción como párrafo gris sin caja y secciones separadas por divisores de 1 px, con rótulos en mayúsculas de 11 px (DESCRIPCIÓN, AVANCE, FECHA LÍMITE, ETIQUETAS).
- Achicar las migas a 12 px gris y dejar solo "Todos los proyectos ›".
- En la sección de tareas, reemplazar los dos botones apilados por una fila con el segmentado Lista | Tablero a la izquierda y "+ Objetivo" y "⋯" a la derecha.

### P07 Materiales (pestaña)

Captura: `despues/P07-materiales-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P07M-M1 | P1 | D1 | La pestaña de un proyecto se abre como pantalla raíz: marca "›genwork" en la barra y tile + "Materiales" en 24/700 con regla. En ningún lugar se ve de qué proyecto son los materiales (sistémico: cabecera de página). | Barra con "←" y "Materiales" en 20/700 sin tile, con "Cartelería del local" en 12/500 gris como subtítulo. Sin regla. |
| P07M-M2 | P1 | D8 | El buscador queda reducido a ~203 dp y trunca su placeholder ("Buscar producto e…"). El interruptor de 52 dp y "Solo insumos" empujan la fila hasta ~12 dp del borde derecho. | Buscador a ancho completo de 40 dp. Debajo, un chip de filtro rectangular "Solo insumos" de 32 dp con check, radio 4 y estado seleccionado con fondo de acento al 12 %. |
| P07M-M3 | P2 | D7 | El estado vacío pide "Agregá productos de Genstock…" pero no ofrece ninguna acción. El ícono de caja es de 40 dp con trazo grueso en `#5c5c70`, más oscuro que el texto de apoyo. | Botón tonal "Agregar material" de 40 dp, 16 dp debajo del texto. Ícono de 32 px en gris claro `#8a8f98`. |
| P07M-M4 | P2 | D5 | Es el interruptor Material 3 por defecto (track de 52 × 32 dp, thumb de 24 dp): la única pieza grande y ovalada en una interfaz de radios 4/6. En oscuro, el thumb es negro sobre azul (sistémico: interruptor). | Interruptor compacto de 36 × 20 dp con thumb blanco en ambos temas y track gris `#d2d6de` cuando está apagado. |

**Oscuro:** el thumb negro del interruptor (M4). El resto no tiene hallazgos propios.

**Brief de boceto:**
- Quitar el tile azul y la regla. Poner "Materiales" en negrita de 20 px y debajo "Cartelería del local" en gris de 12 px.
- Llevar el buscador a todo el ancho y reemplazar el interruptor por un chip rectangular "✓ Solo insumos" de fondo azul claro, en la línea siguiente.
- Agregar debajo del texto del estado vacío un botón tonal azul claro "Agregar material" y aclarar el ícono de caja.

### P08 Plantillas

Captura: `despues/P08-plantillas-admin-light-390-android.png` (+ dark: **la Android oscura es copia de la clara**; revisado sobre `P08-plantillas-admin-dark-390-web.png`)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P08-M1 | P1 | D3 | Con cero plantillas, las cuatro cards KPI muestran "0 · 0%" y ocupan ~190 dp: el estado vacío queda empujado a y≈615 dp y su botón cae debajo del pliegue (sistémico: KPI, ver P05-M1). | Ocultar la franja de KPI y la barra de herramientas cuando el total es 0. Con datos, usar la franja única de 72 dp. |
| P08-M2 | P1 | D1 | El título se parte en dos líneas ("Plantillas de / objetivo", 24/700) al lado de un botón relleno "Nueva plantilla" de 148 dp. El mismo botón relleno se repite en el estado vacío: hay dos primarios en pantalla. | Título 20/700 en una línea y, en la cabecera, un botón de ícono "+" de 40 dp como en P05. El botón relleno queda solo en el estado vacío. |
| P08-M3 | P2 | D7 | La barra de herramientas dice "Buscar proyectos…" y "0 proyectos" en una pantalla de plantillas. "Más recientes" es una fila de 47 dp sin borde, distinta del control de orden de P05 (sistémico: barra de listado). | "Buscar plantillas…" y "0 PLANTILLAS" en 11/700. El orden va como control de 40 dp con relleno, igual que en P05. |
| P08-M4 | P2 | D2 | El texto del estado vacío ocupa cuatro líneas en 15/400 centrado y termina en "desde su menú ⁝." con el glifo pegado al punto. El ícono es una carpeta cerrada en Android y abierta en la web, y no coincide con el ícono de plantillas del cajón. | Texto en 13/400, con un máximo de 3 líneas en 300 dp. Ícono de plantillas (`library_books`), el mismo del cajón, en 32 px gris. |

**Oscuro:** la web oscura no tiene hallazgos propios. Falta la captura Android oscura.

**Brief de boceto:**
- Quitar las cuatro cards KPI con ceros y la barra de búsqueda, para que el estado vacío suba debajo de la cabecera.
- Poner "Plantillas de objetivo" en una línea en negrita de 20 px y reemplazar el botón "Nueva plantilla" de la cabecera por un botón cuadrado azul "+" de 40 dp.
- Cambiar el ícono de carpeta del estado vacío por el ícono de plantillas (hojas apiladas) en gris claro y acortar el texto a tres líneas de 13 px.

### P09 Detalle de tarea

Captura: `despues/P09-detalle-tarea-admin-light-390-android.png` (+ dark)

> **Decisión del usuario (2026-10-26):** al abrir una tarea, lo principal es la descripción, las subtareas y la asignación. Estado, Mi día, Urgente y Recordatorio pasan a una fila de chips compactos, como un selector de estado, en lugar de filas con interruptor. Mover, Historial y Borrar van al menú "⋯". Hoy la asignación se hace escribiendo `@persona` o `#sector` en el texto de la tarea; el chip "+ Asignar" del boceto agrega un selector sobre ese mismo mecanismo. El brief de boceto de abajo ya sigue esta decisión; el boceto anterior quedó en `bocetos/P09-detalle-tarea-boceto-v1.png`.

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P09-M1 | P1 | D5 | El estado seleccionado "Pendiente" va en texto `#aab8fd` sobre `#eef1ff` (~1,7:1), con un check azul pálido: se ve deshabilitado. "Terminado" va en `#9c9da2` con un punto verde lavado `#9ed5b5`. En oscuro, `#31427e` sobre `#26335d` casi no se ve. El contraste en sí se trata en S10. | Segmentado de dos opciones de 36 dp a ancho completo: seleccionado con fondo de acento al 12 % y texto `#3b5bfa` 13/600; no seleccionado con texto secundario `#5c5c70` y punto del color del estado a saturación plena. |
| P09-M2 | P1 | D1 | El título de la tarea aparece dos veces en 100 dp (barra 18/600 y campo "Tarea"). Antes del contenido hay tres piezas sueltas sin contenedor: "Urgente" con su interruptor, "Crear recordatorio" como enlace centrado y el campo. Recién después vienen las cards Estado y Descripción. | En la barra, la ruta "Cartelería del local › Preparación y entrega" en 12/500. El título queda como campo editable sin borde en 17/600, que es el encabezado. Urgente, En Mi día y Recordatorio van en una card de filas de 56 dp con divisores. |
| P09-M3 | P2 | D7 | El campo "Tarea" es un Material outlined con etiqueta flotante, el único de la app: los demás son rellenos `#f1f3f6`. "Guardar tarea" y "Guardar descripción" son enlaces azules con check, sin forma de botón (sistémico: botón guardar). | Campos rellenos `#f1f3f6` de radio 6 y rótulo encima. Guardar como botón tonal de 36 dp alineado a la derecha del grupo, visible solo cuando hay cambios. |
| P09-M4 | P2 | D8 | Los chips de contexto están desalineados: "/Cartelería del local" mide 32 dp de alto y "Preparación y entrega" 22 dp, con líneas base ~8 dp desfasadas. "#Impresión" va en otra fila, 20 dp más abajo. | Fila de chips de 24 dp de alto, 12/600, radio 4, separación de 8 dp, con salto de línea natural y la misma línea base. |
| P09-M5 | P3 | D2 | Los encabezados de card "✓ Estado" y "📄 Descripción" van en 16/600 con íconos de 24 dp, mientras otras pantallas usan rótulos 11/700. El check junto a "Estado" se confunde con un estado completado. | Rótulos ESTADO y DESCRIPCIÓN en 11/700, en mayúsculas y sin ícono. |

**Oscuro:** el thumb del interruptor es negro `#0c0c0c` sobre el track `#5b7fff` (sistémico: interruptor) y el punto verde de "Terminado" (`#154b29`) casi no se ve sobre `#151515`.

**Brief de boceto:**
- Prioridad de la pantalla según el usuario: al abrir una tarea lo importante es la DESCRIPCIÓN, administrar las SUBTAREAS y ASIGNARLA. Todo lo demás es secundario y chico.
- Barra superior: "×" a la izquierda, miga gris "Cartelería del local › Preparación y entrega" y un "⋯" a la derecha (ahí van Mover a objetivo, Mover bajo otra tarea, Historial y Borrar tarea; no se muestran en la pantalla).
- Título de la tarea "Preparar los originales" en 20/700, editable en el lugar (sin caja de campo ni botón "Guardar tarea").
- Justo debajo, UNA fila de chips compactos de 32 px, del mismo estilo que un selector de estado: "● Pendiente ▾" (estado, chip con punto de color y flecha), "☀ Mi día" (chip activo: fondo azul muy claro y texto azul), "⚑ Urgente" (chip apagado: borde fino gris) y "🔔 Recordatorio" (chip apagado). Reemplazan las filas grandes con interruptores de Urgente y En Mi día, el segmentado de Estado y el enlace "Crear recordatorio".
- Fila "ASIGNADA A" (rótulo 11/700): chips rectangulares "#Impresión" (sector, azul claro) y "/Cartelería del local" (proyecto, violeta claro) y un chip punteado "+ Asignar" para sumar una persona o un sector.
- DESCRIPCIÓN como bloque principal: área de texto grande (unas 6 líneas) con el placeholder "Agregá detalles, medidas o instrucciones…", sin botón suelto; un "Guardado ✓" chico gris a la derecha del rótulo.
- SUBTAREAS (rótulo 11/700 con contador "1/2" a la derecha): lista en una card con filas de 48 px y divisores: "☑ Revisar medidas y sangrado" (tachada, gris) y "☐ Confirmar colores con el cliente"; cada fila con un asa de arrastre gris a la izquierda y nada más. Al final, la fila "+ Nueva subtarea…" como campo integrado en la card.

### P10 Tablero

Captura: `despues/P10-tablero-admin-light-390-android.png` (+ dark: ver nota; referencia `P10-tablero-admin-dark-390-web.png`)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P10-M1 | P1 | D1 | (sistémico: GenSectionHeader). Debajo de la barra de 40 dp con el logo hay un segundo encabezado: tile de ícono de 38 dp en `brandFill`, título «Vista de tareas» de 24/700, subtítulo de 13 y regla de 1 px. La primera card de sector arranca a ~235 dp y el bloque de título ocupa ~80 dp sin aportar datos. Lo mismo pasa en P11, P13 y P15, donde el subtítulo ocupa dos líneas y la primera card baja a ~225 dp. | En las raíces, sacar el tile y el subtítulo y dejar el título en 20/700 con la acción principal en el mismo renglón. La línea de resumen («6 tareas pendientes · 3 sectores») pasa a ser el subtítulo de 13 `muted`. El contenido tiene que empezar antes de los 160 dp. El tile queda solo para las entidades (sector, grupo, proyecto). |
| P10-M2 | P1 | D6 | Cada tarea ocupa ~133 dp y 4 renglones: título, ruta con carpeta, «1/2 subtareas» y chip de estado. La ruta «Cartelería del local › Preparación y entrega» se repite igual en las 3 filas de la misma card, así que una columna de 3 tareas mide ~440 dp. | Agrupar por proyecto dentro de la columna con un subtítulo de 11/700 en mayúsculas (tracking 0,06 em) que se muestra una vez. La fila queda en título 13/500 más una sola línea de metadatos 12 `muted` («1/2 subtareas · En curso»), con 56 dp de alto. |
| P10-M3 | P2 | D5 | Todas las filas llevan el mismo punto azul de 10 dp, sea «En curso» o «Pendiente», y los dos chips de estado son grises e iguales (borde `#d2d6de`, texto `muted`). El único color de la fila no significa nada y el estado no se distingue a simple vista. | Reemplazar el punto por un anillo de estado de 16 dp: contorno gris para Pendiente y medio relleno en azul de marca para En curso. Quitar el chip, o dejarlo solo para «En curso» en tonal de acento al 12 %. |
| P10-M4 | P2 | D2 | En la banda de cada columna conviven dos contadores y dos formatos de avance. El «2» va en una caja rectangular con borde (radio 4), mientras que el mismo dato en P11 es una píldora (`CountBadge`). Además «1 de 3 finalizadas» repite lo que dice la barra, y «33%» va en Montserrat 13/600. | Usar `CountBadge` también aquí. Pasar «33%» a Roboto Mono 12 con números tabulares, alineado a la derecha en el renglón del nombre, y sacar «1 de 3 finalizadas» (la barra de 4 dp ya lo muestra). La banda baja de ~85 a ~56 dp. |
| P10-M5 | P3 | D4 | Las tres columnas se titulan «Impresión» (un sector por grupo) con el mismo tick azul y el mismo «2». Nada en la cabecera indica a qué grupo pertenece cada una. | Agregar arriba del nombre el grupo como rótulo de 11/700 en mayúsculas `muted` («QA PRIVADO»), o como sufijo «Impresión · QA privado» en 13 `muted`. |

**Oscuro:** en la referencia oscura la banda de la cabecera (`#151515`) es más oscura que el cuerpo de la card (`#1c1c1c`). El escalón queda al revés de D10: la card tiene que ser `#151515` y la banda `#1c1c1c`.

**Brief de boceto:**
- Quitar el tile azul de 38 dp y el subtítulo. Dejar «Vista de tareas» en 20/700 y debajo «6 tareas pendientes · 3 sectores» en 13 gris, con «3 de 9 finalizadas» a la derecha en Roboto Mono 12.
- En la banda de cada sector, poner en un solo renglón el tick de color, «Impresión» 15/700, el contador en píldora gris y «33%» en mono a la derecha. Debajo, solo la barra azul de 4 dp, sin el texto «1 de 3 finalizadas».
- Dentro de la card, agregar un subtítulo «CARTELERÍA DEL LOCAL · PREPARACIÓN Y ENTREGA» de 11/700 gris una sola vez y quitar la ruta con carpeta de cada fila.
- Cada tarea en una fila de 56 dp: anillo de estado de 16 dp a la izquierda (medio azul para En curso, gris vacío para Pendiente), título de 13/500 y debajo «1/2 subtareas · En curso» en 12 gris. Sin chips.

### P11 Sectores

Captura: `despues/P11-sectores-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P11-M1 | P1 | D5 | (sistémico: CardProgress). El avance del sector se pinta con una barra verde `#15803d` de 8 dp, pero ese mismo sector «Impresión» al 33 % aparece en azul de 4 dp en P10 y en P12. Verde y azul significan lo mismo según la pantalla. | En `CardProgress`, rellenar con `brand` y bajar la barra a 4 dp. Usar verde solo al 100 %. El «33%» va en Roboto Mono 12 tabular. |
| P11-M2 | P1 | D4 | (sistémico: NamePill). El nombre del sector es un chip en mayúsculas («IMPRESIÓN», 14/600 sobre azul al 14 % `#e4e8fe`) y la cabecera de grupo también va en mayúsculas («QA PRIVADO», 13/700 con tracking de ~0,2 em). Hay dos niveles en mayúsculas compitiendo y el nombre de la entidad parece una etiqueta. | El nombre del sector pasa a ser el título de la card, en 15/600 y en la caja original («Impresión»), con el color del sector como punto de 8 dp a la izquierda. La cabecera de grupo va en 11/700 con tracking de 0,06 em. |
| P11-M3 | P2 | D3 | La card de herramientas mide ~184 dp y apila tres renglones: buscador de 48 dp, «Filtros» más el orden «Nombre · A–Z», y «3 sectores / Contraer todo» con una regla en el medio. La primera cabecera de grupo empieza a ~420 dp, así que en la primera pantalla entran apenas 2 sectores. | Sacar la card contenedora. Un renglón de 40 dp con el buscador y un botón de ícono de filtros (con un punto si hay filtros activos), y debajo un renglón de 32 dp con «3 sectores» a la izquierda y el orden más «Contraer» a la derecha, en 12/600. El primer grupo tiene que quedar antes de los 300 dp. |
| P11-M4 | P2 | D7 | Cada cabecera de grupo es una card aparte (40 dp, relleno `#f1f3f6`, lengüeta azul de 3 dp, chevron, punto azul, nombre, «(1)» y píldora «2») separada 8 dp de la card de su sector. Tiene dos contadores con significados distintos y la lengüeta y el punto repiten el mismo color. | Convertir la cabecera en un rótulo sin card: chevron de 20 dp, nombre 11/700 y a la derecha «1 sector · 2 pendientes» en 12 `muted`. Quitar el punto, porque la lengüeta ya lleva el color. |

**Oscuro:** el verde `#3ecf8e` de la barra es el tono más saturado de la pantalla y vibra sobre `#1c1c1c`. La cabecera de grupo (`#151515`) es más oscura que la card del sector (`#1c1c1c`), otra vez con el escalón invertido. El chip del nombre en `#353a4d`, casi neutro, pierde el color del sector.

**Brief de boceto:**
- Reemplazar la card de búsqueda por un buscador de 40 dp con un botón de filtros cuadrado a la derecha. Debajo, una línea fina con «3 sectores» a la izquierda y «Nombre A–Z · Contraer» a la derecha en 12 gris.
- Convertir cada cabecera de grupo en un rótulo plano: chevron, «QA PRIVADO» en 11/700 gris con poco tracking y a la derecha «1 sector · 2 pendientes». Sin caja, sin punto azul ni píldora.
- En cada card de sector, cambiar el chip «IMPRESIÓN» por el título «Impresión» de 15/600 con un punto azul de 8 dp delante y la píldora «2» a la derecha.
- Cambiar la barra verde de 8 dp por una azul de 4 dp, con «33%» en mono gris a la derecha y «1/3 tareas» debajo en 12 gris.

### P12 Detalle de sector

Captura: `despues/P12-detalle-sector-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P12-M1 | P1 | D6 | (sistémico: TaskTile). La fila «Preparar los originales» muestra el contador «1/2» en círculo, el sol ámbar `#f59e0b`, «+» y «×», los cuatro a 24 dp y con el mismo peso. Al título le quedan ~110 dp y se parte en dos líneas. La subtarea «Confirmar colores con el cliente» también se parte. | Dejar en la fila el checkbox, el título en una línea y como máximo el sol (solo si está en Mi día, a 20 dp). «1/2» pasa a texto de 12 `muted` bajo el título, y «+» y «×» van a un menú «⋯» o a una pulsación larga. |
| P12-M2 | P1 | D9 | Hay dos controles segmentados apilados con anchos y alineaciones distintos. «Lista / Tablero» está alineado a la derecha con 208 dp y «Pendientes / Hechas / Todas» a la izquierda con 300 dp, terminando 24 dp antes del borde de la card. Los dos usan el mismo estilo de selección y no se sabe cuál manda. | Cambiar la vista (Lista/Tablero) por dos botones de ícono de 36 dp en el renglón del título «Tareas». El filtro de estado ocupa todo el ancho de la card con 36 dp de alto y segmentos iguales. |
| P12-M3 | P2 | D7 | La card de la entidad mezcla tres estilos. «Avance del sector» va en 13/400, «33%» en Montserrat 20/700 y abajo hay una banda gris `#f1f3f6` con «1 proyecto vinculado», «Color del sector» y una muestra de color en una caja con borde de 36 dp que parece un botón suelto. | El rótulo pasa a 11/700 en mayúsculas («AVANCE»), la cifra a Roboto Mono 20/700 tabular y la banda gris a un renglón separado por un divisor de 1 px. El color del sector va como tick junto al título y su edición, al menú «⋯». |
| P12-M4 | P3 | D8 | El subtítulo de proyecto «CARTELERÍA DEL LOCAL» empieza 8 dp más adentro que el resto del contenido de la card (~33 dp contra 24 dp) y tiene un tracking de ~0,15 em, más abierto que cualquier otro rótulo. | Alinearlo a la misma línea de inicio que «Tareas» y bajar el tracking a 0,06 em, en 11/700. |
| P12-M5 | P3 | D1 | El compositor fijo de abajo más el enlace azul «Descripción y ayuda» ocupan ~105 dp permanentes. El enlace queda flotando fuera de cualquier contenedor. | Llevar «Descripción y ayuda» al menú «⋯» de la entidad y dejar el compositor en 48 dp pegado al borde inferior. |

**Oscuro:** el sol pasa a `#fbbf24`, el amarillo más fuerte de la pantalla, y vibra sobre `#1c1c1c`. Conviene usar un ámbar desaturado (~`#e0a83a`) que mantenga 4,5:1 (D10).

**Brief de boceto:**
- En la card «Impresión», cambiar «Avance del sector» por el rótulo «AVANCE» 11/700 gris y poner «33%» en Roboto Mono. Reemplazar la banda gris inferior por una línea divisoria con «1 proyecto vinculado» a la izquierda y sin la caja de color.
- Junto a «Tareas · 2 pendientes», poner dos íconos de 36 dp (lista y cuadrícula) en lugar del segmentado «Lista / Tablero».
- Hacer que el segmentado «Pendientes / Hechas / Todas» ocupe todo el ancho de la card.
- Dejar la fila «Preparar los originales» en una sola línea con chevron, título y sol, y «1/2 subtareas» en 12 gris debajo. Quitar «+» y «×».
- Quitar el enlace azul «Descripción y ayuda» de debajo del compositor.

### P13 Grupos

Captura: `despues/P13-grupos-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P13-M1 | P1 | D4 | (sistémico: NamePill, detallado en P11-M2). Cada grupo se presenta como un chip en mayúsculas («QA PRODUCCION») sobre azul `#e4e8fe`, en vez de con su nombre como título. | Título 15/600 en la caja original («QA produccion»), con el punto del color del grupo de 8 dp. |
| P13-M2 | P2 | D5 | La insignia «pública» va en ámbar (texto `#92400e` sobre `#fffbeb`) y en minúscula. El ámbar está reservado para plazos cercanos (D5) y acá marca una configuración de visibilidad. | Usar un chip neutro (`hover` con texto `muted`) con un ícono de 14 dp de globo o de ojo y el texto «Pública». |
| P13-M3 | P2 | D8 | Cada grupo es una card de ~87 dp que contiene solo el chip y «1 miembro · 1 proyecto», sin chevron ni otra señal de que se puede tocar. Con 3 grupos queda el 40 % de la pantalla vacío. | Usar una sola card con filas de 56 dp separadas por divisores: punto, nombre 15/600, metadatos 13 `muted` debajo y chevron de 20 dp `muted` a la derecha. |
| P13-M4 | P3 | D7 | El buscador está apoyado directo sobre la página con relleno `#f1f3f6` sobre `#f4f5f8`: casi sin contraste, lo sostiene solo el borde. En P11 el mismo buscador va dentro de una card blanca. | Mismo tratamiento en las dos listas: buscador sin card y con relleno `#ffffff` y borde `#e3e6eb` cuando apoya sobre la página. |
| P13-M5 | P3 | D1 | (sistémico: GenSectionHeader, ver P10-M1). Tile, título de 24 y subtítulo de dos líneas: la lista empieza a ~225 dp. | Ver P10-M1. |

**Oscuro:** «pública» en `#fcd34d` sobre `#32291a` es el único amarillo saturado de la pantalla y atrae más que los nombres. El buscador oscuro va sin relleno (solo contorno) y el claro va relleno, así que los dos temas no usan el mismo campo (D7).

**Brief de boceto:**
- Quitar el tile y el subtítulo de dos líneas y dejar «Grupos» en 20/700 con el botón «+» en el mismo renglón.
- Reunir los tres grupos en una sola card blanca con divisores, filas de 56 dp: punto azul de 8 dp, «QA produccion» en 15/600 sin chip, «2 miembros · 1 proyecto» en 13 gris debajo y chevron gris a la derecha.
- Cambiar la insignia ámbar «pública» por un chip gris con un ícono de globo pequeño y el texto «Pública».

### P14 Detalle de grupo

Captura: `despues/P14-detalle-grupo-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P14-M1 | P1 | D1 | El encabezado del grupo no sigue el de la otra entidad hermana. En P12 el sector va en una card con tile, título y «⋯», y acá el grupo va suelto sobre la página: punto de 14 dp, título de 24/700 y una línea de metadatos. Son dos jerarquías distintas para el mismo tipo de pantalla. | Usar el mismo encabezado de entidad en sector, grupo y proyecto: card con título 20/700, metadatos 13 `muted` y «⋯». El color va como tick o punto de 8 dp. |
| P14-M2 | P1 | D8 | Las filas de navegación «Clientes del grupo» y «Etiquetas del grupo» miden ~110 dp cada una (título 15/600 más descripción de dos líneas, con mucho aire arriba y abajo). Pesan más que la lista de miembros. | Filas de 56 dp: título 15/600, descripción de una línea en 13 `muted` truncada y chevron de 20 dp. |
| P14-M3 | P2 | D5 | Los roles usan colores sin otro uso en la app: «admin principal» va en violeta `#7c3aed` sobre `#f3eeff` y «admin» en el azul de marca al 12 %, que se lee como un estado seleccionado. | Usar chips neutros (`hover` y `muted`). «Admin principal» lleva un ícono de estrella de 14 dp, sin color propio. |
| P14-M4 | P2 | D7 | «Agregar miembro» es un botón contorneado de 185 dp alineado a la izquierda, metido 4 dp bajo «Miembros» y antes de la lista. El «⋯» aparece solo en el segundo miembro, así que las filas no comparten borde derecho, y no hay avatares. | Encabezado de sección «MIEMBROS 2» en 11/700 con «Agregar» como botón tonal de 32 dp a la derecha del mismo renglón. Filas de 56 dp con avatar de iniciales de 32 dp, nombre y correo, y la columna del «⋯» reservada en todas las filas. |

**Oscuro:** el violeta («admin principal», `#2b2350` con texto lila) es el único tono violeta de todo el tema oscuro y se ve fuera de la paleta.

**Brief de boceto:**
- Poner el encabezado del grupo dentro de una card como la del sector: «QA produccion» en 20/700 con punto azul de 8 dp, «2 miembros · 1 proyecto · 2 pendientes» en 13 gris y «⋯» a la derecha.
- En la card de miembros, cambiar el título y el botón suelto por un renglón con «MIEMBROS 2» en 11/700 gris y un botón tonal azul «Agregar» a la derecha.
- Agregar a cada miembro un avatar circular de 32 dp con iniciales y cambiar los chips violeta y azul por chips grises («Admin principal» con una estrellita).
- Reducir «Clientes del grupo» y «Etiquetas del grupo» a filas de 56 dp con descripción de una línea y chevron.

### P15 Notas

Captura: `despues/P15-notas-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P15-M1 | P2 | D2 | En la card de la nota, la fecha «ayer» ocupa su propio renglón entre el título y el extracto, en 13 `muted` con tracking abierto. El orden de lectura queda título, fecha y cuerpo, y la fecha pesa como el extracto. | Llevar la fecha al renglón del título, alineada a la derecha en 12 `muted` (Roboto Mono solo si es una fecha numérica). El extracto, en 13 `muted`, va debajo con dos líneas como máximo. |
| P15-M2 | P2 | D8 | El ícono de documento de 20 dp en la card repite el del tile del encabezado y corre el título a ~55 dp, mientras «ayer» y el extracto empiezan a ~28 dp. Quedan dos líneas de inicio dentro de la misma card. | Quitar el ícono de la card (todas son notas) para que título, fecha y extracto arranquen en la misma línea de 16 dp. |
| P15-M3 | P3 | D1 | (sistémico: GenSectionHeader, ver P10-M1). Tile y subtítulo de dos líneas «Tu espacio para escribir…»: la única nota empieza a ~225 dp. | Ver P10-M1. |

**Oscuro:** sin hallazgos propios. La card es `#1c1c1c` sobre `#0c0c0c` (ver el sistémico de superficies oscuras).

**Brief de boceto:**
- Quitar el tile y el subtítulo y dejar «Mis notas» en 20/700 con el «+» en el mismo renglón.
- En la card, quitar el ícono de documento y poner «Notas de producción» en 15/600 a la izquierda con «ayer» en 12 gris alineado a la derecha en el mismo renglón.
- Debajo, el extracto en 13 gris en dos líneas como máximo, alineado con el título.

### P16 Nota

Captura: `despues/P16-nota-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P16-M1 | P1 | D1 | Antes del texto se apilan cinco franjas: barra con logo, migas con papelera (~136 dp), título de 24/700 (~184 dp), un renglón solo con ✓ y ⋯ y tres cuartos vacíos (~232 dp), «Guardado» suelto (~265 dp) y la barra de formato. El cuerpo empieza a ~352 dp: casi la mitad de la pantalla es interfaz. | Poner las migas y las acciones (✓, ⋯) en un solo renglón. Debajo, el título 20/700 con «Guardado» en 12 `muted` al lado o debajo, y la barra de formato. El cuerpo tiene que empezar antes de los 220 dp. La papelera va al «⋯» (ya está como «Borrar nota»). |
| P16-M2 | P2 | D7 | (sistémico: barra de formato del editor). La barra de formato es la única banda a sangre de la pantalla: blanca `#ffffff` de borde a borde y 48 dp de alto, mientras todo lo demás respeta el margen. Mezcla letras de Montserrat («B», «I», «S», «H», «1.») con glifos (•, ☑, «”» de 14 dp), con pesos y tamaños ópticos distintos. | Montarla como una barra con radio 6 y relleno `#f1f3f6`, dentro del margen. Usar ocho Material Symbols de 20 dp en `muted` (format_bold, format_italic, strikethrough_s, title, format_list_bulleted, format_list_numbered, checklist, format_quote), con el activo en `brand`. |
| P16-M3 | P2 | D8 | (sistémico: margen de página de 12 dp). Las migas y el título arrancan a 12 dp del borde, el cuerpo del editor a 16 dp y «Guardado» a ~16 dp, así que hay tres líneas de inicio en la misma columna. | Llevar todo a la misma línea de 16 dp, que es la que fija DESIGN.md. |
| P16-M4 | P3 | D5 | El estado de guardado se dice dos veces: un ✓ gris deshabilitado a la derecha y el texto «Guardado» a la izquierda, 33 dp más abajo y sin relación visual entre los dos. | Un solo indicador: «Guardado» en 12 `muted` con un ✓ de 14 dp delante, junto al título. El botón ✓ aparece solo cuando hay cambios y entonces va como botón tonal «Guardar». |

**Oscuro:** sin hallazgos propios. La barra queda en `#1c1c1c` a sangre sobre `#0c0c0c` y repite P16-M2.

**Brief de boceto:**
- Juntar en un renglón las migas «Mis notas / Notas de producción» y, a la derecha, el ✓ y el «⋯». Quitar la papelera.
- Debajo, «Notas de producción» en 20/700 con «✓ Guardado» en 12 gris en la línea siguiente.
- Cambiar la barra blanca a sangre por una barra gris clara con radio 6 dentro del margen de 16 dp, con ocho íconos de línea de 20 dp gris (negrita, cursiva, tachado, título, viñetas, numerada, checklist, cita).
- Alinear el texto del cuerpo exactamente con el título, a 16 dp.

### P17 Documento del proyecto

Captura: `despues/P17-documento-proyecto-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P17-M1 | P1 | D9 | (sistémico: encabezado de subpantalla de proyecto). El título es «Documentos», genérico, con el tile de una pantalla raíz. El nombre del proyecto («Cartelería del local») no aparece en ninguna parte, así que no se sabe qué documento es. Pasa lo mismo en P18 «Archivos» y en P19 «Actividad» y «Acceso cliente». | Sacar el tile. Arriba van las migas de 12/500 `muted` «Cartelería del local / Documento» y el título 20/700 «Documento». Mismo patrón en Archivos, Actividad y Acceso cliente. |
| P17-M2 | P2 | D8 | «Guardado» queda apretado entre la regla del encabezado (~179 dp) y la barra de formato (~198 dp), con ~4 dp de aire abajo y ~9 arriba. Parece el pie del encabezado y no el estado del documento. | Llevar «Guardado» al renglón del título, a la izquierda del ✓, en 12 `muted`, y quitar la regla: la barra de formato ya separa. |
| P17-M3 | P2 | D7 | (sistémico: barra de formato del editor, ver P16-M2). Misma banda blanca a sangre, con letras y glifos mezclados. | Ver P16-M2. |

**Oscuro:** sin hallazgos propios (repite P16-M2 con `#1c1c1c` a sangre).

**Brief de boceto:**
- Reemplazar el tile y «Documentos» por las migas «Cartelería del local / Documento» en 12 gris y debajo «Documento» en 20/700, con «Guardado ✓» en 12 gris y «⋯» a la derecha en el mismo renglón.
- Quitar la regla bajo el título.
- Poner la barra de formato como un bloque gris claro con radio 6 dentro del margen, con íconos de línea de 20 dp.

### P18 Archivos del proyecto

Captura: `despues/P18-archivos-proyecto-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P18-M1 | P2 | D9 | (sistémico: encabezado de subpantalla de proyecto, ver P17-M1). «Archivos» con tile de carpeta y sin el nombre del proyecto. El ícono de carpeta se repite en el tile y en el estado vacío. | Ver P17-M1. |
| P18-M2 | P2 | D8 | El estado vacío está centrado en la pantalla: el ícono a ~425 dp, con ~245 dp vacíos entre el encabezado y el ícono. Queda flotando, lejos del contexto. | Anclar el vacío a 48 dp bajo el encabezado, dentro de una card con borde punteado `#d2d6de` y radio 8. Ícono de 32 dp, título 15/600, texto 13 `muted` en 3 líneas como máximo y botón. |
| P18-M3 | P3 | D6 | El botón de recarga de 24 dp `muted` arriba a la derecha es la única acción visible del encabezado mientras no hay carpeta, y compite con el botón principal «Habilitar carpeta». | Ocultar «Recargar» mientras la carpeta no está habilitada, o pasarlo a «⋯». |

**Oscuro:** «Habilitar carpeta» lleva texto oscuro `#0c0c0c` sobre `#5b7fff`, y en claro va texto blanco. Es correcto por contraste, pero conviene confirmar que todos los botones rellenos en oscuro usan el mismo texto (pasa igual en el «+» de P11, P13 y P15).

**Brief de boceto:**
- Cambiar el encabezado por las migas «Cartelería del local / Archivos» en 12 gris y el título «Archivos» en 20/700, sin tile ni botón de recarga.
- Subir el estado vacío para que quede a 48 dp del encabezado, dentro de una card con borde punteado gris y radio 8, con ícono de carpeta de 32 dp, «Carpeta no habilitada» en 15/600, el texto en 13 gris y el botón azul «Habilitar carpeta».

### P19 Actividad del proyecto

Captura: `despues/P19-actividad-proyecto-admin-light-390-android.png` (+ dark; también `P19-clientes-proyecto-…`)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P19-M1 | P2 | D7 | (sistémico: estados vacíos). El vacío de Actividad es un párrafo gris de 13 alineado a la izquierda, sin ícono ni título. En P18, la pantalla hermana, el vacío tiene ícono, título 15/600 y texto centrado. Hay dos lenguajes de vacío entre pestañas del mismo proyecto. S03 ya cubre los textos. | Usar el mismo bloque de vacío que en P18 (ícono de reloj de 32 dp, título «Sin actividad todavía» 15/600 y el texto actual en 13 `muted`), anclado a 48 dp del encabezado. |
| P19-M2 | P2 | D9 | (sistémico: encabezado de subpantalla de proyecto, ver P17-M1). «Actividad» y «Acceso cliente» no muestran el proyecto. Además, el encabezado de estas dos mide ~10 dp menos que el de P17 y P18 (la regla a ~169 dp contra ~179 dp), así que las cuatro pestañas del mismo proyecto saltan de alto. | Ver P17-M1, con un único alto de encabezado para las cuatro subpantallas. |
| P19-M3 | P3 | D7 | En Acceso cliente, la explicación ocupa 4 líneas de 13 `muted` (~85 dp), y debajo aparecen un enlace azul centrado «Clientes del grupo» y un botón relleno a todo el ancho «Agregar cliente». Hay dos acciones de peso parecido, una centrada y otra de borde a borde. | Reducir la explicación a dos líneas y poner «Clientes del grupo» como enlace en línea al final del texto. «Agregar cliente» va como botón tonal en el renglón del título de la lista («CLIENTES 1»). |

**Oscuro:** sin hallazgos propios. «Invitado» en `#262626` sobre la card `#1c1c1c` casi no se separa del fondo (ver el sistémico de superficies oscuras).

**Brief de boceto:**
- Cambiar el encabezado por las migas «Cartelería del local / Actividad» en 12 gris y «Actividad» en 20/700, sin tile.
- Reemplazar el párrafo gris suelto por un bloque de vacío a 48 dp del encabezado: ícono de reloj de 32 dp gris, «Sin actividad todavía» en 15/600 y el texto actual en 13 gris, centrado.
- En Acceso cliente, acortar la explicación a dos líneas con «Clientes del grupo» como enlace dentro del texto y mover «Agregar cliente» a un botón tonal a la derecha del rótulo «CLIENTES 1».

### P19 Clientes del proyecto (Acceso cliente)

Captura: `despues/P19-clientes-proyecto-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P19-M1 | P1 | D1 | Es una subpantalla del proyecto, pero la cabecera es la de una raíz: tile de ojo de 38 dp, título 24/700 "Acceso cliente" y regla, sin el nombre del proyecto. Debajo vienen 4 líneas de texto gris, un enlace centrado y un botón de ancho completo, y la única card empieza en y≈382 dp, a mitad de pantalla (sistémico: GenSectionHeader). | Cabecera de subpantalla: miga 12/500 gris con el nombre del proyecto y título 20/700 "Acceso cliente", sin tile. El texto explicativo baja a una línea 13/400 dentro de la card, y "Agregar cliente" pasa a ser la acción del título. La lista arranca antes de los 200 dp. |
| P19-M2 | P1 | D7 | El enlace "Clientes del grupo" aparece centrado, en azul 15/600, entre el párrafo y el botón primario. Rompe la alineación izquierda de 12 dp y compite con el CTA azul de 40 dp que tiene justo debajo: hay dos azules seguidos y ninguno manda. | Integrar "Clientes del grupo" al final del párrafo como enlace en línea, o mostrarlo como fila "Clientes del grupo ›" al pie de la card, alineada a la izquierda. |
| P19-M3 | P2 | D8 | La card de cliente mide 92 dp para una fila de dos líneas: tiene 12 dp de padding y encima el `minVerticalPadding` del ListTile. El nombre va 15/600 en minúsculas ("cliente de prueba") y no tiene avatar, mientras que P23 sí lo muestra para el usuario (sistémico: ListTile en WorkspacePanel). | Fila de 56 dp con avatar de iniciales de 32 dp, nombre 15/600, correo 13/400 gris y el chip "Invitado" a la derecha. Varias filas comparten una card y se separan con divisores de 1 px. |
| P19-M4 | P3 | D6 | El chip "Invitado" (gris, 4 de radio, 13/500) y la papelera de 24 dp en gris oscuro tienen el mismo peso. La papelera, una acción destructiva, queda siempre a la vista. El tamaño del área táctil corresponde a S21. | Dejar el chip de estado como único indicador y mover "Quitar acceso" a un menú "⋯" de 20 dp en gris neutro. |

**Oscuro:** el CTA `#5b7fff` lleva texto casi negro y en claro lleva blanco. La inversión es correcta por contraste, pero el botón pesa más que la card `#1c1c1c`, que apenas se separa de la página `#0c0c0c` (ver sistémico D10).

**Brief de boceto:**
- Quitar el tile del ojo y poner encima del título una miga gris de 12 px "Cartelería del local ›". Bajar el título "Acceso cliente" a 20/700.
- Mover "Agregar cliente" a un botón compacto relleno de 36 px de alto, alineado a la derecha del título, con ícono de persona +.
- Reducir el párrafo a dos líneas de 13 px y terminarlo con el enlace en línea "Clientes del grupo". Eliminar el enlace centrado.
- Convertir la card del cliente en una fila de 56 px con avatar circular "C" de 32 px a la izquierda, chip "Invitado" y un "⋯" gris a la derecha, sin papelera.

### P20 Materiales

Captura: `despues/P20-materiales-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P20-M1 | P1 | D1 | La cabecera ocupa de y≈100 a y≈208 dp con tile de 38 dp, título 24/700, subtítulo de dos líneas 15/400 y regla. El tile está centrado verticalmente en el bloque título+subtítulo, así que queda ~20 dp por debajo de la línea del título (sistémico: GenSectionHeader). | Título 20/700 sin tile en la raíz y subtítulo de una línea 13/400 ("Totales de proyectos activos"). Si el tile se conserva en otras pantallas, alinearlo arriba, con el título. |
| P20-M2 | P2 | D7 | Con la lista vacía se sigue mostrando un buscador de 47 dp ("Filtrar por material o código") que no filtra nada, y el estado vacío flota a y≈400 dp con un ícono de archivo de 40 dp en gris `#5a5a6e`. Hay tres elementos sin información. | Ocultar el buscador mientras no haya materiales. Subir el estado vacío a 48 dp de la cabecera y meterlo en una card de radio 8 con ícono de 32 dp en `brandFill`, título 15/600 y cuerpo 13/400. |
| P20-M3 | P2 | D1 | El ícono del tile (caja de archivo) se repite idéntico y más grande en el estado vacío, a 300 dp del primero. Hay dos cajas y ningún dato. | Usar en el vacío un ícono distinto que represente "sin cargas" (inventario con signo +) o no repetir el ícono. |
| P20-M4 | P3 | D2 | El título del vacío va 18/700 y el cuerpo 15/400 centrados: la pantalla suma un quinto y un sexto tamaño (24, 18, 15, 14 placeholder) (sistémico: EmptyView). | Vacío con 15/600 de título y 13/400 de cuerpo, igual en todas las pantallas. |

**Oscuro:** el ícono del vacío pasa a gris `#8a8a8a` sin acento y queda más apagado que el tile azul de la cabecera. Sin otros hallazgos propios.

**Brief de boceto:**
- Quitar el tile azul y bajar "Materiales" a 20 px bold. Poner el subtítulo en una línea de 13 px.
- Borrar el campo "Filtrar por material o código".
- Colocar el estado vacío en una card blanca con borde fino, a 24 px de la regla: ícono de 32 px sobre un cuadrado azul muy claro, "No hay materiales cargados" a 15 px semibold y la explicación a 13 px gris.

### P21 Recordatorios

Captura: `despues/P21-recordatorios-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P21-M1 | P1 | D3 | La grilla mensual mide ~350 dp: 5 filas de 64 dp con todas las líneas en el borde estructural `#d2d6de`. Junto con la card de mes de 72 dp, empuja el único recordatorio a y≈725 dp, al borde inferior. La fila 26 tiene el día en un cuadrado azul de 24 dp y un punto verde `#22c55e` de 4 dp. | Celdas de 44 dp sin líneas internas: números 13/500 y el día de hoy en un círculo azul de 28 dp. La grilla queda en ~240 dp y la lista del día seleccionado entra en la primera pantalla. |
| P21-M2 | P1 | D5 | El verde `#22c55e` marca "recordatorio individual" en el punto y en el ícono de calendario de la fila "Revisar entregas", aunque en el resto de la app el verde significa "completado". Tampoco hay leyenda visible en Android: la web la tiene debajo de la grilla. | El ícono del recordatorio va en gris neutro de 20 dp y el alcance se muestra como chip de texto ("Individual", "Grupo", "Global") con su color de etiqueta. El punto del día va en el azul de marca. |
| P21-M3 | P2 | D8 | Hay tres bordes izquierdos distintos: la cabecera y la regla en x=12 dp, el segmentado y las cards en x=16 dp, y la card del recordatorio pegada a la grilla sin separación (0 dp, contra 12 dp entre la card de mes y la grilla) (sistémico: márgenes de página). | Todo arranca en x=16 dp. Separar con 12 dp grilla y lista. Unir mes y grilla en una sola card: cabecera "Octubre 2026 ‹ Ir a hoy ›" con un divisor de 1 px. |
| P21-M4 | P2 | D1 | El botón "+" es un cuadrado azul relleno de 40 dp centrado en el bloque título+subtítulo de dos líneas. Queda ~25 dp por debajo de la línea del título y es más pesado que el propio título (sistémico: GenSectionHeader). | Botón compacto de 36 dp "+ Nuevo" (relleno, radio 6) alineado arriba con el título 20/700 y subtítulo de una línea. |
| P21-M5 | P3 | D5 | El segmentado "Próximos / Calendario" marca la opción activa con un check que reemplaza al ícono y un fondo `#eef1ff` muy claro. La inactiva conserva su ícono de lista, así que cada lado tiene un ícono distinto. | Quitar el check, dejar ícono de lista y de calendario en las dos opciones y mostrar la activa con fondo de acento al 12 % y texto 13/600 de acento. |

**Oscuro:** la celda de hoy en `#5b7fff` con número negro y el punto `#22c55e` saturado vibran sobre la card `#1c1c1c`. Ajustar el verde (D10) o reemplazarlo como dice M2.

**Brief de boceto:**
- Unir la card "Octubre 2026" y la grilla en una sola card con un divisor fino debajo de la cabecera del mes.
- Quitar las líneas internas de la grilla y bajar cada celda a 44 px de alto. Poner el 26 en un círculo azul de 28 px con número blanco.
- Reemplazar el ícono verde de calendario de "Revisar entregas" por uno gris y agregar a la derecha un chip rectangular "Individual".
- Cambiar el "+" cuadrado por un botón "+ Nuevo" de 36 px alineado con la línea de "Recordatorios", y poner el subtítulo en una línea.
- Alinear el segmentado, la card y la regla de la cabecera al mismo borde izquierdo de 16 px.

### P22 Vence hoy / notificaciones

Captura: `despues/P22-vence-hoy-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P22-M1 | P1 | D1 | Hay dos cabeceras apiladas: tile con campana + "Vence hoy" 24/700 + regla, y debajo otra campana de 20 dp + "Avisos pendientes" 18/600 + subtítulo "Avisos que necesitan tu atención." Las dos campanas y los dos títulos dicen lo mismo con palabras distintas en 120 dp. | Dejar una sola cabecera: "Vence hoy" 20/700 sin tile, con el contador al lado ("Vence hoy · 0"). Eliminar el bloque "Avisos pendientes". |
| P22-M2 | P2 | D7 | El vacío "Estás al día" es una card de 92 dp con texto alineado a la izquierda, sin ícono, y los mismos 15/600 + 15/400 que una fila de datos. No se parece al vacío centrado con ícono de P20 (sistémico: EmptyView). | Vacío con el patrón único de M4 de P20: ícono check de 32 dp en `brandFill`, "Estás al día" 15/600 y "No tenés avisos pendientes." 13/400 gris. |
| P22-M3 | P3 | D8 | La card arranca en x=16 dp, mientras la regla y la campana de sección arrancan en x=12 y x=18 dp. Ningún borde coincide (sistémico: márgenes de página). | Alinear todo a x=16 dp. |

**Oscuro:** sin hallazgos propios. La card `#1c1c1c` sobre `#0c0c0c` cumple, pero queda fuera de la escala D10 (ver sistémico).

**Brief de boceto:**
- Quitar el tile y el bloque "Avisos pendientes" con su campana. Dejar solo "Vence hoy" a 20 px bold con un contador gris "0" a la derecha del título.
- Centrar dentro de la card un ícono de check de 32 px sobre un cuadrado azul muy claro, con "Estás al día" a 15 px semibold y la línea secundaria a 13 px gris.
- Alinear la card al mismo borde izquierdo que el título.

### P23 Cuenta

Captura: `despues/P23-cuenta-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P23-M1 | P1 | D8 | Cada fila de la card de perfil mide ~94 dp: avatar, Servidor, Servidores y genwork. Las cuatro filas ocupan 376 dp y la segunda card ("Cuenta de almacenamiento", 110 dp) queda cortada abajo. Es padding de panel de 12 dp sumado al `minVerticalPadding` del ListTile (sistémico: ListTile en WorkspacePanel). | Filas de 56 dp (64 con dos líneas) con divisores de 1 px. La fila de perfil puede quedar en 72 dp. Todo el contenido entra en una pantalla. |
| P23-M2 | P1 | D1 | El tile es un engranaje azul y el subtítulo dice "Almacenamiento vinculado, versión y estado del sistema", pero la pantalla muestra perfil, servidores y versión. Además "Mi cuenta" figura dos veces seguidas: pestaña activa y título 24/700 (sistémico: GenSectionHeader + pestañas de ajustes). | Sin tile ni título repetido bajo la pestaña. Si hace falta título, "Mi cuenta" 20/700 sin subtítulo. Si queda tile, usar el ícono de persona. |
| P23-M3 | P2 | D8 | Las columnas de texto no comparten línea de inicio: el nombre arranca en x≈92 dp (después del avatar de 48 dp), "Servidor/Servidores/genwork" en x≈68 dp y la segunda card en x≈28 dp, sin ícono. | Ícono o avatar en una columna fija de 40 dp y texto siempre en x=72 dp. Ponerle ícono a "Cuenta de almacenamiento" (nube) y a "Sistema" (info), o sacárselo a todos. |
| P23-M4 | P2 | D2 | La versión aparece dos veces: la fila "genwork / Versión 1.0.0 (1)" y "Sistema / Versión, entorno y estado de la nube". La URL del servidor va en Roboto Mono 14 gris y su título en 15/600, con la misma jerarquía que el nombre del usuario. | Fusionar en una sola fila "Sistema · v1.0.0 ›". Mono 12 solo para la URL, como valor secundario. |

**Oscuro:** el avatar `#5b7fff` lleva la "A" en negro y en claro la lleva en blanco. Fijar texto blanco o `#0c0c0c` según el contraste, pero que sea igual en los dos temas para que no parezca otro componente.

**Brief de boceto:**
- Bajar cada fila de la card de perfil de ~94 px a 56 px. La fila de perfil queda en 72 px con avatar de 40 px.
- Alinear "admin de prueba", "Servidor", "Servidores" y "genwork" al mismo borde de texto, con los íconos en una columna de 40 px.
- Quitar el tile del engranaje y el título "Mi cuenta" bajo la pestaña. El contenido arranca 16 px debajo de las pestañas.
- Unir "genwork Versión 1.0.0 (1)" y "Sistema" en una sola fila "Sistema · v1.0.0" con chevron.

### P24a Vincular con Claude

Captura: `despues/P24a-claude-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P24a-M1 | P1 | D7 | El campo de URL (44 dp, Roboto Mono 14) y el botón "Copiar" de contorno (40×92 dp) van en renglones separados, y "Copiar" queda solo a la derecha con 50 dp de aire. La card "Dirección del servidor" llega a 236 dp por una URL (sistémico: campo de copia). | Botón de ícono "copiar" de 20 dp dentro del campo, a la derecha (`suffixIcon`). La card baja a ~150 dp. |
| P24a-M2 | P2 | D7 | En "Tus tokens" el orden es explicación gris, botón primario "Generar token" (40 dp, ancho 144 dp) y recién después el vacío "Todavía no tenés tokens…" en cuerpo negro 15/400. El vacío queda debajo de la acción y pesa más que la explicación. | Rótulo 11/700 "TUS TOKENS", vacío en gris 13/400 y el botón "Generar token" alineado a la derecha al pie del grupo, como pide D7. |
| P24a-M3 | P2 | D1 | El título "Vincular con Claude" 24/700 repite la pestaña activa que está 40 dp más arriba, y usa el mismo tile de engranaje que Mi cuenta, Configuración, Acceso y Usuarios (sistémico: GenSectionHeader + pestañas de ajustes). | Quitar título y tile bajo las pestañas. La primera card arranca a 16 dp de la barra de pestañas. |
| P24a-M4 | P3 | D2 | Los títulos de card ("Dirección del servidor", "Tus tokens", "Conectar en claude.ai") van 18/600 y el cuerpo 15/400 gris: más grandes que la escala D2 (15/600 · 13/400). Las tres cards terminan midiendo 236, 236 y más de 250 dp. | Títulos de card 15/600 y cuerpo 13/400. Los pasos de "Conectar en claude.ai" en lista numerada con números mono 12 en un círculo de 20 dp. |

**Oscuro:** el campo de URL es `#151515` dentro de una card `#1c1c1c`, más oscuro que su contenedor y al revés que D10. El botón "Copiar" tiene borde `#272727` sobre `#1c1c1c` y casi no se ve.

**Brief de boceto:**
- Meter el ícono de copiar dentro del campo "http://localhost:3010/api/mcp", a la derecha, y borrar el botón "Copiar" de abajo.
- Quitar el tile del engranaje y el título "Vincular con Claude". La primera card arranca justo debajo de las pestañas.
- En "Tus tokens", poner "Todavía no tenés tokens…" en gris 13 px antes del botón y alinear "Generar token" a la derecha de la card.
- Bajar los títulos de card a 15 px semibold y el cuerpo a 13 px.

### P24b App móvil

Captura: `despues/P24b-app-movil-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P24b-M1 | P1 | D5 | El aviso de que la dirección es local y el teléfono no podrá alcanzarla (3 líneas, y≈280–330 dp) es lo más importante de la pantalla, pero va en el mismo gris 15/400 que el texto de ayuda. No tiene color, ícono ni contenedor. | Aviso en línea con fondo ámbar suave, borde izquierdo de 3 dp ámbar, ícono de alerta de 20 dp y texto 13/500. Usar `app_inline_notice.dart`. |
| P24b-M2 | P2 | D7 | Es el mismo patrón "dirección + Copiar" de P24a, pero acá va suelto sobre la página, sin card, con un rótulo 15/400 gris "Dirección de este sistema" que no sigue el 11/700. Los pasos 1–3 van como párrafo gris corrido (sistémico: campo de copia). | Una card con rótulo 11/700 "DIRECCIÓN DE ESTE SISTEMA", campo con ícono de copiar adentro, divisor y los pasos como lista numerada con círculos de 20 dp. |
| P24b-M3 | P2 | D1 | El subtítulo dice "Escaneá este código…", pero no hay ningún código en pantalla (el QR falta: P24b-01, ver S19). Tile de engranaje y título repetido con la pestaña (sistémico: GenSectionHeader). | Mientras no haya QR, subtítulo "Conectá la app de Genwork a este sistema." y sin tile. Con QR, el código va arriba en una card de 200 dp. |

**Oscuro:** el campo `#151515` sobre la página `#0c0c0c` funciona, pero en P24a el mismo campo dentro de una card queda más oscuro que ella. El mismo componente cambia de escalón según dónde se use.

**Brief de boceto:**
- Convertir el párrafo "La dirección configurada (http://localhost:3010) es local…" en un aviso ámbar suave con ícono de advertencia a la izquierda y borde izquierdo ámbar de 3 px.
- Agrupar el rótulo, el campo y los pasos en una card blanca. Rótulo en mayúsculas de 11 px "DIRECCIÓN DE ESTE SISTEMA" y botón de copiar como ícono dentro del campo.
- Pasar los pasos 1–3 a lista con números en círculos grises de 20 px, separada del campo por un divisor fino.
- Quitar el tile del engranaje.

### P25 Administración (Configuración)

Captura: `despues/P25-administracion-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P25-M1 | P1 | D8 | Cada módulo (Mi cuenta, Control de acceso, Almacenamiento, Usuarios y roles…) es una card propia de ~92 dp con 12 dp de separación. Solo entran 4 módulos y medio en pantalla de una lista de más de 12 (sistémico: ListTile en WorkspacePanel). | Una card por grupo ("Cuenta", "Equipo", "Sistema") con rótulo 11/700 y filas de 56 dp separadas por divisores de 1 px. Entran ~9 filas por pantalla. |
| P25-M2 | P1 | D6 | Los íconos de los módulos van en negro de texto `#111118` a 24 dp, y en oscuro en blanco, con el mismo peso que los títulos 15/700. "Notificaciones" lleva chevron y los módulos de abajo, que también navegan, no. | Íconos de 20 dp en gris `muted` y chevron en todas las filas que navegan. Los títulos bajan a 15/600. |
| P25-M3 | P2 | D5 | El selector "Apariencia" son tres íconos sueltos (laptop, sol, luna) y el activo solo cambia a azul, sin fondo ni marco. Se lee como ícono de color, no como opción elegida. La etiqueta "Tema: Sistema" repite lo que debería decir el control. Los nombres de los íconos son tema de S18. | Segmentado de 3 opciones de 32 dp con borde `outline`. La activa lleva fondo de acento al 12 % e ícono de acento. Quitar "Tema: Sistema". |
| P25-M4 | P2 | D9 | La pestaña activa se llama "Resumen" y el título "Configuración". Además la barra abre desplazada, con "…ta" cortado a la izquierda. El orden de las pestañas mezcla lo personal (Mi cuenta, Claude, App móvil) con la administración (Resumen, Acceso, Usuarios) (sistémico: pestañas de ajustes). | Pestaña y título con el mismo nombre ("Configuración"). Separar "Cuenta" y "Administración" en dos barras o en dos secciones de la lista. Primera pestaña siempre completa. |

**Oscuro:** los íconos blancos a 24 dp sobre `#1c1c1c` pesan más que en claro. Con el gris `muted` del M2 se resuelve.

**Brief de boceto:**
- Agrupar "Mi cuenta", "Control de acceso", "Almacenamiento (mini nube)" y "Usuarios y roles" en una sola card blanca con divisores finos entre filas de 56 px, bajo un rótulo gris en mayúsculas de 11 px "ADMINISTRACIÓN".
- Poner los íconos de fila en gris medio de 20 px y agregar un chevron gris a la derecha de cada fila.
- Reemplazar los tres íconos de Apariencia por un segmentado de 3 celdas con borde fino y la celda "Sistema" con fondo azul muy claro.
- Cortar cada descripción a una línea de 13 px gris con elipsis.

### P26 Acceso

Captura: `despues/P26-acceso-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P26a-M1 | P1 | D7 | El valor actual ("Lista de correos permitidos") va como subtítulo 15/400, con el mismo peso que la descripción "Agregar o quitar acceso por correo" de la fila de abajo. Un botón de contorno de ancho completo "Editar acceso" (40×334 dp) parte la card en dos sin divisor (sistémico: botón de contorno ancho completo). | Fila "Modo de acceso" con el valor como chip rectangular ("Lista de correos") y un botón de texto "Editar" a la derecha. Divisor de 1 px y fila "Correos permitidos ›" de 56 dp. |
| P26a-M2 | P2 | D1 | La pestaña dice "Acceso" y el título 24/700 "Control de acceso", con tile de engranaje (sistémico: GenSectionHeader + pestañas de ajustes). | Sin título bajo la pestaña, o pestaña y título con el mismo nombre. Sin tile. |
| P26a-M3 | P3 | D8 | La card mide 200 dp para dos datos y deja 70 % de la pantalla vacía. Su padding interno (28 dp desde el borde al texto) no coincide con el de P25 (24 dp). | Padding de card de 16 dp en todas las pantallas de ajustes. Alto resultante: ~112 dp. |

**Oscuro:** el botón "Editar acceso" tiene borde `#272727` sobre la card `#1c1c1c`: el contorno desaparece y queda texto flotando con un lápiz.

**Brief de boceto:**
- Convertir "Modo de acceso" en una fila con un chip gris rectangular "Lista de correos" y un enlace azul "Editar" a la derecha. Eliminar el botón ancho "Editar acceso".
- Poner un divisor fino entre "Modo de acceso" y "Correos permitidos ›".
- Quitar el tile del engranaje y el título "Control de acceso". La card arranca 16 px debajo de las pestañas.

### P26 Usuarios

Captura: `despues/P26-usuarios-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P26u-M1 | P1 | D6 | Cada usuario editable lleva botones de contorno de ancho completo de 40 dp: "Cambiar rol" y, en el lector, "Grupos con permiso de lectura", los dos con el mismo lápiz. La card del lector mide 196 dp y la del miembro 140 dp. Tres usuarios llenan la pantalla (sistémico: botón de contorno ancho completo). | Fila de 56 dp por usuario con un menú "⋯" de 20 dp gris que abre "Cambiar rol" y "Grupos con permiso de lectura". Todos en una sola card con divisores. |
| P26u-M2 | P1 | D4 | El rol va pegado al correo como texto ("lector@test.local · Lector"), con el mismo gris y tamaño. En una pantalla que se llama "Usuarios y roles", el rol no se distingue. | Rol como chip rectangular a la derecha ("Admin", "Lector", "Miembro") con su color de estado, y el correo solo en 13/400 gris. |
| P26u-M3 | P2 | D4 | No hay avatar, aunque P23 y P19 representan personas con avatar de iniciales. Los nombres van en minúsculas 15/600 ("admin de prueba") sin ancla visual. Las cards no tienen el mismo alto (84/196/140 dp) y la lista no tiene ritmo. | Avatar de iniciales de 32 dp en la columna izquierda en toda fila de persona. Mismo alto de fila para todos. |
| P26u-M4 | P3 | D2 | La nota "El rol Lector es para pantallas…" va 15/400 gris en 3 líneas (60 dp) sobre la lista, alineada a x=16 dp, mientras la regla está en x=12 dp. | Nota de 13/400 al pie de la card o como ayuda del chip "Lector". Alineada a 16 dp. |

**Oscuro:** los dos botones de contorno con borde `#272727` sobre `#1c1c1c` se pierden. Quedan dos lápices y dos textos sin forma de botón.

**Brief de boceto:**
- Agrupar los tres usuarios en una sola card blanca con filas de 56 px separadas por divisores finos.
- Poner en cada fila un avatar circular de iniciales de 32 px, el nombre a 15 px semibold y el correo debajo a 13 px gris.
- Mostrar el rol a la derecha como chip rectangular: "Admin" azul claro, "Lector" gris, "Miembro" gris. Al lado, un "⋯" gris de 20 px.
- Eliminar los botones anchos "Cambiar rol" y "Grupos con permiso de lectura".

### P27 Clientes

Captura: `despues/P27-clientes-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P27-M1 | P1 | D1 | (sistémico: GenSectionHeader en Configuración) Debajo de la tira de pestañas viene el tile de 38 dp con un engranaje, el título de 24/700 y una regla. El contenido empieza a unos 245 dp. Además, el engranaje es el mismo en Clientes, Etiquetas, Producción, Estados, Almacenamiento, Recordatorios y Errores, así que no aporta nada. | En las subpáginas de Configuración: sin tile ni regla. El título va en 20/700, 16 dp por debajo de las pestañas, y el contenido arranca antes de los 180 dp. |
| P27-M2 | P1 | D9 | (sistémico: SettingsTabs/GenTabBar) Son 14 pestañas en una sola tira. La primera visible aparece cortada en x = 0 ("óvil") y la activa, "Clientes", queda pegada al borde derecho sin margen ni pista de que hay más. | Llevar la pestaña activa al centro con padding de 16 dp en los extremos y un degradado de 24 dp en el borde que tiene más contenido. Rótulos en 13/600 y la activa con su lengüeta de 3 dp. |
| P27-M3 | P1 | D4 | En la card del cliente, el correo, "Todavía no ingresó" y "· Cartelería del local" van los tres en 13/400 negro y apilados sin separación. Los proyectos asignados son viñetas de texto, sin rótulo. | Primera fila: nombre en 15/600 y, a la derecha, un chip neutro "Sin ingresar" (radio 4). Debajo, el correo en 13 gris. Después, un divisor de 1 px, el rótulo "PROYECTOS" en 11/700 y cada proyecto en una fila de 13/400 con ícono de carpeta de 16. |
| P27-M4 | P2 | D6 | "Dar de baja" es un botón contorneado rojo a todo el ancho (40 dp) en cada card. Lo más visible de cada cliente es la acción destructiva, y con N clientes la lista se convierte en una pila de franjas rojas. | Un menú "⋯" de 20 dp gris arriba a la derecha de la card, con "Dar de baja" en rojo dentro. |
| P27-M5 | P2 | D1 | "Agregar cliente", la acción principal de la página, es un botón contorneado igual al de cada card y está debajo de una descripción de 4 líneas. | Botón relleno "Agregar cliente" (40 dp, ícono `person_add`) alineado a la derecha del título. La descripción baja a 2 líneas de 13 gris. |

**Oscuro:** "Dar de baja" en `#f87171` (borde y texto) sobre la card `#1c1c1c` se lee rosa salmón y es lo más brillante de la pantalla. Se resuelve con P27-M4.

**Brief de boceto:**
- Quitar el tile azul con el engranaje y la regla gris; dejar "Clientes" en 20/700 justo debajo de las pestañas, con un botón azul relleno "Agregar cliente" a su derecha.
- Desplazar la tira de pestañas para que "Clientes" quede centrada con margen a los dos lados y un degradado suave en el borde izquierdo.
- En la card del cliente: "cliente de prueba" en 15/600 con un chip gris rectangular "Sin ingresar" a la derecha, y debajo el correo en gris de 13.
- Debajo de un divisor de 1 px, el rótulo "PROYECTOS" en 11/700 y la fila "Cartelería del local" con un ícono de carpeta.
- Sacar el botón rojo "Dar de baja" y poner un ícono "⋯" gris en la esquina superior derecha de la card.

### P28 Etapas (Producción)

Captura: `despues/P28-etapas-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P28E-M1 | P1 | D7 | (sistémico: rótulos de campo en Configuración) "Ámbito" va arriba del campo en 13/500, gris y en minúsculas. En P32, "Estado" es un label flotante sobre el borde; en P31b, "URL del server" va en 13 gris. Son tres recetas de campo distintas en pestañas vecinas. | Una sola receta: rótulo "ÁMBITO" en 11/700, mayúsculas, tracking 0,06 em y 6 dp sobre el campo. Campo con relleno `#f1f3f6`, radio 6 y sin label flotante. |
| P28E-M2 | P1 | D8 | El dropdown (47 dp) y el botón "Agregar" azul a todo el ancho (40 dp, 366 dp de largo) están separados por unos 4 dp. Se leen como un único bloque de formulario, y el botón relleno es lo más pesado de una pantalla vacía. | Una sola fila con el dropdown flexible y el botón "Agregar" compacto (relleno, 40 dp, ícono + texto) a la derecha, con 8 dp entre los dos. |
| P28E-M3 | P2 | D1 | La pestaña dice "Producción" y el título, "Estados de producción", y el inventario la llama "Etapas": son tres nombres para el mismo destino. El título de 24/700 ocupa unos 335 dp, todo el ancho. | El mismo nombre en la pestaña y en el título (p. ej. "Etapas de producción"), con el título en 20/700. |
| P28E-M4 | P2 | D8 | (sistémico: estado vacío de Configuración) "No hay elementos en este ámbito." es texto suelto en 13/400 negro, con una sangría de 36 dp (x ≈ 86 px) cuando todo lo demás arranca a 12 dp. No tiene contenedor ni ícono. Los textos son del terreno de S03. | Card de estado vacío con borde discontinuo de 1 px y radio 8, alineada a la línea de inicio, con un ícono de 24 dp gris centrado y el texto en 13 gris. |
| P28E-M5 | P2 | D6 | (código) Cuando hay datos, cada etapa es una card con ListTile y debajo una fila de 4 IconButton de 48 dp: editar, eliminar, subir y bajar, todos con el mismo peso. | Fila de 56 dp con punto de color de 10, nombre en 13/600 y "Etapa 1" en 11 gris; a la derecha, un asa de arrastre y un "⋯" con editar y eliminar. |

**Oscuro:** sin hallazgos propios. El texto `#0c0c0c` sobre `#5b7fff` del botón primario es correcto: blanco sobre ese azul no llega a 4,5:1.

**Brief de boceto:**
- Quitar el tile del engranaje y la regla; título "Etapas de producción" en 20/700, en una línea.
- Cambiar "Ámbito" por el rótulo "ÁMBITO" en 11/700 mayúsculas y poner el dropdown y un botón azul compacto "+ Agregar" en la misma fila.
- Cambiar el texto suelto "No hay elementos en este ámbito." por una card de borde punteado alineada al margen, con un ícono gris de lista y el texto centrado en gris.
- Hacer que la pestaña "Producción" diga lo mismo que el título.

### P28 Etiquetas

Captura: `despues/P28-etiquetas-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P28L-M1 | P1 | D9 | (sistémico: SettingsTabs; ver P27-M2) La primera pestaña aparece cortada ("men") y "Etiquetas" queda pegada al borde derecho. | Ver P27-M2. |
| P28L-M2 | P1 | D7 | (sistémico: catalog_settings_screen; ver P28E-M1/M2) Tiene el mismo esqueleto que Etapas: rótulo 13 gris, dropdown y botón azul a todo el ancho pegados. | Ver P28E-M1 y M2. |
| P28L-M3 | P2 | D5 | (código) Con datos, la etiqueta lleva un ícono genérico `label` gris y sus valores van como ListTiles de 48 dp, con un tacho cada uno y un TextButton "Agregar valor". El color de cada valor queda reducido a un punto. | Nombre de la etiqueta en 15/600 como encabezado de la card y sus valores como chips rectangulares (radio 4) con su color: relleno al 12 % y texto en el color pleno. Al final, un chip de borde discontinuo "+ valor". Se edita tocando el chip. |
| P28L-M4 | P3 | D8 | De las tres pantallas de catálogo, Estados lleva una descripción de 3 líneas y Etiquetas y Producción no llevan ninguna. El campo arranca a 262 dp en estas dos y a 336 dp en Estados, así que el ritmo salta al cambiar de pestaña. | Subtítulo de una línea en 13 gris dentro del encabezado en las tres (p. ej. "Clasifican proyectos y tareas."), para que el campo empiece a la misma altura. |

**Oscuro:** sin hallazgos propios.

**Brief de boceto:**
- Centrar la pestaña "Etiquetas" en la tira, con la pestaña de la izquierda completa y no cortada.
- Título "Etiquetas" en 20/700 sin tile, con el subtítulo gris de una línea "Clasifican proyectos y tareas."
- Rótulo "ÁMBITO" en 11/700 y una fila con el dropdown "Personal" y un botón compacto "+ Agregar".
- Debajo, una card de ejemplo "Prioridad" con los chips rectangulares de color "Alta" (rojo), "Media" (ámbar) y "Baja" (gris), y un chip punteado "+ valor".
- Quitar el texto "No hay elementos en este ámbito.": este boceto muestra el estado con datos, así que solo aparece la card de ejemplo "Prioridad".

### P29 Estados de tarea

Captura: `despues/P29-estados-tarea-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P29-M1 | P1 | D1 | Entre la regla y el campo hay una descripción de 3 líneas (245–290 dp) en 13 gris, con comillas tipográficas sobre “en curso” y “final”. Empuja el dropdown a 336 dp y "Agregar" a 388 dp. | Usar como explicación la estructura de la lista: dos secciones con rótulo "EN CURSO" y "FINAL · 1" en 11/700. En el encabezado queda un subtítulo de una línea. |
| P29-M2 | P1 | D5 | (código) El tipo de estado solo aparece como subtítulo de texto ("Final" / "En curso") debajo del nombre, con un punto de color. El estado final, que es único y define el progreso, no se distingue a la vista. | Filas de 56 dp agrupadas por tipo; el final lleva un ícono `check_circle` de 20 dp gris a la derecha y su sección dice "FINAL · exactamente uno". |
| P29-M3 | P2 | D8 | (sistémico: margen de página) La descripción arranca en x = 12 dp, mientras que en P27 la misma descripción de Configuración arranca a 16 dp. Dentro de la misma sección, la línea de inicio cambia entre 12 y 16. | Margen lateral único de 16 dp para el texto, los campos y las cards en todas las pestañas. |
| P29-M4 | P2 | D7 | (sistémico; ver P28E-M1, M2 y M4) Mismo rótulo "Ámbito", el mismo bloque dropdown + botón, y el mismo vacío en texto suelto. La captura muestra el ámbito Personal vacío, aunque el inventario espera Pendiente/Terminado: conviene recapturar en Global. | Ver P28E. |

**Oscuro:** sin hallazgos propios.

**Brief de boceto:**
- Reemplazar el párrafo gris de 3 líneas por un subtítulo de una línea bajo el título: "Un estado final por ámbito; los sectores pueden tener el suyo."
- Rótulo "ÁMBITO" en 11/700 y una fila con el dropdown y un botón compacto "+ Agregar".
- Mostrar la lista con datos en dos secciones: "EN CURSO" con la fila "Pendiente" (punto azul) y "FINAL · 1" con la fila "Terminado" (punto verde e ícono de tilde gris a la derecha), separadas por un divisor de 1 px.
- Alinear todo a 16 dp del borde izquierdo.

### P30 Recordatorios del sistema

Captura: `despues/P30-recordatorios-sistema-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P30-M1 | P1 | D7 | "Zona horaria del sistema" aparece dos veces: como título de la card (16/600) y, 80 dp más abajo, como rótulo del campo (14/600). Para un solo valor hay cinco niveles: título, descripción, rótulo, valor y botón a todo el ancho. La card mide unos 230 dp. | Fila de ajuste: rótulo "ZONA HORARIA" en 11/700, valor en 15/600 y un botón de texto "Cambiar" en 13/600 azul a la derecha, en la misma fila. La descripción va debajo en 12 gris. La card queda en unos 120 dp. |
| P30-M2 | P1 | D5 | En la card de Gmail, el estado "Sin conectar" queda al final, debajo del botón, en 13 negro, y "Correo de avisos" funciona como rótulo de 14/600. El estado, que es lo que importa, es lo último que se lee. | Encabezado "Email (Gmail)" en 15/600 con un chip neutro "Sin conectar" (radio 4) a la derecha. "Conectar Gmail" pasa a botón relleno, porque es la única acción pendiente, alineado a la derecha al pie. |
| P30-M3 | P2 | D2 | El valor técnico "America/Argentina/Buenos_Aires" va en Montserrat 13 con guiones bajos, y la descripción incluye "(scope gmail.send)". El texto es del terreno de S24. | Mostrar "Buenos Aires" en 15/600 y "GMT−03:00" en Roboto Mono 12 con números tabulares, en gris. |
| P30-M4 | P2 | D8 | (sistémico: margen de página) Las cards empiezan a 16 dp (x = 38 px), pero el tile y la regla del encabezado empiezan a 12 dp (x = 28 px): son dos líneas de inicio a 4 dp de distancia. | Encabezado y cards en la misma línea de 16 dp. |

**Oscuro:** (sistémico: gen_colors.dark) Los botones contorneados tienen borde `#272727` sobre una card `#1c1c1c`, con un contraste de borde de ~1,2:1, y se ven como rectángulos vacíos. Con D10 la card pasa a `#151515` y el borde a `#333`.

**Brief de boceto:**
- Card 1: rótulo "ZONA HORARIA" en 11/700 y, debajo, "Buenos Aires" en 15/600 con "GMT−03:00" en mono gris; a la derecha, el enlace azul "Cambiar". Quitar el título duplicado y el botón de ancho completo.
- Card 2: encabezado "Email (Gmail)" con un chip gris rectangular "Sin conectar" a la derecha; debajo, la descripción de una línea en gris.
- En la card 2, un botón azul relleno "Conectar Gmail" alineado a la derecha al pie, y sacar la fila "Correo de avisos / Sin conectar".
- Alinear el título "Recordatorios" y las cards a 16 dp del borde.

### P31a Almacenamiento

Captura: `despues/P31a-almacenamiento-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P31a-M1 | P1 | D6 | Hay tres botones contorneados a todo el ancho (40 dp) apilados: "Editar configuración", "Cambiar a Google Drive" y "Probar conexión guardada". Tienen el mismo peso, pero solo el tercero lleva ícono, y los separan huecos de 9 y 13 dp. | "Probar conexión" (tonal, ícono `refresh`) y "Editar" (contorneado) lado a lado al pie de la card. "Cambiar a Google Drive" pasa a una sección aparte con el rótulo "OTRO PROVEEDOR", como enlace azul en 13/600. |
| P31a-M2 | P1 | D4 | La card no tiene título: "Proveedor activo: Nextcloud", la URL y "Usuario: ncadmin" son tres líneas iguales de 13/400 con prefijos del tipo "X:". | Encabezado "Nextcloud" en 15/600 con un chip "Activo" (verde al 12 %, radio 4) a la derecha. Debajo, los pares "SERVIDOR" y "USUARIO" con rótulo en 11/700 y el valor en Roboto Mono 12. |
| P31a-M3 | P2 | D7 | "Trabajos de almacenamiento" es una fila de navegación con chevron dentro de la misma card y sin divisor, a 24 dp del último botón, así que parece parte del formulario. | Una card aparte o un divisor de 1 px, y una fila de 56 dp con ícono de 20, título en 13/600, subtítulo en 12 gris y chevron. Si hay fallidos, un chip rojo con el número. |
| P31a-M4 | P3 | D8 | Del texto al primer botón hay unos 3 dp (y 724 → 742 px), y entre botones 9 y 13 dp, así que el ritmo vertical se rompe. | 12 dp después del bloque de datos y 8 dp entre controles. |

**Oscuro:** igual que en P30: el borde `#272727` de los botones casi no se ve sobre `#1c1c1c` (sistémico: gen_colors.dark).

**Brief de boceto:**
- Encabezado de la card: "Nextcloud" en 15/600 con un chip verde rectangular "Activo" a la derecha.
- Debajo, dos pares rótulo/valor: "SERVIDOR" con `http://localhost:8081` en mono y "USUARIO" con `ncadmin` en mono.
- Al pie, dos botones lado a lado: "Editar" contorneado y "Probar conexión" tonal azul con ícono de refresco; debajo, un enlace azul "Cambiar a Google Drive".
- Mover "Trabajos de almacenamiento" a una card separada, como fila con ícono, subtítulo gris y chevron.

### P31b Integración con Genstock

Captura: `despues/P31b-genstock-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P31b-M1 | P1 | D5 | "Sin URL configurada" lleva un ícono `check_circle` (AppIcons.success, fijo en el código) en gris: un tilde de éxito para un estado pendiente. | Chip "Sin configurar" neutro junto al título "Servidor". El `check_circle` en verde solo con la URL guardada, y en el estado vacío un `link_off` de 18 dp gris. |
| P31b-M2 | P1 | D1 | El título "Integración con Genstock", en 24/700, ocupa 2 líneas y lleva un subtítulo de 2 líneas. El tile de 38 dp queda centrado frente al bloque (y ≈ 200–236 dp), sin alinearse a la primera línea, y el encabezado mide unos 128 dp contra unos 70 en las otras pestañas. | Título "Genstock" (igual que la pestaña) en 20/700 y en una línea, con un subtítulo de una línea en 13 gris. Sin tile, o alineado arriba. |
| P31b-M3 | P2 | D7 | "Guardar" (relleno, 102 dp) y "Probar conexión" (contorneado deshabilitado, 156 dp) van alineados a la izquierda y con anchos dispares. | Fila alineada a la derecha: "Probar conexión" tonal o de texto y "Guardar" relleno, los dos de 40 dp. |
| P31b-M4 | P2 | D2 | El placeholder "http://127.0.0.1:8110" en gris medio (`#767687`) dentro del campo se confunde con un valor cargado, y el rótulo "URL del server Genstock" va en 13 gris. El texto es del terreno de S25. | Rótulo "URL DEL SERVIDOR" en 11/700 y un placeholder más tenue (`#9aa0ab`) en Roboto Mono 13. |

**Oscuro:** (sistémico: gen_colors.dark) El campo `#151515` es más oscuro que la card `#1c1c1c` y se hunde como un agujero. D10 lo invierte: card `#151515` y campo `#1c1c1c`.

**Brief de boceto:**
- Título "Genstock" en 20/700 en una sola línea, con un subtítulo gris de una línea y sin el tile del globo.
- Encabezado de la card: "Servidor" con un chip gris rectangular "Sin configurar" a la derecha; sacar la fila del tilde.
- Rótulo "URL DEL SERVIDOR" en 11/700 sobre el campo, con un placeholder tenue en mono.
- Botones al pie alineados a la derecha: "Probar conexión" de texto y "Guardar" azul relleno.

### P32 Errores

Captura: `despues/P32-errores-admin-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P32-M1 | P1 | D7 | El filtro es un dropdown con label flotante sobre la muesca del borde ("Estado" en 11) y valor en 15/600 ("Abiertos"). En P28/P29, el rótulo va arriba y el valor en 13/400. Para 2–3 opciones fijas, un dropdown esconde lo que se puede elegir. | Control segmentado de 36 dp y radio 6: "Abiertos · Resueltos · Todos". El segmento seleccionado lleva fondo de acento al 12 % y texto de acento. |
| P32-M2 | P2 | D8 | (sistémico: estado vacío) La card vacía mide 92 dp y su texto tiene una sangría de 36 dp desde el borde (x = 124 px contra la card en 38 px). No tiene ícono. | Estado vacío centrado con un `check_circle` de 24 dp en verde (acá sí es un estado positivo), "Sin errores abiertos" en 13/600 y una línea de 12 gris. |
| P32-M3 | P2 | D2 | (código) Con datos, cada fila muestra `ruta · N veces` y, en una segunda línea, `lastSeenAt` crudo (ISO) en 12 gris, con un mensaje de hasta 3 líneas. | Fila de 64–72 dp: mensaje en 13/600 (máximo 2 líneas), ruta en Roboto Mono 12 gris, un chip mono "×12" a la derecha y la fecha relativa ("hace 2 h"). |
| P32-M4 | P2 | D1 | (sistémico; ver P27-M1/M2) Encabezado con engranaje y pestaña activa "Errores" pegada al borde, con "…cenamiento" cortado. | Ver P27-M1/M2. |

**Oscuro:** sin hallazgos propios.

**Brief de boceto:**
- Cambiar el dropdown "Estado / Abiertos" por un control segmentado de tres partes, "Abiertos", "Resueltos" y "Todos", con "Abiertos" en fondo azul tenue y texto azul.
- Quitar el tile del engranaje y dejar "Errores" en 20/700.
- Este boceto muestra la pantalla CON datos (la captura está vacía): en lugar de la card "No hay errores en este estado.", una card con dos filas de error separadas por un divisor de 1 px. Cada fila: el mensaje en negrita 13/600 ("Mensaje de error"), la ruta en Roboto Mono gris 12 ("ruta") debajo, y a la derecha un chip rectangular gris "×12" (o "×3") y "hace 2 h" en 11 gris. No mostrar ningún texto de estado vacío.

### P33 Portal

Captura: `despues/P33-portal-cliente-light-390-android.png` (+ dark)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P33-M1 | P1 | D4 | (sistémico: NamePill) El nombre del proyecto es un chip gris (`#eceef1`) de 26 dp con "CARTELERÍA DEL LOCAL" en mayúsculas. Para un cliente que tiene un solo proyecto, el nombre parece una etiqueta. | El nombre como título de la card: 15/600, en minúsculas normales (primera mayúscula), sin fondo y hasta dos líneas. |
| P33-M2 | P1 | D5 | (sistémico: CardProgress y texto de plazo) La barra es verde (`#1e8a44`) al 33 %, cuando en el detalle P34 es azul, y "3 días restantes" va en ámbar e itálica. | Barra de 4 dp en azul de marca (verde solo al 100 %). Plazo como chip "Faltan 3 días" con ámbar al 12 %, radio 4 y sin itálica. |
| P33-M3 | P2 | D3 | La card reparte los datos en cuatro filas (nombre, barra + 33 %, "1/3 tareas", entrega + plazo) en unos 146 dp, y "1/3 tareas" queda huérfano 26 dp por debajo de la barra. | Barra con "1/3 · 33 %" en Roboto Mono 12 tabular a la derecha, en la misma fila. Pie: ícono de calendario de 16, "29/10/2026" en mono y el chip de plazo a la derecha. Unos 112 dp. |
| P33-M4 | P2 | D1 | (sistémico: ThemeToggle) La barra superior lleva tres íconos de tema de 24 dp (laptop en azul, sol y luna) que pesan más que la marca. Debajo, el tile de 38 dp, el título de 24/700 y un subtítulo de 2 líneas, así que la primera card empieza a 225 dp. | Un solo ícono de tema de 20 dp gris (o moverlo al drawer). Título "Mis proyectos" en 20/700 sin tile y subtítulo de una línea. |

**Oscuro:** el verde `#3ecf8e` y el ámbar `#fbbf24` en itálica vibran sobre `#1c1c1c`. Con P33-M2, la barra pasa a `#5b7fff` y el plazo queda como chip con relleno tenue.

**Brief de boceto:**
- Reemplazar el chip gris "CARTELERÍA DEL LOCAL" por el título "Cartelería del local" en 15/600 negro, sin fondo.
- Pintar la barra de progreso de azul de marca y poner "1/3 · 33 %" en mono gris a su derecha, en la misma fila; eliminar la línea "1/3 tareas".
- Pie de la card: ícono de calendario + "29/10/2026" en mono gris, y a la derecha un chip rectangular ámbar tenue "Faltan 3 días", sin itálica.
- Dejar en la barra superior un solo ícono gris de tema; quitar el tile de la carpeta y el subtítulo largo, con "Mis proyectos" en 20/700.

### P34 Proyecto en portal

Captura: `despues/P34-proyecto-portal-cliente-light-390-android.png` (+ dark, + `-s2`)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P34-M1 | P1 | D9 | Hay dos formas de volver: la flecha de la barra (y ≈ 76 dp) y la miga "← Mis proyectos" en 14/600 negro (y ≈ 135 dp), tan grande como el cuerpo. Después vienen el tile de 38 dp y el título de 24/700, así que el contenido empieza a unos 250 dp. | Quitar la miga, porque la flecha ya vuelve; si se conserva, en 12/500 gris y sin flecha. Título en 20/700 sin tile. |
| P34-M2 | P1 | D3 | La descripción no tiene límite: 7 líneas (unos 210 dp) de 13 gris antes de cualquier dato. Las pestañas recién aparecen a 515 dp, en el borde inferior de la primera pantalla. | Limitarla a 3 líneas con "Ver más" en 13/600 azul. |
| P34-M3 | P1 | D3 | "Entrega: 29/10/2026" ocupa una card propia de 46 dp para un solo dato. Debajo hay una barra suelta "1/3 · 33 %", y la sección "Preparación y entrega" repite exactamente la misma barra. El plazo restante que muestra P33 acá no aparece. | Una sola card resumen de 2 columnas separadas por un divisor: "ENTREGA" (11/700) con "29/10/2026" en mono 15 y el chip "Faltan 3 días"; "AVANCE" con "33 %" en mono 20 y una barra de 4 dp. Ocultar la barra de sección cuando hay un solo objetivo. |
| P34-M4 | P2 | D7 | Las subtareas son cards con borde dentro de la card de tarea: dos bordes de 1 px a 12 dp, una card dentro de otra. El chip de estado va pegado al final del texto en lugar de alinearse. | Subtareas como filas con sangría de 16 dp y divisores de 1 px, dentro de la misma superficie. Chips alineados a la derecha en una columna. |
| P34-M5 | P2 | D5 | (sistémico: StatusChip) "Pendiente" usa el azul de acento (`#eef1ff` / texto azul), el mismo azul que la pestaña activa. En la TV (P35), el mismo estado es gris, y "Terminado" es verde con el texto, además, tachado. | Pendiente neutro (gris), En curso azul y Terminado verde, iguales en todas las pantallas. Para lo terminado alcanza con el tachado en gris más el chip. |

**Oscuro:** el chip "Pendiente" pasa a texto claro sobre `#171c2e` (en claro el texto es azul), pierde el tono y se lee como un botón. Además, las subtareas `#1c1c1c` dentro de la card `#1c1c1c` solo se separan por el borde `#272727`, que apenas se ve.

**Brief de boceto:**
- Quitar la fila "← Mis proyectos" y el tile de la carpeta; título "Cartelería del local" en 20/700 bajo la barra.
- Cortar la descripción a 3 líneas con un enlace azul "Ver más".
- Reemplazar la card de entrega y la barra suelta por una card de dos columnas con divisor vertical: "ENTREGA 29/10/2026" con el chip ámbar "Faltan 3 días" y "AVANCE 33 %" con una barra azul.
- Mostrar las subtareas como filas con sangría y divisor (sin cards dentro de cards), con los chips de estado alineados a la derecha: "Pendiente" en gris y "Terminado" en verde.
- Quitar la barra duplicada debajo de "Preparación y entrega".

### P35 TV

Captura: `despues/P35-tv-lector-light-390-android.png` (+ dark; `-s2`/`-s3` web)

| ID | Prio | D | Hallazgo | Corrección |
|---|---|---|---|---|
| P35-M1 | P1 | D3 | Cada fila de tarea mide 100–125 dp: título, miga del proyecto, "1/2 subtareas" y el chip en su propia línea. La miga "Cartelería del local › Preparación y entrega" se repite idéntica en las 3 filas de la misma card. | Agrupar por proyecto con un subencabezado en 11/700 ("CARTELERÍA DEL LOCAL · PREPARACIÓN Y ENTREGA") una sola vez. Filas de 56 dp con el título en 13/600, el chip a la derecha y "1/2" en mono 12 debajo. |
| P35-M2 | P1 | D5 | Delante de cada tarea hay un punto azul de 10 dp, igual en todas, que no codifica nada. "En curso" y "Pendiente" son chips grises iguales. | Sin punto, o un punto del color del estado. Chip "En curso" en azul al 12 % y "Pendiente" neutro. |
| P35-M3 | P1 | D4 | Dos cards seguidas se titulan "Impresión" con las mismas cifras y nada que las distinga. En el encabezado hay tres números que no concuerdan: el badge "2", "1 de 3 finalizadas" y 3 tareas listadas. | "Impresión" en 15/600 más el grupo o el origen en 13 gris en la misma línea. Una sola cifra de pendientes ("2 pendientes") en la meta y sin badge. |
| P35-M4 | P2 | D3 | El resumen global, "4 tareas pendientes · 2 sectores" y "2 de 6 finalizadas", va en 13 gris en los dos extremos de una línea. Es el dato principal de una TV y tiene peso de nota al pie. | Franja de 3 valores en una card con divisores: "4 PENDIENTES", "2 SECTORES" y "2/6 FINALIZADAS", con la cifra en 20/700 mono y el rótulo en 11/700. Unos 72 dp. |
| P35-M5 | P2 | D7 | El encabezado de cada sector es un bloque gris (`#f1f3f6`) dentro de la card blanca, con lengüeta azul de 3 dp: es un bloque gris parcial. | Encabezado sobre la misma superficie de la card, separado por un divisor de 1 px, con la lengüeta en el color del sector. La legibilidad a distancia queda en S28. |

**Oscuro:** en claro, los chips de estado tienen relleno; en oscuro son contorneados, sin relleno y con borde `#333`. El mismo componente cambia de forma según el tema.

**Brief de boceto:**
- Reemplazar la línea gris de resumen por una card con 3 columnas separadas por divisores: "4" PENDIENTES, "2" SECTORES y "2/6" FINALIZADAS, con cifras grandes en mono.
- En cada card de sector: "Impresión" con el nombre del grupo en gris al lado, sin el badge "2", y el encabezado en blanco con un divisor fino en lugar del bloque gris.
- Agrupar las tareas bajo un subencabezado único "CARTELERÍA DEL LOCAL · PREPARACIÓN Y ENTREGA" y quitar la miga repetida de cada fila.
- Filas compactas: título a la izquierda y chip a la derecha ("En curso" azul tenue, "Pendiente" gris), sin el punto azul, con "1/2" en mono gris debajo del título.

## 4. Patrones sistémicos

Lo que se repite en muchas pantallas sale de pocos componentes compartidos. Si se corrigen en ese orden, la mayoría de los 152 hallazgos por pantalla se resuelve sin tocar pantalla por pantalla. Como Android copia la web, cada cambio se hace en las dos a la vez (módulo `implementacion-premium`), con los tokens de `@gen/ui` del lado web.

| ID | Patrón | D | Pantallas | Dónde se corrige (Flutter) |
|---|---|---|---|---|
| PS1 | Superficies oscuras con el escalón invertido: el campo es más oscuro que su card, el borde de los botones contorneados no se ve y el verde y el ámbar están saturados. | D10 | casi todas en oscuro | `core/theme/gen_colors.dart`, `shared/widgets/workspace_input_theme.dart`, `app_button_styles.dart` |
| PS2 | Margen de página de 12 dp en unas partes y 16 en otras; el título de la barra arranca en x≈72 dp. Nada comparte una línea de inicio. | D8 | todas | `core/theme/app_geometry.dart`, `gen_page_scaffold.dart`, `app_theme.dart` (`appBarTheme.titleSpacing`). El 12 viene de `.main` de la web: se cambia en las dos. |
| PS3 | Cabecera de página con tile de 38 dp, título de 24/700 y regla. En las raíces empuja el contenido a ~210–245 dp; en Configuración repite la pestaña activa con el mismo engranaje en seis pantallas. | D1, D2 | ~30 | `shared/widgets/gen_section_header.dart`, `page_intro.dart`, `core/theme/app_text_styles.dart` |
| PS4 | Filas de ajustes de 92–94 dp: una card por ítem con `ListTile` en lugar de una card por grupo con filas de 56 dp y divisores. | D7, D8 | P19, P23, P25, P26, P27 | `app_theme.dart` (`listTileTheme`), `tile()`/`userCard()`/`clientCard()` en `features/settings/settings_screen.dart` |
| PS5 | Acciones de fila como botón contorneado a todo el ancho (incluido el destructivo); guardar como enlace de texto suelto. | D6, D7 | P09, P26, P27, P30, P31a | `button()` de `settings_screen.dart`, `task_detail_sheet.dart`, `app_button_styles.dart` |
| PS6 | Nombre de la entidad como chip gris en mayúsculas (proyecto, sector, grupo). | D4 | P05, P11, P13, P33 | `shared/widgets/name_pill.dart`, `features/works/work_card.dart`, `portal_screen.dart` |
| PS7 | El progreso es verde de 8 dp en las cards y azul de 4 dp en los detalles. El plazo va en ámbar e itálica, y el estado cambia de color según la pantalla. El verde también marca "recordatorio individual". | D5 | P05, P07, P10–P14, P21, P33–P35 | `card_progress.dart`, `progress_line.dart`, `status_chip.dart`, `reminder_scope_color.dart` |
| PS8 | KPI en grilla 2 × 2 con rótulos en Roboto Mono y "· %" repetido. | D2, D3 | P05, P08 | `shared/widgets/stat_cards.dart`, `kpi_tile.dart` |
| PS9 | Fila de tarea con contador, Mi día, agregar y quitar al mismo peso. El texto queda en ~90 dp y la fila llega a 75–88 dp (T3). Las filas de catálogo tienen cuatro `IconButton`. | D6 | P04, P07, P12, P28, P29 | `shared/widgets/task_tile.dart`, `catalog_settings_screen.dart` |
| PS10 | Tres recetas de campo (rótulo arriba, rótulo flotante, sugerencia con aspecto de valor) y "Copiar" en otro renglón. | D7 | P09, P24, P28, P29, P31b, P32 | `app_dropdown_decoration.dart`, `workspace_input_theme.dart`, `labeled_field.dart`, `field_suffix.dart` |
| PS11 | Estados vacíos con tres formas: bloque centrado con ícono, card a la izquierda sin ícono y párrafo suelto. | D7 | P18–P22, P24a, P28, P29, P32 | `state_views.dart` (`EmptyView`), `app_state_block.dart` |
| PS12 | Pestañas de Configuración: 14 en una tira que abre cortada, con nombres que no coinciden con los títulos ("Resumen" ↔ "Configuración"). | D9 | P23–P32 | `features/settings/settings_tabs.dart`, `shared/widgets/gen_tab_bar.dart` (ver S04/S18) |
| PS13 | Las subpantallas del proyecto (Documentos, Archivos, Actividad, Acceso cliente) no dicen de qué proyecto son. | D1, D9 | P17–P19 | `document_screen.dart`, `files_screen.dart`, `work_access_screen.dart` |
| PS14 | Compositor fijo de ~155 dp al pie del detalle de proyecto y de sector. | D3 | P07, P12 | `shared/widgets/task_composer.dart` |
| PS15 | Interruptor de Material 3 sin tema propio: el thumb queda negro en oscuro. | D5, D10 | P07 Materiales, P09 | `app_theme.dart` (falta `switchTheme`) |

**Orden sugerido para `implementacion-premium`:** PS1 y PS2 (tokens y márgenes) → PS3 (cabecera) → PS4, PS5, PS10 y PS11 (filas, acciones, campos y vacíos) → PS6, PS7 y PS8 (cards de entidad, color y KPI) → PS9 y PS14 (tarea y compositor) → PS12, PS13 y PS15. Los P1 técnicos (T1–T4) conviene hacerlos junto con el componente que tocan: T1 con PS10, T3 con PS9 y T2 con las listas de PS4.
