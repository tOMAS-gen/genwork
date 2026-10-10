import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Avance de una card (proyecto, sector): barra de 8 px `ok` sobre `border` con
/// su porcentaje, y debajo «d/t tareas» (o «Sin tareas todavía»).
class CardProgress extends StatelessWidget {
  const CardProgress({super.key, required this.done, required this.total});

  final int done, total;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final pct = total == 0 ? 0 : (done / total * 100).round();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (total > 0) ...[
          Semantics(
            label: '$done de $total tareas completadas',
            excludeSemantics: true,
            child: Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: done / total,
                    minHeight: 8,
                    color: c.ok,
                    backgroundColor: c.border,
                    borderRadius: AppGeometry.pill,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  '$pct%',
                  style: AppTextStyles.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: c.muted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
        ],
        Text(
          total > 0 ? '$done/$total tareas' : 'Sin tareas todavía',
          style: AppTextStyles.supporting.copyWith(color: c.muted),
        ),
      ],
    );
  }
}
