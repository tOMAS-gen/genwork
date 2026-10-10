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
5. **Comparar con la web** (decisión del usuario, 2026-10-10): abrir la misma pantalla de la web a 390 px y comparar aspecto por aspecto (estructura, tamaños, colores, textos);
   **la web manda**. Cómo: en una pestaña del servidor dev (`localhost:3011`), `document.body.innerHTML = '<iframe src="/RUTA" style="width:390px;height:780px">'`
   (el ancho de la ventana no se puede achicar; el iframe sí activa los estilos mobile). Para `/login` con sesión iniciada: `fetch('/login',{credentials:'omit'})` y `iframe.srcdoc = html` con `<base href="http://localhost:3011/">`.
   Guardar la captura web junto a la del app en `../.context/ds-XX/` y medir valores con `getComputedStyle` cuando haya dudas.
6. Verificación propia: abrir la pantalla en emulador (skill `/flutter-ui`, Marionette) claro y oscuro,
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
| DS-02 | A | M | DS-01 | ✅ 2026-10-09 — 217 tests verdes (+6 en `theme_tokens_test.dart`) |
| DS-03 | A | M | DS-02 | ✅ 2026-10-09 — 217 tests verdes; con `UI_PREVIEWS=true` 221; capturas en `../.context/ds-03/` |
| DS-04 | A | M | DS-03 | ✅ 2026-10-09 — 217 tests verdes; con `UI_PREVIEWS=true` 221; cambio de tema verificado en emulador |
| DS-05 | B | B | DS-04 | ✅ 2026-10-10 — 224 tests verdes (+7 en `test/shared/chips_notices_test.dart`); con `UI_PREVIEWS=true` 228 |
| DS-06 | B | B | DS-04 | ✅ 2026-10-10 — 233 tests verdes (+9 en `test/shared/state_views_test.dart`); con `UI_PREVIEWS=true` 237 |
| DS-07 | B | M | DS-04 | ✅ 2026-10-10 — 244 tests verdes (+11 en `test/shared/dialogs_test.dart`); con `UI_PREVIEWS=true` 248 |
| DS-08 | B | M | DS-04 | ✅ 2026-10-10 — 256 tests verdes (+12 en `test/shared/surfaces_test.dart`); con `UI_PREVIEWS=true` 260 |
| DS-09 | B | M | DS-04 | ✅ 2026-10-10 — 267 tests verdes (+11 en `test/shared/search_filters_tabs_test.dart`); con `UI_PREVIEWS=true` 271 |
| DS-10 | B | B | DS-04 | ✅ 2026-10-10 — 273 tests verdes (+5 en `test/shared/count_progress_test.dart`); con `UI_PREVIEWS=true` 277 |
| DS-11 | C | M | B | ✅ 2026-10-10 — 280 tests verdes (+7 en `test/shared/task_widgets_test.dart`, +1 en `gen_colors_test.dart`); con `UI_PREVIEWS=true` 284 |
| DS-12 | C | M | DS-11 | ✅ 2026-10-10 — 282 tests verdes (+2 en `navigation_parity_test.dart`); con `UI_PREVIEWS=true` 286; capturas en `../.context/ds-12/` |
| DS-13 | C | M | DS-11 | ✅ 2026-10-10 — 284 tests verdes (+2 en `ui_phase3_test.dart`); con `UI_PREVIEWS=true` 288; captura en `../.context/ds-13/` |
| DS-14 | D | B | C | ✅ 2026-10-10 — 295 tests verdes (+11 en `test/features/auth_screens_test.dart`); con `UI_PREVIEWS=true` 299; comparada con la web a 390 px |
| DS-15 | D | B | C | ✅ 2026-10-10 — 297 tests verdes (+2 en `daily_parity_test.dart`); con `UI_PREVIEWS=true` 301; comparada con la web (3 iteraciones) |
| DS-16 | D | M | C | ✅ 2026-10-10 — 305 tests verdes (+8 en `works_dashboard_test.dart`, +2 en otros); con `UI_PREVIEWS=true` 309; comparada con la web (3 iteraciones) |
| DS-17 | D | M | C | ✅ 2026-10-10 — 308 tests verdes (+3 en `ui_phase3_test.dart`); con `UI_PREVIEWS=true` 312; comparada con la web (2 iteraciones) |
| DS-18 | D | B | C | ✅ 2026-10-10 — 311 tests verdes (+3 en `ui_phase3_test.dart`); con `UI_PREVIEWS=true` 315; comparada con la web (lista y detalle) |
| DS-19 | D | B | C | ✅ 2026-10-10 — 312 tests verdes (+1 en `day_overview_test.dart`); con `UI_PREVIEWS=true` 316; comparada con la web (`/board`) |
| DS-20…DS-27 | D | B/M | C | ⬜ (paralelo) |
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
- DS-03: se dejó un `bottomSheetTheme` mínimo en `app_theme.dart` (marcado `TODO(DS-13)`) porque `task_detail_sheet.dart:35`
  todavía usa `showModalBottomSheet`; quitarlo en DS-13 cuando el detalle pase a pantalla completa.
