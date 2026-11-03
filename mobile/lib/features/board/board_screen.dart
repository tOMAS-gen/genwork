import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/board.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import 'board_providers.dart';
import '../../shared/widgets/progress_bar.dart';
import '../../shared/widgets/stat_cards.dart';
import '../../shared/widgets/status_chip.dart';

/// Vista de tareas: avance y pendientes de cada sector, como `/board` de la web.
class BoardScreen extends ConsumerWidget {
  const BoardScreen({super.key, this.readOnly = false});
  final bool readOnly;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(boardProvider);
    final error = value.error;
    final restricted =
        error is ApiException && [401, 403, 404].contains(error.status);
    final columns = restricted ? null : value.value;
    final progress = columns == null ? null : boardProgress(columns);
    final c = context.colors;
    final muted = AppTextStyles.body.copyWith(color: c.muted);
    return GenPageScaffold(
      title: 'Vista de tareas',
      // La TV de la web no lleva bajada.
      subtitle: readOnly ? null : 'Avance y pendientes de cada sector.',
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
              icon: AppIcons.dashboard,
              title: 'Todavía no hay sectores visibles',
              message:
                  'Las tareas aparecerán aquí cuando se asignen a un sector al que tengas acceso.',
            ),
          if (columns != null && columns.isNotEmpty) ...[
            // El resumen global es el dato principal de la TV (P35-M4).
            StatCards(
              key: const ValueKey('board_summary'),
              items: [
                (
                  label: progress!.pending == 1 ? 'Pendiente' : 'Pendientes',
                  value: '${progress.pending}',
                ),
                (
                  label: columns.length == 1 ? 'Sector' : 'Sectores',
                  value: '${columns.length}',
                ),
                (
                  label: 'Finalizadas',
                  value: '${progress.done}/${progress.total}',
                ),
              ],
            ),
            const SizedBox(height: AppSpace.md),
            for (final column in columns)
              _SectorCard(column: column, readOnly: readOnly),
          ],
        ],
      ),
    );
  }
}

