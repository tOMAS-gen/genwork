import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/color_dot.dart';
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
    final pct = total == 0 ? 0 : (done / total * 100).round();
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
                      child: _NamePill(name: work.name, color: color),
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
                        style: muted.copyWith(fontWeight: FontWeight.w600),
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
          ),
        ),
      ),
    );
  }
}

class _NamePill extends StatelessWidget {
  const _NamePill({required this.name, required this.color});

  final String name;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: AppSpacing.xxs,
      ),
      decoration: BoxDecoration(
        color: color == null ? c.hover : c.chipFill(color!),
        borderRadius: AppGeometry.chip,
      ),
      child: Text(
        name.toUpperCase(),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: AppTextStyles.itemTitle.copyWith(
          color: color == null ? c.text : c.chipText(color!),
        ),
      ),
    );
  }
}
