import '../../shared/widgets/task_board.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/progress_line.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_composer.dart';
import '../../shared/widgets/task_tile.dart';
import '../tasks/task_actions.dart';
import '../tasks/task_detail_sheet.dart';
import 'sectors_providers.dart';
import 'sector_actions_menu.dart';
import '../shell/resource_refresh.dart';

/// Tablero de un sector: sueltas, por proyecto y menciones según permisos.
class SectorDetailScreen extends ConsumerStatefulWidget {
  const SectorDetailScreen({super.key, required this.sectorId});

  final String sectorId;

  @override
  ConsumerState<SectorDetailScreen> createState() => _SectorDetailScreenState();
}

class _SectorDetailScreenState extends ConsumerState<SectorDetailScreen> {
  /// null = todas, false = pendientes, true = hechas.
  bool? _done = false;
  bool _board = false;

  SectorBoardQuery get _query => (id: widget.sectorId, done: _done);

  Future<void> _toggle(Task task) async {
    try {
      await ref.read(taskActionsProvider).toggleDone(task);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _toggleDay(Task task) async {
    try {
      await ref.read(taskActionsProvider).setMyDay(task, !task.isInMyDay);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<bool> _create(String text) async {
    try {
      await ref
          .read(taskActionsProvider)
          .create(text, sectorId: widget.sectorId);
      return true;
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final board = ref.watch(sectorBoardProvider(_query));

    return Scaffold(
      appBar: AppBar(
        title: Text(board.value?.name ?? 'Sector'),
        actions: [
          if (board.value != null && !board.hasError)
            SectorActionsMenu(
              id: board.value!.id,
              name: board.value!.name,
              color: board.value!.color,
              onDeleted: () {
                if (!mounted) return;
                refreshResources(ref);
                // Quitar el detalle también de la rama que lo abrió con push.
                final router = GoRouter.of(context);
                if (router.canPop()) router.pop();
                router.go(Routes.sectors);
              },
            ),
        ],
      ),
      body: AsyncValueView(
        value: board,
        onRetry: () => ref.invalidate(sectorBoardProvider(_query)),
        data: (b) {
          Widget tile(
            Task t, {
            required bool editable,
            bool showWork = false,
          }) => TaskTile(
            task: t,
            showSubtasks: !_board,
            showWork: showWork,
            onTap: () => showTaskDetail(
              context,
              t,
              canEdit: editable,
              fromSector: true,
              sectorId: widget.sectorId,
            ),
            onToggleDone: editable ? () => _toggle(t) : null,
            onToggleMyDay: t.canManageMyDay == true
                ? () => _toggleDay(t)
                : null,
            onSubtaskTap: (s) => showTaskDetail(
              context,
              s,
              canEdit: editable,
              fromSector: true,
              sectorId: widget.sectorId,
            ),
            onSubtaskToggle: editable ? _toggle : null,
          );

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.lg,
                  AppSpace.sm,
                  AppSpace.lg,
                  AppSpace.sm,
                ),
                child: Column(
                  children: [
                    ProgressLine(progress: b.progress),
                    const SizedBox(height: AppSpace.sm),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SegmentedButton<bool?>(
                        key: const ValueKey('sector_filter'),
                        segments: const [
                          ButtonSegment(
                            value: false,
                            label: Text('Pendientes'),
                          ),
                          ButtonSegment(value: true, label: Text('Hechas')),
                          ButtonSegment(value: null, label: Text('Todas')),
                        ],
                        showSelectedIcon: false,
                        selected: {_done},
                        onSelectionChanged: (s) =>
                            setState(() => _done = s.first),
                      ),
                    ),
                  ],
                ),
              ),
              TaskViewToggle(
                board: _board,
                onChanged: (v) => setState(() => _board = v),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(sectorBoardProvider(_query).future),
                  child: ListView(
                    key: const ValueKey('sector_board_list'),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      if (_board)
                        TaskBoard(
                          tasks: [
                            ...b.loose,
                            ...b.byWork.expand((g) => g.tasks),
                            ...b.refs,
                          ],
                          itemBuilder: (t) =>
                              tile(t, editable: b.canOperate, showWork: true),
                        ),
                      if (!_board) ...[
                        if (b.loose.isEmpty &&
                            b.byWork.isEmpty &&
                            b.refs.isEmpty)
                          const Padding(
                            padding: EdgeInsets.only(
                              top: AppSpace.bottomClearance,
                            ),
                            child: EmptyView(message: 'Sin tareas'),
                          ),
                        if (b.loose.isNotEmpty) ...[
                          const _Header('Sueltas'),
                          for (final t in b.loose)
                            tile(t, editable: b.canOperate),
                        ],
                        for (final group in b.byWork) ...[
                          _Header(
                            group.work.name,
                            onTap: () =>
                                context.push(Routes.work(group.work.id)),
                          ),
                          for (final t in group.tasks)
                            tile(t, editable: b.canOperate),
                        ],
                        if (b.refs.isNotEmpty) ...[
                          const _Header('Menciones'),
                          for (final t in b.refs)
                            tile(t, editable: b.canOperate, showWork: true),
                        ],
                      ],
                      const SizedBox(height: AppSpace.xl),
                    ],
                  ),
                ),
              ),
              if (b.canOperate)
                TaskComposer(
                  sectorId: widget.sectorId,
                  hint: 'Nueva tarea en ${b.name}…',
                  onSubmit: _create,
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.title, {this.onTap});

  final String title;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    dense: true,
    onTap: onTap,
    title: Semantics(
      header: true,
      child: Text(title, style: Theme.of(context).textTheme.titleSmall),
    ),
    trailing: onTap == null ? null : const Icon(Icons.chevron_right),
  );
}