- DS-03: el chip "Pendiente" de `TaskTile` se ve con tracking ancho porque usa `textTheme.labelSmall` (ahora `sectionLabel`, 11/700/1.2 tracking).
  Se corrige en DS-05/DS-14 cuando pase a `StatusChip`.
- DS-03: el `Drawer` oscuro se ve `#1C1C1C` (`surface`) y no `field` (`#151515`): el widget de `home_shell.dart` fija su propio fondo. Revisar en la tarea del drawer.
- DS-03: el `AppBar` bajó de 72 a 48 dp de alto, y `ListTile`/`ExpansionTile` conservan su padding de 16 (`AppSpace.page`); afinar en las tareas de pantallas.
- DS-04: `ThemeToggleTile` es un `ListTile` (título "Apariencia", subtítulo "Tema: X", `ThemeToggle` como trailing), no el tile-que-cicla de genstock;
  no se portaron `ThemePopupButton` ni `ThemeAppearanceButton` (dependen de `picker_dialog` y no se usan en genwork). Íconos nuevos en `AppIcons`: `themeSystem/Light/Dark`.
  El finder de `settings_parity_test.dart` (CFG-02) pasó de elegir en el dropdown a tocar `theme_dark`; mismo comportamiento verificado.
- DS-05: `ColorPalette` ofrece `#3b5bfa` (color por defecto, `ColorPalette.defaultColor`) además de los 16 de `palette.ts`: la paleta vieja lo tenía
  como primer swatch y `groups_parity_test.dart` lo toca (`color_#3b5bfa`). Son 17 swatches visibles.
- DS-05: no se portaron `DeviceStatusChip`, `UserStatusChip`, `StockStatusChip` ni `SupplierOrderStatusChip` (dominio genstock); sí `InfoChip`.
  `ErrorText` reemplazó 14 `Text` con `colorScheme.error` (los usos como color de ícono/botón — `logout_tile`, `task_detail_sheet`, `group_labels_screen:254`,
  `action_confirmation_dialog:116`, `state_views:76` — quedan para sus tareas).
- DS-05: en el emulador, el chip de estado seleccionado del detalle de tarea ("Pendiente", `ChoiceChip`) se ve apagado en oscuro (texto `brand` sobre `brandFill`);
  revisar en DS-13 si es el estilo deshabilitado o un contraste bajo.
- DS-06: genstock no tiene skeleton; `GenSkeleton` es nuevo (`gen_skeleton.dart`, un controller por bloque; sin ticker si `disableAnimations`).
  Un `pumpAndSettle` con un `LoadingView` visible se cuelga (shimmer infinito): ningún test actual lo hace, pero tests nuevos deben usar `pump(duration)` o `disableAnimations`.
- DS-06: `AppBlockHeights` (state 240 / errorState 280) vive en `app_geometry.dart`; `ErrorView` ahora usa `FilledButton.icon` (antes `OutlinedButton`), misma key `error_retry`.
- DS-07: `confirmAction`, `showNameColorDialog` y `showReorderDialog` usan `AppWorkDialog` con `showAppFormDialog` (un `showDialog`), no anidado en `showAdaptiveModal`:
  `AppWorkDialog` ya trae su propio `Dialog` + header, y anidarlo duplicaría el header. `showAdaptiveModal` se portó para contenido grande con footer propio (sin usos todavía).
  Se quitó la rama "hoja inferior" de `AppWorkDialog` (genwork no tiene bottom sheets); `AppGeometry.sheet` no existe.
