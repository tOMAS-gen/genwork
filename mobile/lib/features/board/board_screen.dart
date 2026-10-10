import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/board.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/progress_line.dart';
import '../../shared/widgets/state_views.dart';
import 'board_providers.dart';

class BoardScreen extends ConsumerWidget {
  const BoardScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(boardProvider);
    final columns = value.value;
    final progress = columns == null ? null : boardProgress(columns);
    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: const Text('Vista de tareas'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(boardProvider);
          await ref.read(boardProvider.future);
        },
        child: ListView(
          key: const ValueKey('board_list'),
          padding: AppSpace.list,
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            if (value.hasError)
              ErrorView(
                error: value.error!,
                onRetry: () => ref.invalidate(boardProvider),
              ),
            if (value.hasError && columns != null)
              const Text('Se muestran los últimos datos recibidos.'),
            if (columns == null && value.isLoading) const LoadingView(),
            if (columns != null && columns.isEmpty && !value.hasError)
              const EmptyView(
                message:
                    'Todavía no hay sectores visibles.\nLas tareas aparecerán cuando se asignen a un sector al que tengas acceso.',
              ),
            if (columns != null && columns.isNotEmpty) ...[
              Text(
                '${progress!.pending} ${progress.pending == 1 ? 'tarea pendiente' : 'tareas pendientes'} · ${columns.length} ${columns.length == 1 ? 'sector' : 'sectores'}',
                key: const ValueKey('board_summary'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpace.sm),
              Text('${progress.done} de ${progress.total} finalizadas'),
              ProgressLine(progress: progress),
              const SizedBox(height: AppSpace.lg),
              for (final column in columns) _SectorCard(column: column),
            ],
          ],
        ),
      ),
    );
  }
}

class _SectorCard extends StatelessWidget {
  const _SectorCard({required this.column});
  final BoardColumn column;
  @override
  Widget build(BuildContext context) {
    final progress = column.progress;
    final pending = column.tasks.where((t) => !t.isDone).toList();
    return Card(
      key: ValueKey('board_sector_${column.sector.id}'),
      semanticContainer: false,
      child: Padding(
        padding: AppSpace.page,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ListTile(
              key: ValueKey('board_open_sector_${column.sector.id}'),
              contentPadding: EdgeInsets.zero,
              leading: ColorDot(hex: column.color),
              title: Text(column.sector.name),
              subtitle: Text(
                '${progress.pending} ${progress.pending == 1 ? 'pendiente' : 'pendientes'}',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(Routes.sector(column.sector.id)),
            ),
            if (progress.total > 0) ...[
              Text('${progress.done} de ${progress.total} finalizadas'),
              ProgressLine(progress: progress),
            ] else
              Text(
                column.tasks.isEmpty
                    ? 'Sin tareas asignadas'
                    : 'Avance en las subtareas',
              ),
            const SizedBox(height: AppSpace.md),
            if (pending.isEmpty) const Text('Sin tareas pendientes.'),
            for (final task in pending) ...[
              const Divider(),
              Padding(
                key: ValueKey('board_task_${column.sector.id}_${task.id}'),
                padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (task.parentId != null)
                      Text(
                        'Subtarea de: ${task.parentText ?? 'Tarea principal'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    Text(
                      task.text,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Wrap(
                      spacing: AppSpace.sm,
                      runSpacing: AppSpace.sm,
                      children: [
                        ColorPill(
                          label: task.isContainer
                              ? 'En curso'
                              : task.status.name,
                          hex: task.status.color,
                        ),
                        if (task.isContainer)
                          Text(
                            '${task.subtaskDone}/${task.subtaskCount} subtareas',
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ColorDot(hex: task.workColor),
                        const SizedBox(width: AppSpace.sm),
                        Expanded(
                          child: Text(
                            task.contextLabel,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
