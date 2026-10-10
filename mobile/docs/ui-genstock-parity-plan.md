# Paridad visual genstock → genwork móvil (DS-00 … DS-30)

Plan para que la app móvil use los componentes Flutter de genstock con la identidad de genwork web
(azul `#3B5BFA` / `#5B7FFF`, neutros acromáticos, claro/oscuro/sistema). Decisiones acordadas:
copiar y adaptar código de genstock (no paquete compartido), mantener el drawer con estilo
sidebar genstock/web, sin bottom sheets (el detalle de tarea pasa a pantalla completa), cuerpo de
texto 13 px, un commit por tarea.

## 0. Cómo usar este documento (leer siempre primero)

Este plan se ejecuta **una tarea por sesión** (DS-01, DS-02, …), con un modelo económico. Cada tarea es
autocontenida: dice qué leer, qué archivos tocar, qué hacer y cómo verificar.

### Reglas para el agente ejecutor

1. Leé **solo** esta sección 0, la sección 1 (fuentes), la sección 2 (tokens) y **tu tarea**. No hagas
   otras tareas aunque veas cosas para arreglar: anotalas en la sección 7 ("Hallazgos").
2. Trabajás dentro de `mobile/`. Respetá `mobile/AGENTS.md`: **solo presentación**. Prohibido tocar
   `lib/data/`, `*_providers.dart`, `lib/core/router/`, `lib/core/auth/`, `lib/core/network/`,
   `lib/core/live/`. Excepción explícita: DS-04 lee `lib/core/theme/theme_preference.dart` (no lo cambia).
3. **No cambies comportamiento.** Pull-to-refresh, reintentar, permisos (`canEdit`, `canOperate`,
   `canToggle`), carga/error, guardado al salir: todo igual.
4. **`ValueKey` intactas.** Si movés un control, la key va con él. Controles nuevos:
   `ValueKey('<pantalla>_<accion>')`.
5. **Tipos de widget que los tests buscan con `byType` — no los reemplaces**, solo estilalos por tema:
   `ChoiceChip` (`task_status_*`, filtro de proyectos), `Checkbox` (`task_toggle_*`), `Dismissible`
   (`task_swipe_*`), `ListTile` (ítems del drawer, `nav_works` usa `.selected`), `TextField`, `Drawer`,
   `BackButton`, `Scrollable`, `ProgressLine`. `NavigationBar` debe seguir **ausente**.
   Antes de cambiar un widget, corré `grep -rn "byType(<Tipo>)" test/`.
6. **Tests**: solo podés actualizar un finder si cambió la *estructura* (no el comportamiento) y lo
   explicás en el commit. Nunca relajes `ui_phase3_test.dart` "contraste AA" ni el chequeo de overflow
   a 360 dp / texto 1.5×. Si falla el contraste, ajustá el token, no el test.
7. **Nada de colores ni medidas sueltas** en `lib/features/` y `lib/shared/`: nada de `Colors.*`
   (salvo `Colors.transparent`), `Color(0x…)`, `BorderRadius.circular(<número>)`, `EdgeInsets` con
   números mágicos, `Icons.*` fuera de `AppIcons`, `showModalBottomSheet`. Todo sale de los tokens.
8. Textos en castellano rioplatense; botones en *sentence case*.
9. Copiar de genstock = copiar el archivo, **renombrar** (`GenStock*` → `Gen*`), cambiar imports a
   `package:genwork_mobile/...`, sacar dependencias de dominio genstock, adaptar Riverpod 2 → 3 si aplica
   (genwork usa `Notifier`/`NotifierProvider`, no `StateNotifier`). Encabezado en cada archivo copiado:
   `// Portado de genstock: frontend/lib/<ruta original>`.
10. Al terminar la tarea:
    ```sh
    cd mobile
    dart format lib test
    dart analyze            # 0 issues
    flutter test            # todo verde
    ```
    + la verificación propia de la tarea. Luego marcá la tarea ✅ en la sección 5 con fecha, y commit:
    `feat(mobile-ui): DS-XX <título corto>` (sin `Co-Authored-By`, sin mencionar IA).
11. Si algo bloquea (dependencia faltante, test que no se puede mantener sin cambiar comportamiento):
    parás, anotás en "Hallazgos" y no forzás.

### Prompt plantilla para lanzar una tarea

```
Trabajás en /Users/tomi/conductor/workspaces/genwork/paris (rama actual).
Leé mobile/docs/ui-genstock-parity-plan.md: secciones 0, 1, 2 y la tarea DS-XX.
Ejecutá SOLO DS-XX siguiendo sus pasos y reglas. Verificá como indica la tarea y la sección 0.
Al final: marcá DS-XX ✅ en la sección 5 y hacé el commit indicado.
```

## 1. Fuentes de verdad

**Principio:** *estructura y componentes = genstock; valores (colores, tipografía, radios) = web genwork.*
Si genstock y la web difieren en un valor, gana la web.