- DS-07: `AppGeometry.dialogNarrow = 400` reemplazó los `width: 400/420/440` de settings, sectors, groups y works (en teléfono no cambia nada: el diálogo se acota al ancho de pantalla);
  `dialogWide = 560` lo usa `showReorderDialog` (antes 480) y `showAdaptiveModal`. Siguen siendo `AlertDialog` propios, para sus tareas: `settings_screen`, `settings_form_dialog` (paleta de 8 colores duplicada),
  `storage_settings`, `sector_form_dialog`, `sector_actions_menu`, `task_detail_sheet:124`, `task_move_dialog`, `objective_dialog`, `objective_actions_menu`, `group_clients_screen`, `member_dialog`, `work_metadata_dialog`, `edit_work_dialog`.
- DS-08: `SectorCard` de genstock se portó como `SectionCard` (`section_card.dart`): en genwork "sector" es un concepto de dominio. `GenSectionHeader` va aplanado (no es una card
  como en genstock): título + borde inferior `border`, con `subtitle` y `bottom` opcionales; vive en `gen_section_header.dart`. `WorkspacePanel` perdió `minWidth` (solo teléfono).
  `kWorkGap` (10) se reemplazó por `AppSpacing.sm` (12). `AppDrawerButton` pasó a `AppIcons.menu`.
- DS-08: `GenPageScaffold` deja el header fijo y el `body` expandido; con `onRefresh` el `body` debe ser un scrollable. Aún no se migró ninguna pantalla (Fase D):
  hoy "Mi día" muestra el título dos veces (AppBar "Mi día" + `PageIntro` con la fecha) porque `PageIntro` ahora es un `GenSectionHeader` de 24/700.
- DS-08: `BrandHeader` (login/setup) muestra el logo `genwork.png` junto a `BrandName(22)`; DS-14 lo reemplaza por `BrandName 28` centrado.
- DS-09: `GenFilterChipBar` usa `TextButton` (no `ChoiceChip`), así que los `ChoiceChip` que los tests buscan (`task_status_*`, filtro de proyectos) quedan intactos y se estilan por `chipTheme`;
  `TaskViewToggle` no se tocó (`SegmentedButton` + key `task_view_toggle`, estilo por tema desde DS-03; aún usa `Icons.list`/`Icons.view_column_outlined` sueltos para su tarea).
- DS-09: `GenTabBar` se portó solo con sus modelos (`GenTabItem` = `GenTabSectionItem` sin contenido, `GenTabAction`); en estilo `quiet` la pestaña activa lleva 3 px `brand` (`kActiveTickWidth`),
  sin íconos (teléfono). Ninguna pantalla usa aún estos widgets: se estrenan en Fase D (`WorkspaceSearchBar`, `GenFilterChipBar`/`WorkspaceSelectorBar`, `GenTabBar`, `showWorkspaceFiltersDrawer`).
- Pedido del usuario (entre DS-09 y DS-10): el drawer ya no lleva el ícono `genwork.png`; la cabecera muestra `BrandName(size: 20)` («›gen» `brand` + «work» `text`). Los capturadores `UI_PREVIEWS`
  de `ui_phase3_test.dart` y `navigation_parity_test.dart` dejaron de precargar/buscar la imagen. DS-11 (drawer) puede ajustar el tamaño (el plan decía 16).
- DS-10: `PendingBadge` pasó a `CountBadge` (`shared/widgets/count_badge.dart`) sin typedef: se actualizaron los usos en `home_shell.dart`/`drawer_resource_section.dart` y los
  imports/tipos de `navigation_parity_test.dart` y `day_overview_test.dart` (renombre, mismo comportamiento). `ProgressLine` suma `emphasis` (relleno `brand`); ningún uso lo activa todavía.
- DS-11: `context.colors` ahora cae a `GenColors.light/dark` según el brillo si el tema no trae la extensión (un `MaterialApp` pelado en `objectives_parity_test.dart` rompía `TaskTextController`).
  `readableOn(bg)` (en `color_contrast.dart`) elige entre `#111111` y `#FFFFFF` por mayor contraste: `textOn` deja blanco sobre `success` (`#22C55E`) con 2.3:1; el ícono del swipe de completar usa `readableOn`.
- DS-11: el vencimiento de `TaskTile` pasó de la línea de meta a un `StatusChip(mono: true)` con `dueText/dueFill` (`StatusChip` suma `mono`); la línea de meta conserva proyecto/sector/padre/subtareas (el test busca `1/2 subtareas` exacto).
  Resaltado de `TaskTextController`: `/`→`tagWork`, `#`→`tagExec`, `@`→`tagRef`, `$`→`tagLabel`, fecha→`dueText` (como `TagHighlightInput.tsx`); no se usó `tagUser` (la web lo aplica si `@nombre` es un usuario conocido; el móvil no lo sabe al tipear).
