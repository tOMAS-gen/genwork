import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/sector.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/workspace_panel.dart';

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
    final accent = board.color == null ? c.brand : colorFromHex(board.color);
    final label = AppTextStyles.supporting.copyWith(
      fontWeight: FontWeight.w500,
      color: c.muted,
    );
    final progress = board.progress;
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
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: AppSpacing.xl + AppSpacing.xxs,
                      height: AppSpacing.xl + AppSpacing.xxs,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: .12),
                        borderRadius: AppGeometry.card,
                      ),
                      child: Icon(
                        AppIcons.sectors,
                        size: AppIconSizes.header,
                        color: accent,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            header: true,
                            child: Text(
                              board.name,
                              style: AppTextStyles.screenTitle.copyWith(
                                fontSize: 20,
                                color: c.text,
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xxs),
                          Text(
                            // La web dice «Espacio personal» para el ámbito
                            // personal.
                            board.scopeLabel == 'Personal'
                                ? 'Espacio personal'
                                : board.scopeLabel,
                            style: AppTextStyles.body.copyWith(color: c.muted),
                          ),
                        ],
                      ),
                    ),
                    ?menu,
                  ],
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
                    child: LinearProgressIndicator(
                      value: progress.ratio,
                      minHeight: 5,
                      color: c.brand,
                      backgroundColor: c.outline,
                      borderRadius: AppGeometry.chip,
                    ),
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
