import 'package:flutter/material.dart';

import '../../core/theme/app_icons.dart';

/// Permite abrir el menú del shell desde los Scaffold de cada sección.
class AppDrawerScope extends InheritedWidget {
  const AppDrawerScope({
    super.key,
    required this.openDrawer,
    required super.child,
    this.permanent = false,
  });

  final VoidCallback openDrawer;

  /// El menú está fijo al costado (ventanas anchas, T7): no hace falta el
  /// botón para abrirlo.
  final bool permanent;

  static AppDrawerScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppDrawerScope>();

  @override
  bool updateShouldNotify(AppDrawerScope oldWidget) =>
      oldWidget.openDrawer != openDrawer || oldWidget.permanent != permanent;
}

class AppDrawerButton extends StatelessWidget {
  const AppDrawerButton({super.key});

  @override
  Widget build(BuildContext context) {
    final scope = AppDrawerScope.maybeOf(context);
    if (scope?.permanent == true) return const SizedBox.shrink();
    return IconButton(
      key: const ValueKey('drawer_open'),
      tooltip: 'Abrir menú',
      onPressed: scope?.openDrawer,
      icon: const Icon(AppIcons.menu),
    );
  }
}
