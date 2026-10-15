import 'package:flutter/material.dart';

import '../../core/theme/app_icons.dart';

/// Permite abrir el menú del shell desde los Scaffold de cada sección.
class AppDrawerScope extends InheritedWidget {
  const AppDrawerScope({
    super.key,
    required this.openDrawer,
    required super.child,
  });

  final VoidCallback openDrawer;

  static AppDrawerScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppDrawerScope>();

  @override
  bool updateShouldNotify(AppDrawerScope oldWidget) =>
      oldWidget.openDrawer != openDrawer;
}

class AppDrawerButton extends StatelessWidget {
  const AppDrawerButton({super.key});

  @override
  Widget build(BuildContext context) => IconButton(
    key: const ValueKey('drawer_open'),
    tooltip: 'Abrir menú',
    onPressed: AppDrawerScope.maybeOf(context)?.openDrawer,
    icon: const Icon(AppIcons.menu),
  );
}
