import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/status_chip.dart';
import 'works_dashboard.dart';
import 'works_filters_panel.dart';

/// Vista de lista de Proyectos, como la tabla `.data-table` de la web
/// (`ProjectListRow.tsx`): Proyecto, Grupo, Etiquetas, Progreso, Entrega, Días
/// restantes, Estado y el menú. En el teléfono se desplaza a lo ancho, como
/// `.table-scroll-wrapper`.
class WorkTable extends StatelessWidget {
  const WorkTable({
    super.key,
    required this.works,
    required this.onOpen,
    this.onArchive,
    this.now,
  });

  final List<WorkSummary> works;
  final ValueChanged<WorkSummary> onOpen;
  final ValueChanged<WorkSummary>? onArchive;

  /// Reloj para el cálculo de urgencia (los tests lo fijan).
  final DateTime? now;

  static const _columns = [
    'Proyecto',
    'Grupo',
    'Etiquetas',
    'Progreso',
    'Entrega',
    'Días restantes',
    'Estado',
    '',
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final header = AppTextStyles.supporting.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0.5,
      color: c.muted,
    );
    final cell = AppTextStyles.body.copyWith(color: c.text);
    const padding = EdgeInsets.symmetric(
      horizontal: AppSpacing.sm,
      vertical: AppSpacing.xs,
    );

    TableRow row(WorkSummary work) {
      final due = work.dueDate;
      final urgency = due == null
          ? null
          : dueUrgency(due, now ?? DateTime.now());
      final status = projectStatus(work.progress.done, work.progress.total);
      final pct = work.progress.total == 0
          ? null
          : (work.progress.done * 100 / work.progress.total).round();
      Widget tap(Widget child) => InkWell(
        onTap: () => onOpen(work),
        child: Padding(padding: padding, child: child),
      );
      return TableRow(
        key: ValueKey('work_row_${work.id}'),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: c.border)),
        ),
        children: [
          tap(
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (work.color != null) ...[
                  ColorDot(hex: work.color),
                  const SizedBox(width: AppSpacing.xs),
                ],
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      work.name,
                      style: cell.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (due != null)
                      Text(
                        'Entrega: ${formatDueDate(due, dayMonth: true)}',
                        style: cell.copyWith(color: c.muted),
                      ),
                  ],
                ),
              ],
            ),
          ),
          tap(Text(work.groupName ?? 'Personal', style: cell)),
          tap(
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 200),
              child: Wrap(
                spacing: AppSpacing.xxs,
                runSpacing: AppSpacing.xxs,
                children: [
                  for (final l in work.labels)
                    ColorPill(label: l.valueName, hex: l.color),
                  if (work.stageName != null)
                    ColorPill(label: work.stageName!, hex: work.stageColor),
                ],
              ),
            ),
          ),
          tap(
            pct == null
                ? const SizedBox.shrink()
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: AppSpacing.xl,
                        child: Text(
                          '$pct%',
                          style: AppTextStyles.supporting.copyWith(
                            color: c.muted,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      SizedBox(
                        width: AppSpacing.xxl * 2,
                        child: ClipRRect(
                          borderRadius: AppGeometry.pill,
                          child: LinearProgressIndicator(
                            value: pct / 100,
                            minHeight: 6,
                            color: c.ok,
                            backgroundColor: c.border,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
          tap(Text(due == null ? '' : formatDueDate(due), style: cell)),
          tap(
            urgency == null
                ? const SizedBox.shrink()
                : Text(
                    urgency.label,
                    style: cell.copyWith(color: dueToneColor(c, urgency.tone)),
                  ),
          ),
          tap(
            StatusChip(
              label: worksStatusLabels[status]!,
              color: switch (status) {
                ProjectStatus.pending => c.muted,
                ProjectStatus.inProgress => c.warningText,
                ProjectStatus.completed => c.successText,
              },
              fill: switch (status) {
                ProjectStatus.pending => c.hover,
                ProjectStatus.inProgress => c.warningFill,
                ProjectStatus.completed => c.successFill,
              },
            ),
          ),
          onArchive == null
              ? const SizedBox.shrink()
              : PopupMenuButton<String>(
                  key: ValueKey('work_row_menu_${work.id}'),
                  tooltip: 'Acciones del proyecto',
                  icon: Icon(
                    AppIcons.moreHorizontal,
                    size: AppIconSizes.notice,
                    color: c.muted,
                  ),
                  onSelected: (action) =>
                      action == 'open' ? onOpen(work) : onArchive!(work),
                  itemBuilder: (_) => [
                    const PopupMenuItem(
                      value: 'open',
                      child: Text('Abrir proyecto'),
                    ),
                    PopupMenuItem(
                      value: 'archive',
                      child: Text(work.isArchived ? 'Desarchivar' : 'Archivar'),
                    ),
                  ],
                ),
        ],
      );
    }

    return SingleChildScrollView(
      key: const ValueKey('works_table'),
      scrollDirection: Axis.horizontal,
      child: Table(
        defaultColumnWidth: const IntrinsicColumnWidth(),
        defaultVerticalAlignment: TableCellVerticalAlignment.middle,
        children: [
          TableRow(
            decoration: BoxDecoration(
              color: c.page,
              border: Border(bottom: BorderSide(color: c.border)),
            ),
            children: [
              for (final column in _columns)
                Padding(
                  padding: padding,
                  child: Text(column.toUpperCase(), style: header),
                ),
            ],
          ),
          for (final work in works) row(work),
        ],
      ),
    );
  }
}