- DS-12: el `ThemeToggle` NO se puso en la cabecera del drawer: sus 3 objetivos de 48 (144 dp) no entran junto a la marca y el cierre en 280 dp, y los tests de navegación no proveen
  `sharedPreferencesProvider`. El cambio de tema sigue en Configuración (DS-04). La marca del drawer es `BrandName(size: 16, scaleDownToFit: true)`.
- DS-12: nuevo `features/shell/drawer_tile.dart` (`DrawerTile`: `ListTile` con ícono 16, `selectedTileColor` brandFill y `LeadingTickBorder` activo; `compact` = sublistas 13 px, alto 44); reemplaza los
  `Material(color: ...)` pintados a mano de `home_shell.dart` y `drawer_resource_section.dart`. Ítems de primer nivel miden 48 (antes 56), sublista 44 (antes 48). `LogoutTile` (drawer y cuenta) alinea ícono/título con los ítems.
- DS-12: "Pie: Vence hoy y Salir" se dejó como estaba (Mi cuenta · Configuración · Vence hoy · Cerrar sesión): reordenar cambiaría la navegación. El host del servidor sigue al final.
- DS-13: la key de cierre se mantiene `task_close` (el plan decía `task_detail_close`): la regla 4 manda conservar las keys y `objectives_parity_test.dart:395` la busca. `showTaskDetail` conserva nombre y parámetros
  y devuelve `Future<void>`; ahora hace `Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(fullscreenDialog: true))`. `TaskDetailSheet` conserva su nombre (tests) y devuelve un `Scaffold`.
- DS-13: `AppWorkBox` envuelve su hijo en un `Material` transparente (los `ListTile`/`SwitchListTile`/`CheckboxListTile` dentro de una sección lanzaban "background color or ink splashes may be invisible").
  Se quitó el `bottomSheetTheme` provisorio de `app_theme.dart`. `AppButtonStyles.destructiveOutlined` reemplaza el `OutlinedButton.styleFrom(foregroundColor: error)` del botón borrar (key `task_delete`).
- DS-13: el chip del estado vigente (`task_status_<id>`) ahora tiene `onSelected: (_) {}` (antes `null`): con `null` el `ChoiceChip` seleccionado se pintaba atenuado como deshabilitado. Sin permiso o con tarea contenedor sigue `null`
  para todas las opciones. Tareas con confirmación de borrado (`AlertDialog`, key `task_delete_confirm`) y los `ActionChip` de origen/links siguen como estaban (Fase D / diálogos).
- DS-14 (comparada con la web a 390 px): la web usa una card `surface` (borde `border`, radio 8, padding 16) centrada en una página con padding 24, marca «›genwork» de 24 px, bajada 13 `muted`
  («Gestión de proyectos por cliente y sector») y botón primario de 47 px, radio 6, texto `onBrand` 13/600. Se replicó con `AuthCard` (`shared/widgets/auth_card.dart`, ancho máx. 480) en login y setup;
  se quitaron el titular «Tu equipo, a mano.», el ícono del botón y `BrandHeader` (sin usos). El plan decía `BrandName` 28: la web usa 24 y gana la web. Capturas: `../.context/ds-14/` (`web-login-390.jpg` vs `login-{light,dark}.png`).
  Los errores van en `AppInlineNotice.error` (en setup ya no usan `errorText` del campo). El host del servidor y «Cambiar servidor» son del app (no existen en la web).
- DS-15 (comparada con la web, ruta `/references`, 4 iteraciones): la web no tiene secciones «Pendientes / Te mencionan» ni fecha: es UNA card (`.reference-panel`) con filas separadas por líneas; cada fila lleva
  arriba «☼ Mi día» o «@ Referencia» (+ «· Referencia» si es ambas) y el origen como enlace `muted`; la línea de progreso es «☼ Mi día: **0 de 1** completadas hoy» sin barra; el título es «Mi día y referencias» con la bajada
  «Primero lo que hay que hacer hoy, después las tareas que necesitan tu aporte.»; el vacío dice «No tenés tareas para hoy ni referencias pendientes». Se replicó con `GenPageScaffold` + `WorkspaceListPanel` + `TaskTile(flat: true)`.
  El plan decía «header con fecha»: la fecha NO está en la web, pero se mantiene en Mono 12 `muted` sobre la línea de progreso porque `daily_parity_test` (QA10, zona horaria) la exige.
