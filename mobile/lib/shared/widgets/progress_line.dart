import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/common.dart';
import 'progress_bar.dart';

/// Barra de progreso con "3/5": la [ProgressBar] común y el conteo en Mono 12
/// `muted`.
class ProgressLine extends StatelessWidget {
  const ProgressLine({super.key, required this.progress});

  final Progress progress;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Una sola lectura: sin esto TalkBack suma el valor crudo de la barra y "3/5".
    return Semantics(
      label: '${progress.done} de ${progress.total} tareas completadas',
      excludeSemantics: true,
      child: Row(
        children: [
          Expanded(child: ProgressBar(value: progress.ratio)),
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
