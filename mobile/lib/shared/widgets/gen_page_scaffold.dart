// Adaptado de genstock: frontend/lib/features/shell/presentation/widgets/sector_scaffold.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import 'app_drawer_scope.dart';
import 'brand_name.dart';
import 'gen_section_header.dart';
import 'theme_toggle.dart';
import 'content_width.dart';

/// Marco de una pantalla de genwork móvil: AppBar de 48 con el botón del
/// drawer (o `BackButton`) y la marca, [GenSectionHeader] compacto (título,
/// subtítulo y acciones, sin tile ni regla) y el [body] debajo
/// con el margen de página (16 dp en los cuatro lados). Como
/// en la web, el encabezado se desplaza con el contenido: si el [body] es un
/// scrollable sin controller propio, comparte el desplazamiento con el
/// encabezado (`NestedScrollView`).
///
/// [onRefresh] envuelve el [body] en un `RefreshIndicator`: en ese caso el
/// [body] debe ser un scrollable (p. ej. un `ListView`), que siempre permite
/// el gesto (`AlwaysScrollableScrollPhysics`).
class GenPageScaffold extends StatelessWidget {
  const GenPageScaffold({
    super.key,
    required this.title,
    required this.body,
    this.subtitle,
    this.count,
    this.breadcrumb,
    this.actions = const [],
    this.showBack = false,
    this.showThemeToggle = false,
    this.appBarActions = const [],
    this.onRefresh,
    this.fab,
    this.headerBottom,
    this.top,
    this.bodyPadding = const EdgeInsets.all(AppSpacing.md),
  });

  final String title;
  final String? subtitle;

  /// Cantidad junto al título (ver [GenSectionHeader.count]).
  final int? count;

  /// Miga arriba del título (subpantallas del proyecto).
  final Widget? breadcrumb;
  final List<Widget> actions;
  final bool showBack;

  /// Muestra el [ThemeToggle] en el AppBar.
  final bool showThemeToggle;

  /// Acciones del AppBar (a la derecha de la marca), p. ej. la campana.
  final List<Widget> appBarActions;
  final Future<void> Function()? onRefresh;
  final Widget body;
  final Widget? fab;

  /// Área bajo el encabezado (tabs, filtros).
  final Widget? headerBottom;

  /// Área sobre el encabezado (la barra de secciones de Configuración, que en
  /// la web va arriba del título).
  final Widget? top;
  final EdgeInsets bodyPadding;

  @override
  Widget build(BuildContext context) {
    final content = Padding(padding: bodyPadding, child: body);
    return Scaffold(
      appBar: AppBar(
        leading: showBack ? const BackButton() : const AppDrawerButton(),
        title: const BrandName(size: 16),
        actions: [
          ...appBarActions,
          if (showThemeToggle) const ThemeCycleButton(),
        ],
      ),
      floatingActionButton: fab,
      body: ContentWidth(
        child: NestedScrollView(
          headerSliverBuilder: (context, _) => [
            if (top != null) SliverToBoxAdapter(child: top),
            SliverToBoxAdapter(
              child: GenSectionHeader(
                title: title,
                subtitle: subtitle,
                count: count,
                breadcrumb: breadcrumb,
                actions: actions,
                bottom: headerBottom,
              ),
            ),
          ],
          // Edge-to-edge (targetSdk 36): el contenido no queda bajo la barra de
          // navegación ni bajo un recorte lateral (T6). El fondo sí pasa.
          body: SafeArea(
            top: false,
            child: onRefresh == null
                ? content
                : RefreshIndicator(onRefresh: onRefresh!, child: content),
          ),
        ),
      ),
    );
  }
}
