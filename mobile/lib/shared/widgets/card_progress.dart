import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'progress_bar.dart';

/// Avance de una card (proyecto, sector): la [ProgressBar] común y, en la
/// misma fila, «1/3 · 33%» en mono 12 (P05-M3). Sin tareas, solo el texto.
class CardProgress extends StatelessWidget {
  const CardProgress({super.key, required this.done, required this.total});

  final int done, total;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (total == 0) {
      return Text(
        'Sin tareas todavía',
        style: AppTextStyles.supporting.copyWith(color: c.muted),
      );
    }
    final pct = (done / total * 100).round();
    return Semantics(
      label: '$done de $total tareas completadas',
      excludeSemantics: true,
      child: Row(
        children: [
          Expanded(child: ProgressBar(value: done / total)),
          const SizedBox(width: AppSpacing.sm),
          // Cifras en mono; el separador no, que el espacio mono separa de
          // más.
          Text.rich(
            TextSpan(
              style: AppTextStyles.technical.copyWith(
                color: c.muted,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
              children: [
                TextSpan(text: '$done/$total'),
                TextSpan(
                  text: ' · ',
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
                TextSpan(text: '$pct%'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
