import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/card_progress.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/name_pill.dart';
import 'works_dashboard.dart';

/// Card de proyecto, como `ProjectCard.tsx` de la web: píldora con el nombre
/// (del color del proyecto), estrella, grupo, etiquetas, vencimiento con
/// urgencia, barra de avance de 8 px con su % y el conteo de tareas.
class WorkCard extends StatelessWidget {
  const WorkCard({
    super.key,
    required this.work,
    required this.onTap,
    required this.onFavorite,
    this.now,
  });

  final WorkSummary work;
  final VoidCallback onTap;
  final VoidCallback onFavorite;

  /// Reloj para el cálculo de urgencia (los tests lo fijan).
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final muted = AppTextStyles.body.copyWith(color: c.muted);
    final color = work.color == null ? null : colorFromHex(work.color);
    final done = work.progress.done, total = work.progress.total;
    final due = work.dueDate == null
        ? null
        : dueUrgency(work.dueDate!, now ?? DateTime.now());
    final dueColor = switch (due?.tone) {
      DueTone.green => c.ok,
      DueTone.orange => c.warning,
      DueTone.red => c.danger,
      null => c.muted,
    };
    final labels = work.labels.where((l) => l.isPrimary).toList();

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('work_${work.id}'),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: NamePill(name: work.name, color: color),
                    ),
                  ),
                  IconButton(
                    key: ValueKey('work_favorite_${work.id}'),
                    tooltip: work.isFavorite
                        ? 'Quitar de favoritos'
                        : 'Agregar a favoritos',
                    icon: Icon(
                      work.isFavorite
                          ? AppIcons.favoriteFilled
                          : AppIcons.favorite,
                      size: AppIconSizes.action,
                      color: work.isFavorite ? c.favorite : c.muted,
                    ),
                    onPressed: onFavorite,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                work.groupName == null ? 'Personal' : 'Grupo ${work.groupName}',
                style: muted,
              ),
              if (work.stageName != null || labels.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: [
                    if (work.stageName != null)
                      ColorPill(label: work.stageName!, hex: work.stageColor),
                    for (final l in labels)
                      ColorPill(label: l.valueName, hex: l.color),
                  ],
                ),
              ],
              if (work.dueDate != null && due != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.xxs,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          AppIcons.calendarToday,
                          size: AppIconSizes.compact,
                          color: c.muted,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          'Entrega: ${formatDay(work.dueDate!)}',
                          style: muted,
                        ),
                      ],
                    ),
                    Text(
                      due.label,
                      style: AppTextStyles.body.copyWith(
                        color: dueColor,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: AppSpacing.sm),
              CardProgress(done: done, total: total),
            ],
          ),
        ),
      ),
    );
  }
}