| Qué | Dónde |
|---|---|
| Tokens web (valores finales) | `src/app/globals.css` líneas 26–193 |
| Reglas web | `DESIGN.md`, `design-system/genwork/MASTER.md`, `design-system/genwork/GENSTOCK_PARITY.md`, mockups en `design-system/genwork/mockups/` |
| Paleta de etiquetas/sectores (16 colores) | `src/lib/domain/colors/palette.ts` |
| Contraste texto sobre color | `src/lib/domain/colors/contrast.ts` (`#111111` si luminancia > 0.5, si no `#FFFFFF`) |
| Sidebar/drawer web | `src/components/nav/Shell.tsx`, `src/components/nav/DrawerNav.tsx` |
| Encabezado de página web | `src/components/ui/PageHeader.tsx` |
| Selector de tema web | `src/components/ui/ThemeToggle.tsx` |
| **genstock Flutter (código a copiar)** | `GS=/Users/tomi/conductor/workspaces/genstock-inventory/beirut/frontend` (rama `tOMAS-gen/producction`). Si no existe esa carpeta: `git -C /Users/tomi/Desktop/en_trabajo/genstock-inventory show tOMAS-gen/producction:frontend/<ruta>` |
| Tema genstock | `$GS/lib/core/theme/app_theme.dart`, `gen_stock_colors.dart`, `workspace_theme.dart`, `shell_chrome_theme.dart` |
| Widgets genstock | `$GS/lib/shared/widgets/*` |
| Shell genstock (solo referencia de layout) | `$GS/lib/features/shell/presentation/widgets/sector_sidebar.dart`, `sector_scaffold.dart` |
| Doc diseño genstock | `/Users/tomi/conductor/workspaces/genstock-inventory/beirut/DESIGN.md` |
| Tema móvil actual | `mobile/lib/core/theme/app_theme.dart`, `theme_preference.dart` |

**Ojo con genstock:** el tema efectivo se arma en 3 capas (`AppTheme` → `ShellChromeTheme` →
`WorkspaceTheme`). Los valores de `gen_stock_colors.dart` crudos NO son los finales. Para genwork
**no se usan** `ShellChromeTheme` ni la fuente Archivo (la web usa Montserrat en todo): se fusiona todo
en un único `ThemeData` con los valores de la sección 2.

**No copiar de genstock:** `desktop_titlebar`, `gen_stock_title_bar`, `disconnection_gate_dialog`,
`product_filters_drawer`, `barcode_*`, `sign_button`, chips de dominio (Device/User/Stock/SupplierOrder),
`numeric_*`, `pre_auth_shell`, `sector_bottom_bar`, `app_shell_view`, `more_screen`, `bitsdojo_window`,
`google_fonts`.

## 2. Tokens objetivo (valores finales)

### 2.1 Colores — `GenColors` (ThemeExtension)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `page` | `#F4F5F8` | `#0C0C0C` | scaffold, app bar |
| `field` | `#F1F3F6` | `#151515` | inputs, drawer, franjas de header |
| `surface` | `#FFFFFF` | `#1C1C1C` | cards, paneles |
| `floating` | `#FFFFFF` | `#262626` | diálogos, menús, toasts |
| `hover` | `#ECEEF2` | `#2C2C2C` | hover/pressed, skeleton base |
| `text` | `#111118` | `#F0F0F0` | texto principal |
| `muted` | `#5C5C70` | `#959595` | texto secundario, íconos |
| `border` | `#D2D6DE` | `#272727` | bordes estructurales |
| `outline` | `#E3E6EB` | `#333333` | borde de inputs, tracks de progreso |
| `brand` | `#3B5BFA` | `#5B7FFF` | primario, links, foco, selección |
| `onBrand` | `#FFFFFF` | `#0C0C0C` | texto sobre `brand` (en oscuro NO blanco) |
| `brandFill` | `#EEF1FF` | `#171C2E` (opaco ≈ 14 % de brand sobre page) | fondo de ítem activo, caja de ícono de header |
| `danger` / `dangerFill` | `#B91C1C` / `#FEF2F2` | `#F87171` / `#3A1518` | errores, acciones destructivas |
| `ok` | `#15803D` | `#3ECF8E` | relleno de progreso en cards |
| `success` base/fill/text | `#22C55E` / `#F0FDF4` / `#166534` | `#4ADE80` / `#1A22C55E` / `#86EFAC` | estados |
| `warning` base/fill/text | `#F59E0B` / `#FFFBEB` / `#92400E` | `#FBBF24` / `#1AF59E0B` / `#FCD34D` | |
| `info` base/fill/text | `#3B82F6` / `#EFF6FF` / `#1E40AF` | `#60A5FA` / `#1A3B82F6` / `#93C5FD` | |
| `favorite` | `#EAB308` | `#FACC15` | estrella |
| `dueText` / `dueFill` | `#B45309` / `#FEF3C7` | `#FBBF24` / `#26FBBF24` | fecha dentro de tarea |
| tags `work` text/fill | `#7C3AED` / `#F3EEFF` | `#B79CFF` / `#2A2140` | sintaxis del composer |
| tags `exec` | `#2563EB` / = brandFill | `#7FB0FF` / = brandFill | |
| tags `ref` | `#B45309` / `#FFF4E0` | `#FFB35C` / `#3A2A12` | |
| tags `user` | `#9333EA` / `#F3E8FF` | `#C084FC` / `#2E1A47` | |
| tags `label` | `#0F766E` / `#CCFBF1` | `#5EEAD4` / `#113230` | |

