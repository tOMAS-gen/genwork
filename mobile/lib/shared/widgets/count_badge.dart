import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';

/// Contador en pill: fondo `hover`, borde `border`, texto 11 `muted`. Oculto en
/// 0 y "999+" desde 1000. Lo lee un lector de pantalla como una sola frase
/// ("3 tareas pendientes"); el nombre del destino ya se lee en la misma fila.
class CountBadge extends StatelessWidget {
  const CountBadge({
    super.key,
    required this.count,
    this.singular = 'tarea pendiente',
    this.plural = 'tareas pendientes',
  });

  final int count;
  final String singular, plural;

  /// Tope visible del contador.
  static const max = 999;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();
    final c = context.colors;
    return Semantics(
      label: countLabel(count, singular, plural),
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xs,
          vertical: AppSpacing.xxs / 2,
        ),
        decoration: BoxDecoration(
          color: c.hover,
          border: Border.all(color: c.border),
          borderRadius: AppGeometry.pill,
        ),
        child: Text(
          count > max ? '$max+' : '$count',
          style: AppTextStyles.supporting.copyWith(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: c.muted,
          ),
        ),
      ),
    );
  }
}
