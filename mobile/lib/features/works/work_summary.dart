import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/workspace_panel.dart';
import 'works_dashboard.dart';

/// Card de resumen del proyecto, como `.work-overview` de la web: símbolo,
/// nombre 20/700, «Espacio personal / Grupo X» + estado, descripción, avance
/// (20/600 + barra de 5 px `brand`), fecha límite y, sobre `field`, etiquetas y
/// «Código / carpeta» con su botón Copiar. [menu] es el kebab de acciones.
class WorkSummaryPanel extends StatefulWidget {
  const WorkSummaryPanel({super.key, required this.work, this.menu});

  final WorkDetail work;
  final Widget? menu;

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
    final accent = hex == null ? c.brand : colorFromHex(hex);
    final muted = AppTextStyles.body.copyWith(color: c.muted);
    final label = AppTextStyles.supporting.copyWith(
      fontWeight: FontWeight.w500,
      color: c.muted,
    );
    final progress = work.progress;
    final pct = progress.total == 0
        ? 0
        : (progress.done / progress.total * 100).round();
    final state = work.isTemplate
        ? 'Plantilla de objetivo'
        : work.isArchived
        ? 'Archivado'
        : 'Activo';

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
                        AppIcons.projects,
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
                              work.name,
                              style: AppTextStyles.screenTitle.copyWith(
                                fontSize: 20,
                                height: 1.3,
                                color: c.text,
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xxs),
                          Wrap(
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
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.xs,
                                  vertical: AppSpacing.hairline,
                                ),
                                decoration: BoxDecoration(
                                  border: Border.all(color: c.outline),
                                  borderRadius: AppGeometry.chip,
                                ),
                                child: Text(state, style: label),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    ?menu,
                  ],
                ),
                if (work.description != null &&
                    work.description!.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text('Descripción', style: label),
                  const SizedBox(height: AppSpacing.xxs),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                      vertical: AppSpacing.xs - AppSpacing.hairline,
                    ),
                    decoration: BoxDecoration(
                      color: c.field,
                      border: Border.all(color: c.outline),
                      borderRadius: AppGeometry.control,
                    ),
                    child: Text(
                      work.description!,
                      maxLines: _expanded ? null : 3,
                      overflow: _expanded ? null : TextOverflow.ellipsis,
                      style: AppTextStyles.itemTitle.copyWith(
                        fontWeight: FontWeight.w400,
                        color: c.text,
                      ),
                    ),
                  ),
                  if (work.description!.length > 180 ||
                      '\n'.allMatches(work.description!).length >= 3)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        key: const ValueKey('work_description_expand'),
                        onPressed: () => setState(() => _expanded = !_expanded),
                        child: Text(
                          _expanded
                              ? 'Mostrar menos'
                              : 'Ver descripción completa',
                        ),
                      ),
                    ),
                ],
                const SizedBox(height: AppSpacing.md),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Avance', style: label),
                          const SizedBox(height: AppSpacing.xxs),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                '$pct%',
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
                                  style: label.copyWith(
                                    fontWeight: FontWeight.w400,
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
                            child: LinearProgressIndicator(
                              value: progress.ratio,
                              minHeight: 5,
                              color: c.brand,
                              backgroundColor: c.outline,
                              borderRadius: AppGeometry.chip,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Fecha límite', style: label),
                        const SizedBox(height: AppSpacing.xxs),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.xs,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: c.border),
                            borderRadius: AppGeometry.control,
                          ),
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
                                    : formatDay(work.dueDate!),
                                style: AppTextStyles.body.copyWith(
                                  color: c.text,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            color: c.field,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: [
                    Text('Etiquetas', style: label),
                    if (work.stageName != null)
                      ColorPill(label: work.stageName!, hex: work.stageColor),
                    for (final l in work.labels)
                      ColorPill(label: l.valueName, hex: l.color),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text('Código / carpeta', style: label),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        work.code,
                        style: AppTextStyles.technical.copyWith(color: c.muted),
                      ),
                    ),
                    OutlinedButton.icon(
                      key: const ValueKey('work_copy_code'),
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: work.code));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Código copiado')),
                          );
                        }
                      },
                      icon: const Icon(AppIcons.copy, size: AppIconSizes.field),
                      label: const Text('Copiar'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