Reglas: neutros oscuros acromáticos (R=G=B). Azul solo en marca, selección y foco. Foco: borde 2 px `brand`.
Colores de etiqueta/estado elegidos por el usuario: chip con fondo = mezcla 14 % del color sobre `surface`,
texto = mezcla 80 % del color con `text` (pill de estado de tarea: 16 % / 85 %).

**Paleta de selección de color** (16, de `palette.ts`, default `#3B5BFA`): `#EF4444 #F97316 #F59E0B
#84CC16 #22C55E #10B981 #14B8A6 #0EA5E9 #3B82F6 #6366F1 #8B5CF6 #D946EF #EC4899 #6B7280 #475569 #92400E`.
Siempre swatches visuales, nunca nombres.

### 2.2 Geometría, espaciado, sombras, movimiento

- Radios (`AppGeometry`, de genstock): checkbox **2**, chip/badge/tooltip **4**, botón/input/ítem de nav **6**,
  card/panel/toast **8**, menú **10** (ítems 7), diálogo/overlay **12**. Círculo solo en avatar, contador y progreso.
- Espaciado: escala 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48. Se conserva `AppSpace` (móvil:
  xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32) para el código existente. Los widgets portados usan
  `AppSpacing` de genstock (xxs 4, xs 8, sm 12, md 16, ml 20, lg 24, xl 32, xxl 40, xxxl 48). **Misma
  escala, distinto nombre** — no traduzcas a mano, no mezcles dentro de un mismo archivo.
- Padding de página y cards 16. Objetivo táctil ≥ 48. Alto de control ≥ 40 (crece con `textScaler`).
- Lengüeta activa: 3 px `brand` (`LeadingTickBorder`, `kActiveTickWidth = 3`) en drawer, tabs y día actual.
- Sombras **solo** en flotantes (diálogo, menú, toast): claro `0 10 20 rgba(15,23,42,.12)`,
  oscuro `0 10 20 rgba(0,0,0,.5)`. Cards planas, sin elevación ni lift.
- Movimiento 150–200 ms `easeOut`, modales 260 ms, sin rebote. Respetar `MediaQuery.disableAnimations`.

### 2.3 Tipografía (Montserrat; Roboto Mono para fechas, códigos, números)

| Estilo | Tamaño/peso/alto | Mapeo `textTheme` |
|---|---|---|
| screenTitle | 24/700/1.3 | `headlineSmall` |
| dialogTitle | 16/600/1.3 (web) | `titleLarge` |
| itemTitle | 14/600/1.35 | `titleMedium` |
| body | **13**/400/1.6 | `bodyLarge`, `bodyMedium` |
| supporting | 12/400/1.5 `muted` | `bodySmall` |
| action | 13/600/1.2 | `labelLarge` |
| sectionLabel | 11/700, mayúsculas, tracking 1.2 | `labelSmall` |
| chip | 12/500/1.5 | `chipTheme.labelStyle` |
| technical (Mono) | 12/400 | `AppTokens.code` |

Íconos: Material outlined, centralizados en `AppIcons` (`lib/core/theme/app_icons.dart`). Tamaños:
16 drawer, 18 campo/rail, 20 acción, 22 header de página, 48 estado vacío.

## 3. Mapa de componentes (genwork móvil actual → genstock)

| Hoy en `mobile/lib/shared/widgets` | Pasa a |
|---|---|
| `ColorPill`, `ColorDot` | `StatusChip` de genstock (radio 4, mezcla 14 %/80 %); `ColorDot` se mantiene (círculo) |
| `ColorPalette` + paleta duplicada en `settings_form_dialog.dart` | una sola `ColorPalette` con los 16 colores de 2.1 |
| `LoadingView` | skeleton `GenSkeleton` (shimmer `hover`→`border`, 1.4 s) dentro de `AppStateBlock` |
| `ErrorView`, `EmptyView` | `AppErrorWidget` / `AppStateBlock` de genstock (API pública actual se mantiene) |
| `showErrorSnack` | SnackBar flotante con estilo toast genstock (misma función) |
| `confirmAction`, `showNameColorDialog`, `showReorderDialog` | `AppWorkDialog` + `showAdaptiveModal` (mismas firmas y keys) |
| `PageIntro`, `BrandHeader` | `GenSectionHeader` (caja de ícono 38 sobre `brandFill`) y `BrandName` "›gen"+"work" |
| `PendingBadge` (shell, local) | `CountBadge` compartido (pill, `hover`, "999+", oculto en 0) |
| `ProgressLine` | mismo widget, track `outline`, relleno `ok`/`brand`, 4 px redondeado |
| `TaskViewToggle` (SegmentedButton) | estilo segmentado genstock (radio 6, activo `brandFill`) |
| `TaskTile` | card plana + `Checkbox` radio 2 + chips 4 px + `StatusChip` para "Te mencionan" |
| bottom sheet de tarea | pantalla completa (`Navigator.push` con `MaterialPageRoute(fullscreenDialog: true)`) |
| Dropdown de tema en settings | `ThemeToggle` de genstock (3 íconos: sistema/claro/oscuro) |
| — | nuevos: `AppInlineNotice`, `WorkspacePanel`, `WorkspaceListPanel`, `AppWorkSection`, `WorkspaceSearchBar`, `GenFilterChipBar`, `GenTabBar`, `GenPageScaffold` |