- DS-15: `TaskTile` ajustado a la web: título 13/400 (no 14/600), pill de estado solo si hay más de 2 estados (`statusOptions.length > 2`, como `TaskItem.tsx`), ícono de «Mi día» activo en ámbar (`warning`, como `--color-warning`); `flat` quita
  el marco de card para filas dentro de un panel. `GenPageScaffold` suma `appBarActions` (la campana va en el AppBar: en el header partía el título en 2 líneas). `LoadingView` va pegado arriba (2 cards con texto grande).
  Diferencias que quedan vs. la web: la web muestra «+» (subtarea) y «✕» (borrar) en cada fila y el ícono de tema arriba a la derecha; el app usa swipe, el detalle y la campana. Capturas: `../.context/ds-15/`.
- DS-16 (comparada con la web `/` a 390 px): la web arma la pantalla con encabezado (caja de ícono + «Todos los Proyectos» + botón «+» a la derecha), estadísticas en 2×2 (cifra Mono 24/700 y «Total · 100%» Mono 14 muted, card `surface` padding 16),
  un panel de herramientas (búsqueda 40 px sobre `field`, «Filtros», orden y vista grilla/lista, y «N proyectos» abajo) y `ProjectCard`s: píldora con el nombre en MAYÚSCULAS (color del proyecto o `hover`), estrella, «Grupo X»/«Personal», etiquetas,
  «Entrega: fecha» + urgencia en cursiva (verde >7 días, naranja 1–7, rojo hoy/vencido), barra de 8 px `ok` con su %, y «d/t tareas». Se replicó con `GenPageScaffold` (el «+» pasó del FAB al header, key `works_create`), `WorkCard` (`work_card.dart`) y
  `works_dashboard.dart` (`projectStatus`, `WorksStats`, `dueUrgency`: mismas reglas que `dashboardUtils.ts`). Sin equivalente en el app (se omitieron): el menú «···» de la card, el orden y el switch grilla/lista; el app mantiene sus chips Todos/Mis proyectos/Favoritos, Activos/Archivados y el filtro por grupo dentro del panel.
- DS-16: **hallazgo global**: el texto del app heredaba `letterSpacing: 0.25` del tema de Material (la web usa 0) y salía más ancho (el título «Todos los Proyectos» se partía en 2 líneas). `AppTextStyles` y los roles del `textTheme` ahora fijan `letterSpacing: 0` (salvo `sectionLabel`, 1.2),
  y `BrandName` también. `GenSectionHeader` mide el título con 4 px de margen. Con las estadísticas arriba, controles y cards quedan bajo el pliegue: `ui_phase3_test.dart` desplaza con `scrollUntilVisible(finder.hitTestable())` antes de tocar el filtro de grupo y la card (cambio de estructura, mismo comportamiento).
  Los tests `LoadingView`... ver DS-15. Capturas: `../.context/ds-16/` (`web-proyectos-390.jpg` vs `app-v3.png`).
- DS-17 (comparada con la web `/works/<id>` a 390 px): migas «Todos los proyectos / Nombre»; card de resumen (`.work-overview`): símbolo 36×36 con el color del proyecto al 12 %, nombre 20/700, «Espacio personal / Grupo X» + estado en un contorno (Activo / Archivado / Plantilla de objetivo),
  kebab de acciones, «Descripción» (solo si hay), Avance (20/600 + «d de t completadas» + barra de 5 px `brand` sobre `outline`) junto a «Fecha límite» (botón con ícono), y sobre `field`: «Etiquetas» (etapa + etiquetas), «Código / carpeta» en Mono + botón «Copiar»;
  luego una card con pestañas Tareas · Documentos · Archivos (ícono + rótulo, lengüeta de 3 px `brand` en la activa), título «Tareas» + «N pendientes», «Nuevo objetivo», toggle Lista/Tablero y secciones: rótulo «TAREAS GENERALES» (`sectionLabel`) y, por objetivo, bloque con acento de 3 px a la izquierda
  (`brand`, `ok` si está completo), título, pill «Completo», kebab y barra con «d/t · %». Se replicó con `WorkSummaryPanel` (`work_summary.dart`), `GenTabBar(showIcons: true)`, `WorkspacePanel`, `TaskTile(flat)` con líneas entre filas y `AppBar` con `BrandName` (el kebab pasó del AppBar a la card, como en la web).
  Documentos y Archivos siguen siendo pantallas propias: tocar su pestaña hace `push` (en la web cambian el contenido en el lugar). Se omitieron del app (datos que la web edita en línea): editar descripción/fecha en el lugar (se hace desde «Editar proyecto») y la fecha con borde punteado (Flutter no lo trae: va sólido).
  El compositor de tareas sigue acoplado abajo (patrón móvil) y no en línea como en la web. `projectColor()` (en `works_dashboard.dart`) replica `WorkSummary.color` para `WorkDetail` (no se toca `lib/data/`).
