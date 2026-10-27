import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/sector.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../../data/models/common.dart';
import '../works/works_dashboard.dart';
import '../../shared/widgets/entity_header.dart';
import '../../shared/widgets/progress_bar.dart';

/// Card de resumen del sector, como la de la web: símbolo del color del sector,
/// nombre 20/700, ámbito, kebab, «Avance del sector» (20/600 + barra) y, sobre
/// `field`, «N proyectos vinculados» y «Color del sector».
class SectorSummaryPanel extends StatelessWidget {
  const SectorSummaryPanel({super.key, required this.board, this.menu});

  final SectorBoard board;
  final Widget? menu;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = AppTextStyles.supporting.copyWith(
      fontWeight: FontWeight.w500,
      color: c.muted,
    );
    // Como la web: el avance cuenta las hojas (una tarea con subtareas aporta
    // sus subtareas). Sin tareas a la vista, el de la API.
    final leaves = leafProgress([
      ...board.loose,
      for (final group in board.byWork) ...group.tasks,
    ]);
    final progress = leaves.total == 0
        ? board.progress
        : Progress(done: leaves.done, total: leaves.total);
    final pct = progress.total == 0
        ? 0
        : (progress.done / progress.total * 100).round();
    final linked = board.byWork.length;

    return WorkspacePanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                EntityHeader(
                  title: board.name,
                  colorHex: board.color,
                  trailing: menu,
                  meta: Text(
                    // La web dice «Espacio personal» para el ámbito personal.
                    board.scopeLabel == 'Personal'
                        ? 'Espacio personal'
                        : board.isGroupScope
                        ? 'Grupo ${board.scopeLabel}'
                        : board.scopeLabel,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text('Avance del sector', style: label),
                const SizedBox(height: AppSpacing.xxs),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      progress.total == 0 ? 'Sin tareas' : '$pct%',
                      style: AppTextStyles.screenTitle.copyWith(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: c.text,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        '${progress.done} de ${progress.total} completadas',
                        textAlign: TextAlign.end,
                        style: label.copyWith(fontWeight: FontWeight.w400),
                      ),
                    ),
                  ],
                ),
                if (progress.total > 0) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Semantics(
                    label:
                        '${progress.done} de ${progress.total} tareas completadas',
                    excludeSemantics: true,
                    child: ProgressBar(value: progress.ratio),
                  ),
                ],
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            color: c.field,
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '$linked ${linked == 1 ? 'proyecto vinculado' : 'proyectos vinculados'}',
                    style: label.copyWith(fontWeight: FontWeight.w400),
                  ),
                ),
                Text('Color del sector', style: label),
                const SizedBox(width: AppSpacing.xs),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.xs),
                  decoration: BoxDecoration(
                    border: Border.all(color: c.outline),
                    borderRadius: AppGeometry.control,
                  ),
                  child: ColorDot(hex: board.color, size: AppSpacing.md),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