## 4. Tareas

Leyenda de modelo sugerido: **M** = modelo medio (p. ej. Sonnet), **B** = modelo barato (p. ej. Haiku/Codex mini).
"Paralelo" = puede correr a la vez que las otras del mismo grupo (tocan archivos distintos).

### Fase A — Fundamentos (secuencial, M)

#### DS-00 — Línea de base
- Correr `dart analyze`, `flutter test` y `flutter test --dart-define=UI_PREVIEWS=true`.
- Copiar las capturas generadas a `../.context/ds-baseline/` (claro/oscuro).
- Anotar en la sección 5 cantidad de tests en verde. Sin cambios de código. Commit solo del MD.

#### DS-01 — `GenColors` (tokens de color)
- Crear `lib/core/theme/gen_colors.dart`: copiar estructura de `$GS/lib/core/theme/gen_stock_colors.dart`
  (`ThemeExtension`, `copyWith`, `lerp`, extensión `context.colors`), renombrar a `GenColors`, y
  **reemplazar los valores por la tabla 2.1** (agregar los tokens genwork que genstock no tiene:
  `favorite`, `due*`, tags, `outline`, `onBrand`). Instancias `GenColors.light` y `GenColors.dark`.
- Agregar helpers: `Color chipFill(Color c)` (mezcla 14 % sobre `surface`), `Color chipText(Color c)`
  (80 % con `text`), `Color statusFill/statusText` (16 %/85 %), `Color textOn(Color bg)` (regla de `contrast.ts`).
- Copiar `$GS/lib/shared/widgets/app_color_contrast.dart` a `lib/core/theme/color_contrast.dart`.
- No conectar todavía al tema. Test nuevo `test/core/gen_colors_test.dart`: valores clave y que `lerp` funcione.

#### DS-02 — Geometría, espaciado, tipografía, sombras, íconos
- Crear `lib/core/theme/app_geometry.dart` copiando de `$GS/.../app_theme.dart`: `AppGeometry` (valores 2.2),
  `AppSpacing`, `AppShadows` (valores web de 2.2, `floatingOf(context)`), `kActiveTickWidth`,
  `LeadingTickBorder`, `WorkspaceMetrics` (alturas que crecen con `textScaler`).
- Crear `lib/core/theme/app_text_styles.dart` con `AppTextStyles` de 2.3 (sin Archivo).
- Crear `lib/core/theme/app_icons.dart`: listar todos los `Icons.*` usados
  (`grep -rho "Icons\.[a-zA-Z_]*" lib | sort -u`, ~68) y exponer cada uno como constante semántica
  (`AppIcons.myDay`, `AppIcons.projects`, …) apuntando a la variante `_outlined` cuando exista.
  Agregar también los que usa el drawer web (notas, Mi día, proyectos, sectores, grupos, vista de tareas,
  recordatorios, configuración, favoritos, plantillas, archivados, campana, salir).
- `AppSpace` queda igual; agregar comentario que remite a `AppSpacing`.
- Sin cambios visuales aún.

#### DS-03 — Reconstruir `ThemeData`
- Reescribir `lib/core/theme/app_theme.dart` manteniendo **firmas públicas**: `AppTheme.light()`,
  `AppTheme.dark()`, `AppSpace`, `AppTokens` (+ `AppTokens.of`). `AppTokens` pasa a ser fachada:
  `field`, `muted`, `success`, radios y `code` leen de `GenColors`/`AppGeometry` (los usos actuales no se tocan).
- `ColorScheme` explícito (sin `fromSeed`): primary=`brand`, onPrimary=`onBrand`,
  primaryContainer=`brandFill`, onPrimaryContainer=`brand`, surface=`surface`, onSurface=`text`,
  onSurfaceVariant=`muted`, outline=`outline`, outlineVariant=`border`, error=`danger`,
  surfaceContainer*=`field`, surfaceContainerLow/Lowest=`page`, surfaceTint transparente.
