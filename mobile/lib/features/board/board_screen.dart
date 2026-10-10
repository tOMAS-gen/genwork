import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/board.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import 'board_providers.dart';

/// Vista de tareas: avance y pendientes de cada sector, como `/board` de la web.
class BoardScreen extends ConsumerWidget {
  const BoardScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(boardProvider);
    final columns = value.value;
    final progress = columns == null ? null : boardProgress(columns);
    final c = context.colors;
    final muted = AppTextStyles.body.copyWith(color: c.muted);
    return GenPageScaffold(
      title: 'Vista de tareas',
      subtitle: 'Avance y pendientes de cada sector.',
      icon: AppIcons.dashboard,
      onRefresh: () async {
        ref.invalidate(boardProvider);
        await ref.read(boardProvider.future);
      },
      bodyPadding: EdgeInsets.zero,
      body: ListView(
        key: const ValueKey('board_list'),
        padding: AppSpace.page,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          if (value.hasError)
            ErrorView(
              error: value.error!,
              onRetry: () => ref.invalidate(boardProvider),
            ),
          if (value.hasError && columns != null)
            Text('Se muestran los últimos datos recibidos.', style: muted),
          if (columns == null && value.isLoading) const LoadingView(),
          if (columns != null && columns.isEmpty && !value.hasError)
            const EmptyView(
              message:
                  'Todavía no hay sectores visibles.\nLas tareas aparecerán cuando se asignen a un sector al que tengas acceso.',
            ),
          if (columns != null && columns.isNotEmpty) ...[
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.xxs,
              children: [
                Text(
                  '${progress!.pending} ${progress.pending == 1 ? 'tarea pendiente' : 'tareas pendientes'} · ${columns.length} ${columns.length == 1 ? 'sector' : 'sectores'}',
                  key: const ValueKey('board_summary'),
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
                Text(
                  '${progress.done} de ${progress.total} finalizadas',
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.md),
            for (final column in columns) _SectorCard(column: column),
          ],
        ],
      ),
    );
  }
}

/// Card de un sector: acento del color del sector, nombre, conteo de
/// pendientes, avance y, sobre `field`, las tareas pendientes.
class _SectorCard extends StatelessWidget {
  const _SectorCard({required this.column});
  final BoardColumn column;
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final progress = column.progress;
    final pending = column.tasks.where((t) => !t.isDone).toList();
    final accent = column.color == null ? c.brand : colorFromHex(column.color);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Card(
        key: ValueKey('board_sector_${column.sector.id}'),
        semanticContainer: false,
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InkWell(
              key: ValueKey('board_open_sector_${column.sector.id}'),
              onTap: () => context.push(Routes.sector(column.sector.id)),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: kActiveTickWidth,
                          height: AppSpacing.md,
                          decoration: BoxDecoration(
                            color: accent,
                            borderRadius: AppGeometry.pill,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Expanded(
                          child: Text(
                            column.sector.name,
                            style: AppTextStyles.itemTitle.copyWith(
                              fontWeight: FontWeight.w700,
                              color: c.text,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.xs,
                            vertical: AppSpacing.xxs / 2,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: c.outline),
                            borderRadius: AppGeometry.chip,
                          ),
                          child: Semantics(
                            label:
                                '${progress.pending} ${progress.pending == 1 ? 'pendiente' : 'pendientes'}',
                            excludeSemantics: true,
                            child: Text(
                              '${progress.pending}',
                              style: AppTextStyles.supporting.copyWith(
                                color: c.muted,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Icon(
                          AppIcons.chevronRight,
                          size: AppIconSizes.field,
                          color: c.muted,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      progress.total > 0
                          ? '${progress.done} de ${progress.total} finalizadas'
                          : column.tasks.isEmpty
                          ? 'Sin tareas asignadas'
                          : 'Avance en las subtareas',
                      style: AppTextStyles.supporting.copyWith(color: c.muted),
                    ),
                    const SizedBox(height: AppSpacing.xxs),
                    Semantics(
                      label:
                          '${progress.done} de ${progress.total} finalizadas',
                      excludeSemantics: true,
                      child: LinearProgressIndicator(
                        value: progress.ratio,
                        minHeight: 4,
                        color: c.ok,
                        backgroundColor: c.outline,
                        borderRadius: AppGeometry.pill,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            ColoredBox(
              color: c.field,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (pending.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.sm,
                        ),
                        child: Text(
                          'Sin tareas pendientes.',
                          textAlign: TextAlign.center,
                          style: AppTextStyles.body.copyWith(color: c.muted),
                        ),
                      ),
                    for (var i = 0; i < pending.length; i++) ...[
                      if (i > 0) Divider(height: 1, color: c.border),
                      _TaskRow(column: column, task: pending[i]),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.column, required this.task});
  final BoardColumn column;
  final BoardTask task;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      key: ValueKey('board_task_${column.sector.id}_${task.id}'),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (task.parentId != null)
            Text(
              'Subtarea de: ${task.parentText ?? 'Tarea principal'}',
              style: AppTextStyles.supporting.copyWith(color: c.muted),
            ),
          Text(task.text, style: AppTextStyles.body.copyWith(color: c.text)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              ColorPill(
                label: task.isContainer ? 'En curso' : task.status.name,
                hex: task.status.color,
              ),
              if (task.isContainer)
                Text(
                  '${task.subtaskDone}/${task.subtaskCount} subtareas',
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ColorDot(hex: task.workColor),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  task.contextLabel,
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
