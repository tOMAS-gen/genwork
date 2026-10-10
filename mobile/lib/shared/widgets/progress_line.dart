import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

import '../../data/models/common.dart';

/// Barra de progreso con "3/5".
class ProgressLine extends StatelessWidget {
  const ProgressLine({super.key, required this.progress});

  final Progress progress;

  @override
  Widget build(BuildContext context) {
    // Una sola lectura: sin esto TalkBack suma el valor crudo de la barra y "3/5".
    return Semantics(
      label: '${progress.done} de ${progress.total} tareas completadas',
      excludeSemantics: true,
      child: Row(
        children: [
          Expanded(
            child: LinearProgressIndicator(
              value: progress.ratio,
              minHeight: AppSpace.xs,
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Text(
            '${progress.done}/${progress.total}',
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}