/// Card de un sector: acento del color del sector, nombre, contador de
/// pendientes, porcentaje y barra; debajo, las tareas pendientes agrupadas
/// por proyecto.
class _SectorCard extends StatelessWidget {
  const _SectorCard({required this.column, this.readOnly = false});
  final BoardColumn column;
  final bool readOnly;
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
            // Encabezado sobre la misma superficie de la card (P35-M5).
            Material(
              color: c.surface,
              child: InkWell(
                key: ValueKey('board_open_sector_${column.sector.id}'),
                onTap: readOnly
                    ? null
                    : () => context.push(Routes.sector(column.sector.id)),
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
                              style: AppTextStyles.cardTitle.copyWith(
                                color: c.text,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          if (!readOnly)
                            Icon(
                              AppIcons.chevronRight,
                              size: AppIconSizes.field,
                              color: c.muted,
                            ),
                        ],
                      ),
                      // Una sola cifra de pendientes y el porcentaje, sin
                      // contador aparte (P35-M3).
                      const SizedBox(height: AppSpacing.xs),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              column.tasks.isEmpty
                                  ? 'Sin tareas asignadas'
                                  : progress.total == 0
                                  ? 'Avance en las subtareas'
                                  : countLabel(
                                      progress.pending,
                                      'pendiente',
                                      'pendientes',
                                    ),
                              key: ValueKey(
                                'board_pending_${column.sector.id}',
                              ),
                              style: AppTextStyles.supporting.copyWith(
                                color: c.muted,
                              ),
                            ),
                          ),
                          if (progress.total > 0)
                            Text(
                              '${(progress.ratio * 100).round()}%',
                              style: AppTextStyles.technical.copyWith(
                                fontWeight: FontWeight.w600,
                                color: c.text,
                                fontFeatures: const [
                                  FontFeature.tabularFigures(),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Semantics(
                        label:
                            '${progress.done} de ${progress.total} finalizadas',
                        excludeSemantics: true,
                        child: ProgressBar(value: progress.ratio),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Divider(height: 1, color: c.border),
            ColoredBox(
              color: c.surface,
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
                    // Agrupadas por proyecto: la ruta va una vez (P10-M2).
                    for (final group in _byContext(pending).entries) ...[
                      Padding(
                        padding: const EdgeInsets.only(
                          top: AppSpacing.xs,
                          bottom: AppSpacing.xxs,
                        ),
                        child: Text(
                          group.key.toUpperCase(),
                          style: AppTextStyles.sectionLabel.copyWith(
                            color: c.muted,
                          ),
                        ),
                      ),
                      for (var i = 0; i < group.value.length; i++) ...[
                        if (i > 0) Divider(height: 1, color: c.border),
                        _TaskRow(column: column, task: group.value[i]),
                      ],
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

/// Tareas pendientes agrupadas por «proyecto › objetivo», en el orden en que
/// aparecen.
Map<String, List<BoardTask>> _byContext(List<BoardTask> tasks) {
  final groups = <String, List<BoardTask>>{};
  for (final t in tasks) {
    (groups[t.contextLabel.replaceAll(' › ', ' · ')] ??= []).add(t);
  }
  return groups;
}

/// Tarea del tablero (P10-M2, P10-M3): anillo de estado de 16 dp, título
/// 13/500 y una sola línea de metadatos en 12 gris. La ruta va en el
/// encabezado del grupo.
class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.column, required this.task});
  final BoardColumn column;
  final BoardTask task;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final supporting = AppTextStyles.supporting.copyWith(color: c.muted);
    final status = task.isContainer ? 'En curso' : task.status.name;
    return Padding(
      key: ValueKey('board_task_${column.sector.id}_${task.id}'),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.hairline),
            child: StatusRing(
              color: colorFromHex(task.status.color),
              progress: task.isContainer
                  ? task.subtaskDone / task.subtaskCount
                  : null,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (task.parentId != null)
                  Container(
                    padding: const EdgeInsets.only(left: AppSpacing.xs),
                    decoration: BoxDecoration(
                      border: Border(left: BorderSide(color: c.border)),
                    ),
                    child: Text(
                      'Subtarea de: ${task.parentText ?? 'Tarea principal'}',
                      style: supporting,
                    ),
                  ),
                Text(
                  task.text,
                  style: AppTextStyles.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: c.text,
                  ),
                ),
                if (task.isContainer)
                  Text(
                    '${task.subtaskDone}/${task.subtaskCount}',
                    style: AppTextStyles.technical.copyWith(
                      color: c.muted,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          // El estado como chip, con los colores de siempre (P35-M2).
          TaskStatusChip(name: status, done: task.isDone),
        ],
      ),
    );
  }
}

/// Anillo de estado de 16 dp (P10-M3): el contorno en el color del estado y,
/// en una tarea con subtareas, el relleno según su avance.
class StatusRing extends StatelessWidget {
  const StatusRing({super.key, required this.color, this.progress});

  final Color color;

  /// De 0 a 1, o null si no hay subtareas.
  final double? progress;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: AppSpacing.md,
    child: CustomPaint(
      painter: _RingPainter(
        color: color,
        track: context.colors.outline,
        progress: progress,
      ),
    ),
  );
}

class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.color,
    required this.track,
    required this.progress,
  });

  final Color color, track;
  final double? progress;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = AppSpacing.hairline;
    final rect = (Offset.zero & size).deflate(stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    final p = progress;
    if (p == null) {
      canvas.drawOval(rect, paint..color = color);
      return;
    }
    canvas.drawOval(rect, paint..color = track);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      2 * math.pi * p.clamp(0, 1),
      false,
      paint
        ..color = color
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.color != color || old.track != track || old.progress != progress;
}
