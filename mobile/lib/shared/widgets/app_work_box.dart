// Portado de genstock: frontend/lib/shared/widgets/app_work_box.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';

/// Superficie compartida para bloques de una pantalla o ventana de trabajo.
/// El borde se pinta sobre el contenido para conservarse en listados.
/// No agrega scroll: la composición que conoce el alto disponible lo decide.
class AppWorkBox extends StatelessWidget {
  const AppWorkBox({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.borderRadius = AppGeometry.card,
    this.backgroundColor,
  });

  final Widget child;
  final EdgeInsets padding;
  final BorderRadius borderRadius;

  /// Por defecto `field` (pozo del tema).
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor ?? c.field,
        borderRadius: borderRadius,
      ),
      // El contorno va DESPUÉS del contenido: un hijo a fondo completo no
      // puede tapar partes del trazo.
      foregroundDecoration: BoxDecoration(
        border: Border.all(color: c.border),
        borderRadius: borderRadius,
      ),
      // Recorta a la curva del bloque.
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}