- DS-17: `create_work_dialog`, `edit_work_dialog` y `work_metadata_dialog` pasaron de `AlertDialog` a `AppWorkDialog` (`showAppFormDialog`), keys y textos intactos; la acción «Eliminar» del menú del proyecto va en `danger` tras un `PopupMenuDivider`.
  Tests ajustados por estructura: `resource_operations_test.dart` (`menu()` toca `find.text(action).last`, porque «Etiquetas» ahora también es un rótulo del resumen) y `objectives_parity_test.dart` (`scrollTo('objective_create')` antes de tocarlo a 1.5×). `TaskViewToggle` suma `padding` (cero dentro del panel).
  Capturas: `../.context/ds-17/` (`web-detalle-top-390.jpg` / `web-detalle-bottom-390.jpg` vs `app-v2.png`).
- DS-18 (comparada con la web `/sectors` y `/sectors/<id>` a 390 px): lista = encabezado «Sectores» + «Tareas y proyectos organizados por área de trabajo.» + «+» (key `create_sector`, ya no FAB), panel de herramientas (búsqueda, ámbito, orden, «N sector(es)», «Contraer todo»),
  encabezado de ámbito (`Material` con `LeadingTickBorder` brand, chevron, ícono, «PERSONAL (n)» en `sectionLabel`, key `sectors_section_<key>`) y card de sector (`NamePill` con el color del sector, «N pendientes · M tareas» y `CardProgress`).
  Detalle = migas «Sectores / nombre» (`Breadcrumb`, ahora compartido con el detalle de proyecto), `SectorSummaryPanel` (símbolo del color del sector, nombre 20/700, «Espacio personal»/ámbito, kebab, «Avance del sector» con «Sin tareas» o «N %» + «d de t completadas», y sobre `field`
  «N proyectos vinculados» + «Color del sector»), y una card «Tareas» con «N pendientes», toggle Lista/Tablero a la derecha, filtro Pendientes/Hechas/Todas (key `sector_filter`), rótulos SUELTAS / nombre de proyecto / MENCIONES y filas planas con líneas; vacío con el texto de la web.
  El formulario de sector y el diálogo de impacto de eliminación pasaron a `AppWorkDialog`; «Eliminar sector» va en `danger` tras un `PopupMenuDivider`. Nuevos compartidos: `NamePill` (extraído de `WorkCard`), `CardProgress` (barra 8 px + % + «d/t tareas») y `Breadcrumb`.
  Omitido del app (la web lo tiene): «Filtros», el switch grilla/lista y el orden en una sola fila; el app apila ámbito y orden como `DropdownButtonFormField` (keys `sectors_scope_*` / `sectors_sort`). Test ajustado por estructura: `resource_operations_test` busca el nombre dentro de `SectorSummaryPanel` (ahora sale también en las migas).
  Capturas: `../.context/ds-18/` (`web-lista-390.jpg` / `web-detalle-390.jpg` vs `app-lista.png` / `app-detalle.png`).
- DS-19 (comparada con la web `/board` a 390 px): encabezado «Vista de tareas» + «Avance y pendientes de cada sector.» (ícono `dashboard`), una línea «N tareas pendientes · M sectores» ↔ «D de T finalizadas» (sin barra global: la web no la tiene),
  y por sector una card con acento de 3 px del color del sector, nombre 14/700, conteo de pendientes en un cuadro de contorno, «D de T finalizadas» / «Sin tareas asignadas» / «Avance en las subtareas» + barra de 4 px, y un pie sobre `field` con las pendientes (líneas entre filas) o «Sin tareas pendientes.».
  Keys intactas (`board_summary`, `board_sector_<id>`, `board_open_sector_<id>`, `board_task_<sector>_<tarea>`). El resumen usa `Wrap` (a 360 dp / 1.5× el `Row` desbordaba 4 px).
- DS-19: íconos igualados a la web: Vista de tareas = `dashboard`, Sectores = `layers` (`AppIcons.sectors`, también en el drawer; antes `view_column`) y el toggle Lista/Tablero usa `AppIcons.list` / `AppIcons.gridView`. Capturas: `../.context/ds-19/`.
