import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/common.dart';

/// Barra de progreso con "3/5": track `outline`, relleno `ok` (o `brand` con
/// [emphasis]), 4 px de alto y radio completo; el conteo va en Mono 12 `muted`.
class ProgressLine extends StatelessWidget {
  const ProgressLine({
    super.key,
    required this.progress,
    this.emphasis = false,
  });

  final Progress progress;

  /// Rellena con `brand` en vez de `ok`.
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Una sola lectura: sin esto TalkBack suma el valor crudo de la barra y "3/5".
    return Semantics(
      label: '${progress.done} de ${progress.total} tareas completadas',
      excludeSemantics: true,
      child: Row(
        children: [
          Expanded(
            child: LinearProgressIndicator(
              value: progress.ratio,
              minHeight: 4,
              color: emphasis ? c.brand : c.ok,
              backgroundColor: c.outline,
              borderRadius: AppGeometry.pill,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            '${progress.done}/${progress.total}',
            style: AppTextStyles.technical.copyWith(color: c.muted),
          ),
        ],
      ),
    );
  }
}
