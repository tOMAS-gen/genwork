import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/dashed_border.dart';
import '../../shared/widgets/entity_header.dart';
import '../../shared/widgets/workspace_panel.dart';
import 'works_dashboard.dart';
import '../../shared/widgets/progress_bar.dart';
import '../../shared/widgets/status_chip.dart';

/// Card de resumen del proyecto, como `.work-overview` de la web: símbolo,
/// nombre 20/700, «Espacio personal / Grupo X» + estado, descripción, avance
/// (20/600 + barra de 5 px `brand`), fecha límite y, sobre `field`, etiquetas y
/// «Código / carpeta» con su botón Copiar. [menu] es el kebab de acciones.
class WorkSummaryPanel extends StatefulWidget {
  const WorkSummaryPanel({
    super.key,
    required this.work,
    this.menu,
    this.onPickDue,
    this.onClearDue,
    this.onEditLabels,
    this.now,
  });

  final WorkDetail work;
  final Widget? menu;

  /// Selector de la fecha límite (`DatePicker` de la web); sin callback, la
  /// fecha se muestra de solo lectura.
  final VoidCallback? onPickDue;

  /// "×" junto a la fecha: la quita.
  final VoidCallback? onClearDue;

  /// Ícono de etiqueta junto a "Etiquetas": las edita.
  final VoidCallback? onEditLabels;

  /// Reloj para la urgencia (los tests lo fijan).
  final DateTime? now;

  @override
  State<WorkSummaryPanel> createState() => _WorkSummaryPanelState();
}

class _WorkSummaryPanelState extends State<WorkSummaryPanel> {
  bool _expanded = false;
  WorkDetail get work => widget.work;
  Widget? get menu => widget.menu;
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hex = projectColor(work.labels);
    final muted = AppTextStyles.body.copyWith(color: c.muted);
    final progress = work.progress;
    final pct = progress.total == 0
        ? 0
        : (progress.done / progress.total * 100).round();
    final due = work.dueDate == null
        ? null
        : dueUrgency(work.dueDate!, widget.now ?? DateTime.now());
    final state = work.isTemplate
        ? 'Plantilla de objetivo'
        : work.isArchived
        ? 'Archivado'
        : 'Activo';

    // Una sola card blanca: cabecera y secciones separadas por divisores,
    // con el rótulo de cada una en 11/700 (P07-M2, P07-M3).
    Widget section(String title, Widget child) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Divider(height: 1, thickness: 1, color: c.border),
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                title.toUpperCase(),
                style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
              ),
              const SizedBox(height: AppSpacing.xs),
              child,
            ],
          ),
        ),
      ],
    );
    final status = projectStatusColors(
      c,
      work.isArchived || work.isTemplate
          ? ProjectStatus.pending
          : ProjectStatus.inProgress,
    );

    return WorkspacePanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: EntityHeader(
              title: work.name,
              colorHex: hex,
              trailing: menu,
              meta: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xxs,
                children: [
                  Text(
                    work.groupName == null
                        ? 'Espacio personal'
                        : 'Grupo ${work.groupName}',
                    style: muted,
                  ),
                  StatusChip(
                    label: state,
                    color: status.text,
                    fill: status.fill,
                  ),
                ],
              ),
            ),
          ),
          if (work.description != null && work.description!.isNotEmpty)
            section(
              'Descripción',
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Texto plano, sin caja (P07-M2).
                  Text(
                    work.description!,
                    maxLines: _expanded ? null : 3,
                    overflow: _expanded ? null : TextOverflow.ellipsis,
                    style: AppTextStyles.body.copyWith(color: c.text),
                  ),
                  if (work.description!.length > 180 ||
                      '\n'.allMatches(work.description!).length >= 3)
                    TextButton(
                      key: const ValueKey('work_description_expand'),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        alignment: Alignment.centerLeft,
                      ),
                      onPressed: () => setState(() => _expanded = !_expanded),
                      child: Text(
                        _expanded
                            ? 'Mostrar menos'
                            : 'Ver descripción completa',
                      ),
                    ),
                ],
              ),
            ),
          section(
            'Avance',
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$pct%',
                      style: AppTextStyles.screenTitle.copyWith(
                        color: c.text,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        '${progress.done} de ${progress.total} completadas',
                        textAlign: TextAlign.end,
                        style: AppTextStyles.supporting.copyWith(
                          color: c.muted,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Semantics(
                  label:
                      '${progress.done} de ${progress.total} tareas completadas',
                  excludeSemantics: true,
                  child: ProgressBar(value: progress.ratio),
                ),
              ],
            ),
          ),
          // Fecha límite debajo del avance, como `.work-due-summary`:
          // selector punteado, "×" para quitarla y la urgencia.
          section(
            'Fecha límite',
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xxs,
              children: [
                DashedBorder(
                  color: c.outline,
                  child: InkWell(
                    key: const ValueKey('work_due_pick'),
                    onTap: widget.onPickDue,
                    borderRadius: AppGeometry.control,
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            AppIcons.calendarToday,
                            size: AppIconSizes.compact,
                            color: c.text,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            work.dueDate == null
                                ? 'Sin fecha'
                                : formatDueDate(work.dueDate!),
                            style: AppTextStyles.body.copyWith(color: c.text),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (work.dueDate != null && widget.onClearDue != null)
                  IconButton(
                    key: const ValueKey('work_due_clear'),
                    tooltip: 'Quitar fecha límite',
                    onPressed: widget.onClearDue,
                    icon: Icon(
                      AppIcons.close,
                      size: AppIconSizes.compact,
                      color: c.muted,
                    ),
                  ),
                if (due != null)
                  Text(
                    due.label,
                    style: AppTextStyles.body.copyWith(
                      color: dueToneColor(c, due.tone),
                    ),
                  ),
              ],
            ),
          ),
          section(
            'Etiquetas',
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: [
                if (work.stageName != null)
                  ColorPill(label: work.stageName!, hex: work.stageColor),
                for (final l in work.labels)
                  ColorPill(label: l.valueName, hex: l.color),
                if (widget.onEditLabels != null)
                  IconButton(
                    key: const ValueKey('work_labels_edit'),
                    tooltip: 'Editar etiquetas',
                    onPressed: widget.onEditLabels,
                    icon: Icon(
                      AppIcons.label,
                      size: AppIconSizes.field,
                      color: c.muted,
                    ),
                  ),
              ],
            ),
          ),
          section(
            'Código / carpeta',
            Row(
              children: [
                Expanded(
                  child: Text(
                    work.code,
                    style: AppTextStyles.technical.copyWith(color: c.text),
                  ),
                ),
                // Copiar como ícono, igual que en los campos (P24a-M1).
                IconButton(
                  key: const ValueKey('work_copy_code'),
                  tooltip: 'Copiar código',
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: work.code));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Código copiado')),
                      );
                    }
                  },
                  icon: Icon(
                    AppIcons.copy,
                    size: AppIconSizes.action,
                    color: c.muted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