- `extensions: [GenColors.x, AppTokens(...)]`. `scaffoldBackgroundColor` = `page`.
- Temas de componentes = resultado final de genstock (`$GS/.../workspace_theme.dart` + `app_theme.dart`)
  con valores de la sección 2: botones radio 6 alto ≥ 40 texto `action`; primario relleno `brand`/`onBrand`;
  outlined borde `border`; IconButton 40×40 ícono 18 (área táctil 48); inputs filled `field`, borde 1 `outline`,
  foco 2 `brand`, error `danger`, radio 6; Card `surface` borde `border` radio 8 elevación 0; Chip radio 4
  sin borde 12/500; Dialog `floating` radio 12; SnackBar flotante `floating` radio 8 con borde; AppBar
  fondo `page`, alto 48, elevación 0, borde inferior 1 `border`; ListTile radio 6, minHeight 44;
  Checkbox radio 2 relleno `brand` tilde `onBrand`; Progress `brand` track `outline`; Divider `border`;
  Tooltip `floating` radio 4; PopupMenu/Menu `floating` radio 10; SegmentedButton radio 6 activo `brandFill`
  texto `brand`; TabBar indicador 3 px `brand`; Drawer fondo `field` sin radio, ancho 280.
  Quitar `bottomSheetTheme` (ya no se usan) y `navigationBarTheme`. Mantener `_AppTransition` (fade).
- Verificar: `ui_phase3_test.dart` contraste AA y overflow pasan en claro y oscuro. Si `brandFill`
  no llega a 4.5 con `brand` encima, oscurecer `brandFill` oscuro (no tocar el test).
- Capturas `UI_PREVIEWS=true` a `../.context/ds-03/` y comparar con `ds-baseline`.

#### DS-04 — `ThemeToggle`
- Copiar `$GS/lib/shared/widgets/theme_toggle.dart` a `lib/shared/widgets/theme_toggle.dart`.
  Reemplazar `themeProvider`/`AppLocalStore` por `themePreferenceProvider` existente
  (`ref.watch(themePreferenceProvider)` → `ThemeMode`; `ref.read(themePreferenceProvider.notifier).setMode`).
  Mantener `ThemeToggle` (3 íconos, `ValueKey('theme_system'|'theme_light'|'theme_dark')`) y `ThemeToggleTile`.
- En `lib/features/settings/settings_screen.dart` reemplazar el `DropdownButtonFormField<ThemeMode>` por
  `ThemeToggleTile` con la key `settings_theme` en el contenedor. Si un test interactúa con el dropdown,
  actualizar ese finder (mismo comportamiento: elegir modo y que persista).
- Verificar `settings_parity_test.dart` y cambio de tema en emulador.

### Fase B — Componentes compartidos (después de A; DS-05…DS-10 en paralelo, M/B)

#### DS-05 — Chips y avisos (B)
- Copiar `status_chip.dart`, `app_inline_notice.dart`, `app_button_styles.dart` a `lib/shared/widgets/`.
- `ColorPill` (en `color_dot.dart`): misma firma, implementación = `StatusChip` con `chipFill`/`chipText`.
- `ColorPalette`: los 16 colores de 2.1, swatches de 32 con check en `textOn(color)` (sin `Colors.white/black`).
  Mantener keys `color_$hex` (hex en minúscula como hoy) y `color_clear`.
- Crear `ErrorText` (`lib/shared/widgets/error_text.dart`): `Text` con `danger` 12/400. Reemplazar los
  13 `TextStyle(color: colorScheme.error)` (ver `grep -rn "colorScheme.error" lib`).

#### DS-06 — Estados: carga, vacío, error (B)
- Copiar `app_state_block.dart` y `app_error_widget.dart` (reemplazar `humanError` por `errorMessage`
  de `state_views.dart`).
- Crear `lib/shared/widgets/gen_skeleton.dart`: `GenSkeleton.text/.card/.circle`, shimmer
  `hover`→`border`→`hover` 1.4 s; estático si `disableAnimations`.
- En `state_views.dart` mantener `LoadingView`, `ErrorView({error,onRetry})`, `EmptyView({message,icon})`,
  `showErrorSnack`, `errorMessage` y la key `error_retry`; reimplementar adentro con lo anterior.
  EmptyView: ícono 48 `muted`, texto 13 `muted`, máx. 360 de ancho.
- `showErrorSnack`: SnackBar del tema + ícono de error a la izquierda (no overlay propio; evita timers en tests).

#### DS-07 — Diálogos (M)
- Copiar `adaptive_modal.dart`, `app_work_dialog.dart`, `app_work_header.dart`, `app_form_dialog.dart`,
  `picker_dialog.dart`. Footer sobre `field`, header con cerrar de 48.
- Reimplementar `confirmAction`, `showNameColorDialog`, `showReorderDialog` con `AppWorkDialog` dentro de
  `showAdaptiveModal`. Firmas y keys (`confirm_name`, `action_cancel`, `action_confirm`,
  `name_color_*`, `order_*`) sin cambios. `danger: true` → `AppButtonStyles.destructiveFilled`.
