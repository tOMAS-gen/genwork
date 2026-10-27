import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';

/// Color del avance (D5): azul de marca mientras falta, verde al completar.
Color progressColor(GenColors c, double ratio) => ratio >= 1 ? c.ok : c.brand;

/// La barra de avance de toda la app (PS7): 4 dp, pista `outline` y relleno
/// según [progressColor]. La semántica la pone quien la usa.
class ProgressBar extends StatelessWidget {
  const ProgressBar({super.key, required this.value});

  /// De 0 a 1.
  final double value;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return LinearProgressIndicator(
      value: value,
      minHeight: AppSpacing.xxs,
      color: progressColor(c, value),
      backgroundColor: c.outline,
      borderRadius: AppGeometry.pill,
    );
  }
}
