import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/brand_name.dart';
import '../../shared/widgets/breadcrumb.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_board.dart';
import '../../shared/widgets/task_composer.dart';
import '../../shared/widgets/task_tile.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../shell/resource_refresh.dart';
import '../tasks/task_actions.dart';
import '../tasks/task_detail_sheet.dart';
import 'sector_actions_menu.dart';
import 'sector_summary.dart';
import 'sectors_providers.dart';

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
      appBar: AppBar(title: const BrandName(size: 16)),
      body: AsyncValueView(
        value: board,
        onRetry: () => ref.invalidate(sectorBoardProvider(_query)),
        data: (b) {
          final c = context.colors;
          Widget tile(
            Task t, {
            required bool editable,
            bool showWork = false,
          }) => TaskTile(
            task: t,
            flat: !_board,
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
          Widget rows(
            List<Task> tasks, {
            required bool editable,
            bool showWork = false,
          }) => Column(
            children: [
              for (var i = 0; i < tasks.length; i++) ...[
                if (i > 0) Divider(height: 1, color: c.border),
                tile(tasks[i], editable: editable, showWork: showWork),
              ],
            ],
          );
          final menu = SectorActionsMenu(
            id: b.id,
            name: b.name,
            color: b.color,
            onDeleted: () {
              if (!mounted) return;
              refreshResources(ref);
              // Quitar el detalle también de la rama que lo abrió con push.
              final router = GoRouter.of(context);
              if (router.canPop()) router.pop();
              router.go(Routes.sectors);
            },
          );
          final pending = b.progress.pending;
          return Column(
            children: [
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(sectorBoardProvider(_query).future),
                  child: ListView(
                    key: const ValueKey('sector_board_list'),
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: AppSpace.page,
                    children: [
                      Breadcrumb(
                        rootLabel: 'Sectores',
                        onRoot: () => context.go(Routes.sectors),
                        current: b.name,
                      ),
                      const SizedBox(height: AppSpace.md),
                      SectorSummaryPanel(board: b, menu: menu),
                      const SizedBox(height: AppSpace.md),
                      WorkspacePanel(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Semantics(
                                          header: true,
                                          child: Text(
                                            'Tareas',
                                            style: AppTextStyles.dialogTitle
                                                .copyWith(color: c.text),
                                          ),
                                        ),
                                        Text(
                                          '$pending ${pending == 1 ? 'pendiente' : 'pendientes'}',
                                          style: AppTextStyles.supporting
                                              .copyWith(color: c.muted),
                                        ),
                                      ],
                                    ),
                                  ),
                                  TaskViewToggle(
                                    padding: EdgeInsets.zero,
                                    board: _board,
                                    onChanged: (v) =>
                                        setState(() => _board = v),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: SegmentedButton<bool?>(
                                  key: const ValueKey('sector_filter'),
                                  segments: const [
                                    ButtonSegment(
                                      value: false,
                                      label: Text('Pendientes'),
                                    ),
                                    ButtonSegment(
                                      value: true,
                                      label: Text('Hechas'),
                                    ),
                                    ButtonSegment(
                                      value: null,
                                      label: Text('Todas'),
                                    ),
                                  ],
                                  showSelectedIcon: false,
                                  selected: {_done},
                                  onSelectionChanged: (s) =>
                                      setState(() => _done = s.first),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              if (_board)
                                TaskBoard(
                                  tasks: [
                                    ...b.loose,
                                    ...b.byWork.expand((g) => g.tasks),
                                    ...b.refs,
                                  ],
                                  itemBuilder: (t) => tile(
                                    t,
                                    editable: b.canOperate,
                                    showWork: true,
                                  ),
                                ),
                              if (!_board) ...[
                                if (b.loose.isEmpty &&
                                    b.byWork.isEmpty &&
                                    b.refs.isEmpty)
                                  const EmptyView(
                                    icon: AppIcons.check,
                                    message:
                                        'Sin tareas todavía.\nEscribí la primera tarea abajo para empezar a organizar el sector.',
                                  ),
                                if (b.loose.isNotEmpty) ...[
                                  const _Header('Sueltas'),
                                  rows(b.loose, editable: b.canOperate),
                                ],
                                for (final group in b.byWork) ...[
                                  _Header(
                                    group.work.name,
                                    onTap: () => context.push(
                                      Routes.work(group.work.id),
                                    ),
                                  ),
                                  rows(group.tasks, editable: b.canOperate),
                                ],
                                if (b.refs.isNotEmpty) ...[
                                  const _Header('Menciones'),
                                  rows(
                                    b.refs,
                                    editable: b.canOperate,
                                    showWork: true,
                                  ),
                                ],
                              ],
                            ],
                          ),
                        ),
                      ),
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

/// Rótulo de grupo de tareas («SUELTAS», nombre de proyecto, «MENCIONES») como
/// el de la web; con [onTap] lleva al proyecto.
class _Header extends StatelessWidget {
  const _Header(this.title, {this.onTap});

  final String title;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xs,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Expanded(
              child: Semantics(
                header: true,
                child: Text(
                  title.toUpperCase(),
                  style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
                ),
              ),
            ),
            if (onTap != null)
              Icon(
                AppIcons.chevronRight,
                size: AppIconSizes.field,
                color: c.muted,
              ),
          ],
        ),
      ),
    );
  }
}