- Constantes de ancho: `AppGeometry.dialogNarrow = 400`, `dialogWide = 560`; reemplazar 400/420/440 sueltos
  de groups/sectors/settings/works.

#### DS-08 — Superficies y encabezados (M)
- Copiar `workspace_panel.dart` (Panel + ListPanel), `app_work_section.dart`, `app_work_box.dart`,
  `sector_card.dart`, `kpi_tile.dart`, `gen_section_header.dart` (en genstock está en `gen_tab_section.dart`;
  extraer solo el header si el resto no hace falta).
- Crear `lib/shared/widgets/brand_name.dart` desde `$GS/.../brand_name.dart`: "›gen" 600 `brand` + "work" 400 `text`.
- `PageIntro` → misma firma, render con estilo `GenSectionHeader` (caja 38 `brandFill`, ícono 22 `brand`,
  título 24/700, subtítulo 13 `muted`, borde inferior 1 `border`). `BrandHeader` usa `BrandName`.
- Crear `lib/shared/widgets/gen_page_scaffold.dart` (adaptado de `$GS/.../sector_scaffold.dart`):
  `GenPageScaffold({required title, IconData? icon, String? subtitle, List<Widget> actions = const [],
  bool showBack = false, Future<void> Function()? onRefresh, required Widget body, Widget? fab})`:
  AppBar 48 (botón drawer `AppDrawerButton` o `BackButton`, `BrandName` 16, `ThemeToggle` compacto opcional)
  + `GenSectionHeader` en el contenido + body con padding 16. No migra pantallas (eso es Fase D).

#### DS-09 — Búsqueda, filtros, tabs (M)
- Copiar `workspace_search_bar.dart` (incluye `WorkspaceFilterButton`), `gen_filter_chip_bar.dart`,
  `workspace_filters_drawer.dart` (panel de filtros derecho), `workspace_selector_bar.dart`, `workspace_input_theme.dart`,
  `app_dropdown_decoration.dart`, `field_suffix.dart`, y de `gen_tab_section.dart` solo `GenTabBar`.
- **Si** `GenFilterChip` no usa `ChoiceChip` internamente, dejar `ChoiceChip` donde los tests lo buscan
  (ver regla 5) y estilarlo vía `chipTheme`; usar `GenFilterChipBar` solo en filtros nuevos/no testeados.
- `TaskViewToggle`: mantener `SegmentedButton` y key `task_view_toggle`; estilo por tema (DS-03).

#### DS-10 — Contadores y progreso (B)
- Mover `PendingBadge` de `features/shell/` a `lib/shared/widgets/count_badge.dart` como `CountBadge`
  (pill, fondo `hover`, borde `border`, texto 11 `muted`, "999+", oculto en 0). Dejar en shell un
  `typedef`/wrapper si hace falta para no romper imports, o actualizar los 5 usos.
- `ProgressLine`: misma firma y semántica; track `outline`, relleno `ok` (por defecto) o `brand`
  (parámetro opcional `emphasis`), alto 4, radio completo; texto "3/5" en Mono 12 `muted`.

### Fase C — Piezas centrales (después de B, secuencial, M)

#### DS-11 — `TaskTile`, `TaskComposer`, `TaskTextField`
- `TaskTile`: card plana (`surface`, borde `border`, radio 8, padding 12), `Checkbox` radio 2,
  título 14/600 (tachado `muted` si completa), chips 4 px con `StatusChip`, "Te mencionan" → `StatusChip`
  tono `info`, fecha con `dueText/dueFill` en Mono, swipe: fondo `success` (completar) / `brandFill` (Mi día).
  Keys `task_<id>`, `task_toggle_<id>`, `task_day_<id>`, `task_swipe_<id>` intactas.
- `TaskComposer`: campo estilo input del tema, botón enviar `IconButton.filled` 40; spinner →
  `SizedBox(18) CircularProgressIndicator(strokeWidth 2)` con color `brand` (único spinner permitido).
- `TaskTextField`: resaltado con colores de tags de 2.1 (mantener `FontWeight.w600`, lo exige un test).

#### DS-12 — Drawer y shell
- Archivos: `features/shell/home_shell.dart`, `drawer_items.dart`, `drawer_resource_section.dart`.
- Referencias: `src/components/nav/DrawerNav.tsx` (orden e íconos) y `$GS/.../sector_sidebar.dart` (estilo).
- Drawer ancho `min(280, ancho-48)`, fondo `field`, borde derecho `border`. Cabecera: `BrandName` 16 +
  `ThemeToggle` compacto. Rótulo "ESPACIO DE TRABAJO" (`sectionLabel`). Perfil con avatar 32
  (sin foto: fondo `brand`, iniciales 12/600 `onBrand`).
- Ítems: `ListTile` (no cambiar tipo), alto ≥ 44, radio 6, ícono 16 `muted`; seleccionado: fondo `brandFill`,
  texto/ícono `brand` 600, `LeadingTickBorder` 3 px. Sublistas 13 px, línea izquierda 1 px `border`,
  `CountBadge` para pendientes. Pie: "Vence hoy" (campana) y Salir.
- Quitar los `Material(color: Colors.transparent)` pintados a mano: usar `ListTileTheme`/`shape`.
- Verificar `navigation_parity_test.dart` (incluye `nav_works.selected`, 360 dp / 1.5×).

#### DS-13 — Detalle de tarea a pantalla completa
- `features/tasks/task_detail_sheet.dart`: la función pública que hoy hace `showModalBottomSheet`
  (línea ~35) pasa a `Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(fullscreenDialog: true, builder: …))`.
  Mismo nombre y parámetros. Quitar `DraggableScrollableSheet`; el contenido va en un `Scaffold` con AppBar
  48 (cerrar `ValueKey('task_detail_close')`, título de la tarea) y cuerpo scrolleable con padding 16.
  Secciones con `AppWorkSection`. Estado con `ChoiceChip` (no cambiar tipo; key `task_status_*`).
  Botón borrar con `AppButtonStyles` destructivo (reemplaza `OutlinedButton.styleFrom(foregroundColor: error)`).
- No tocar `router/`. Verificar `daily_parity_test.dart` y todos los tests que abren el detalle.

### Fase D — Pantallas (después de C; todas en paralelo, B salvo indicación)

Patrón común para cada pantalla:
1. Pantallas raíz → `GenPageScaffold` (título, ícono `AppIcons`, acciones al header). Detalles → `showBack: true`.
2. Reemplazar `Icons.*` por `AppIcons.*`, colores sueltos por `context.colors`, números de espaciado por
   `AppSpace`/`AppSpacing`, `BorderRadius.circular(n)` por `AppGeometry`.
3. Listas agrupadas → `WorkspaceListPanel`; bloques → `WorkspacePanel`/`AppWorkSection`.
4. Búsqueda/filtros → `WorkspaceSearchBar` (+ `ChoiceChip` estilados donde haya tests).
5. Verificación propia: abrir la pantalla en emulador (skill `/flutter-ui`, Marionette) claro y oscuro,
   captura a `../.context/ds-XX/`, y el grep de la sección 6 sobre los archivos tocados = 0 resultados.

| Tarea | Archivos (`lib/features/…`) | Notas específicas |
|---|---|---|
| DS-14 | `setup/server_setup_screen.dart`, `auth/login_screen.dart` | Sin drawer. `BrandName` 28 centrado, ancho máx. 480, error con `AppInlineNotice.error` |
| DS-15 | `my_day/my_day_screen.dart` | Header con fecha (Mono), secciones "Pendientes / Te mencionan / Completadas hoy" con `sectionLabel`; colapsable conserva key |
| DS-16 (M) | `works/works_list_screen.dart`, `works_filter*` | Cards de proyecto: `surface`, radio 8, padding 16, borde → `brand` al presionar, `ProgressLine` (ok), etapa con borde 1.5 `currentColor`, vencimiento verde/naranja/rojo (>7 / 1–7 / ≤0 días, como `dashboardUtils.ts`), estrella `favorite`. `ChoiceChip` del filtro se mantiene |
| DS-17 (M) | `works/work_detail_screen.dart`, `create_work_dialog.dart`, `edit_work_dialog.dart`, `work_metadata_dialog.dart`, `work_actions_menu.dart` | Resumen en un panel (identidad, descripción, avance `brand`, fecha), tabs con `GenTabBar` 3 px, diálogos con `AppWorkDialog`, menú `floating` radio 10, ítem peligro `danger`/`dangerFill` |
| DS-18 | `sectors/*` | Grilla/lista de sectores con `ColorDot`, `CountBadge`, ámbito `StatusChip`; form con `ColorPalette` |
| DS-19 | `board/board_screen.dart` | Columnas por sector con header + progreso; separadores solo entre tareas |
| DS-20 | `notes/*` | Lista con preview 2 líneas `muted`; editor en panel; aviso "nota con formato" con `AppInlineNotice` |
| DS-21 (M) | `documents/*` + `assets/editor/index.html` | Además: reemplazar colores del CSS del editor TipTap por los tokens 2.1 (claro/oscuro), radio 6, Montserrat 13. Spinner de `rich_document_editor.dart` → `GenSkeleton` |
| DS-22 | `files/*` | `StorageError` local → `AppErrorWidget`/`AppInlineNotice`; 8 espaciados sueltos |
| DS-23 | `groups/*` | Detalle en paneles (miembros, clientes, etiquetas, proyectos); `FilledButton.styleFrom(error)` → `AppButtonStyles` |
| DS-24 | `objectives/*` | Templates en `WorkspaceListPanel`; diálogos `AppWorkDialog` |
| DS-25 (M) | `reminders/*` | Calendario: celdas con `AppGeometry.card`, día actual con lengüeta 3 px `brand`, alcance INDIVIDUAL `success`, GROUP `info`, GLOBAL `danger`; `FilterChip` → estilo tema; formulario con secciones `AppWorkSection` |
| DS-26 (M) | `settings/*` | El más sucio: 21 espaciados, `Colors.*`, `Color(int.parse…)` → `colorFromHex` + `ColorDot`; paleta duplicada → `ColorPalette` compartida; secciones en `WorkspaceListPanel`; `ThemeToggleTile` ya puesto en DS-04 |
| DS-27 | `account/*` | Avatar 32/48, servidor en Mono, `LogoutTile` con color `danger` |

### Fase E — Cierre (secuencial, M)

#### DS-28 — Guardia de tokens (test)
- Crear `test/design_tokens_guard_test.dart` que recorre `lib/features/**` y `lib/shared/**` y falla si
  encuentra: `Colors.` (excepto `Colors.transparent`), `Color(0x`, `Color(int.parse`,
  `BorderRadius.circular(` con número literal, `showModalBottomSheet`, `Icons.` (fuera de
  `lib/core/theme/app_icons.dart`). Mensaje con archivo:línea. Debe pasar en verde.

#### DS-29 — Nativo
- `flutter_native_splash`: fondos `#F4F5F8` / `#0C0C0C` (ya está; verificar).
- Ícono: hoy `#2563EB` (igual al favicon web). **No cambiar** salvo pedido del usuario; anotarlo en Hallazgos.

#### DS-30 — QA visual y documentación
- `flutter test --dart-define=UI_PREVIEWS=true` → capturas a `../.context/ds-final/`; comparar contra
  `ds-baseline` y contra `design-system/genwork/mockups/*-neutral.png`.
- Recorrido en emulador Android con `/flutter-ui`: login, drawer, Mi día, proyecto, detalle de tarea
  (pantalla completa), sector, notas, recordatorios, configuración (cambio claro/oscuro/sistema), 360 dp y 1.5×.
- Actualizar `mobile/PLAN.md` (Fase 6 ✅ con conteo de tests) y agregar sección "Móvil" en
  `design-system/genwork/GENSTOCK_PARITY.md` con qué se portó y dónde vive.

## 5. Estado

| Tarea | Fase | Modelo | Depende de | Estado |
|---|---|---|---|---|
| DS-00 | A | M | — | ✅ 2026-10-09 — `dart analyze` 0 issues; `flutter test` 205 verdes; con `UI_PREVIEWS=true` 209 verdes (+4 capturas) |
| DS-01 | A | M | DS-00 | ✅ 2026-10-09 — 211 tests verdes (+6 en `gen_colors_test.dart`) |
| DS-02 | A | M | DS-01 | ⬜ |
| DS-03 | A | M | DS-02 | ⬜ |
| DS-04 | A | M | DS-03 | ⬜ |
| DS-05…DS-10 | B | B/M | DS-04 | ⬜ (paralelo) |
| DS-11 | C | M | B | ⬜ |
| DS-12 | C | M | DS-11 | ⬜ |
| DS-13 | C | M | DS-11 | ⬜ |
| DS-14…DS-27 | D | B/M | C | ⬜ (paralelo) |
| DS-28 | E | M | D | ⬜ |
| DS-29 | E | B | D | ⬜ |
| DS-30 | E | M | DS-28, DS-29 | ⬜ |

## 6. Comandos de verificación

```sh
cd mobile
dart format lib test && dart analyze && flutter test
flutter test --dart-define=UI_PREVIEWS=true      # capturas en ../.context/
# grep de valores sueltos (sobre los archivos que tocaste; debe dar 0):
grep -nE "Colors\.(?!transparent)|Color\(0x|Color\(int\.parse|BorderRadius\.circular\([0-9]|showModalBottomSheet|Icons\." -P <archivos>
# tipos que los tests buscan:
grep -rn "byType(" test/ | grep -oE "byType\([A-Za-z<>]+\)" | sort | uniq -c
```

## 7. Hallazgos

(El agente anota acá lo que vio fuera de su tarea: tarea, archivo:línea, problema.)

- DS-00: las capturas `UI_PREVIEWS` salen a `../.context/` (no a una carpeta propia): `drawer-{light,dark}.png`
  (`ui_phase3_test.dart`) y `nav02/{drawer,sectors}-{light,dark}.png` (`navigation_parity_test.dart`).
  Línea de base copiada a `../.context/ds-baseline/` (mismos nombres). `phase3-*.png` son capturas de emulador viejas, no las genera el test.
- DS-01: `dart format lib test` reformatea archivos ajenos a la tarea (`lib/core/auth/`, `lib/data/`, `lib/main.dart`, varios tests),
  que están fuera de alcance. Formateá solo lo que tocaste (`dart format <archivos>`) y no commitees el resto.
