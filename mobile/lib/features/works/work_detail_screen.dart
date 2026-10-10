import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/task.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/brand_name.dart';
import '../../shared/widgets/gen_tab_bar.dart';
import '../../shared/widgets/reorder_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_board.dart';
import '../../shared/widgets/task_composer.dart';
import '../../shared/widgets/task_tile.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../objectives/objective_actions_menu.dart';
import '../objectives/objective_dialog.dart';
import '../shell/resource_refresh.dart';
import '../tasks/task_actions.dart';
import '../tasks/task_detail_sheet.dart';
import 'work_actions_menu.dart';
import 'work_summary.dart';
import 'works_providers.dart';

/// Detalle de proyecto: cabecera, tareas por sección (generales + objetivos) y
/// alta rápida de tareas en la sección elegida.
class WorkDetailScreen extends ConsumerStatefulWidget {
  const WorkDetailScreen({super.key, required this.workId});

  final String workId;

  @override
  ConsumerState<WorkDetailScreen> createState() => _WorkDetailScreenState();
}

class _WorkDetailScreenState extends ConsumerState<WorkDetailScreen> {
  /// Objetivo donde se crean las tareas nuevas (null = generales).
  String? _targetObjectiveId;
  bool _board = false;

  Future<void> _toggle(Task task) async {
    try {
      await ref.read(taskActionsProvider).toggleDone(task);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<bool> _create(String text) async {
    try {
      final work = ref.read(workDetailProvider(widget.workId)).value;
      final target =
          work?.objectives.any((o) => o.id == _targetObjectiveId) == true
          ? _targetObjectiveId
          : null;
      await ref
          .read(taskActionsProvider)
          .create(text, workId: widget.workId, objectiveId: target);
      return true;
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(workDetailProvider(widget.workId));

    Future<void> toggleDay(Task task) async {
      try {
        await ref.read(taskActionsProvider).setMyDay(task, !task.isInMyDay);
      } catch (e) {
        if (context.mounted) showErrorSnack(context, e);
      }
    }

    return Scaffold(
      appBar: AppBar(title: const BrandName(size: 16)),
      body: AsyncValueView(
        value: detail,
        onRetry: () => ref.invalidate(workDetailProvider(widget.workId)),
        data: (work) {
          final canEdit = work.canOperate && !work.isArchived;
          Widget taskTile(Task task) => TaskTile(
            task: task,
            flat: !_board,
            showSubtasks: !_board,
            showSector: true,
            onTap: () => showTaskDetail(
              context,
              task,
              canEdit: canEdit,
              canManageMyDay: work.canManageMyDay,
              workId: widget.workId,
            ),
            onToggleDone: canEdit ? () => _toggle(task) : null,
            onToggleMyDay: (task.canManageMyDay ?? work.canManageMyDay)
                ? () => toggleDay(task)
                : null,
            onSubtaskTap: (s) => showTaskDetail(
              context,
              s,
              canEdit: canEdit,
              canManageMyDay: work.canManageMyDay,
              workId: widget.workId,
            ),
            onSubtaskToggle: canEdit ? _toggle : null,
          );
          final menu = WorkActionsMenu(
            work: work,
            onDeleted: () {
              if (!mounted) return;
              refreshResources(ref);
              // Quitar el detalle también de la rama que lo abrió con push.
              final router = GoRouter.of(context);
              if (router.canPop()) router.pop();
              router.go(work.isTemplate ? Routes.templates : Routes.works);
            },
          );
          return Column(
            children: [
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(workDetailProvider(widget.workId).future),
                  child: ListView(
                    key: const ValueKey('work_detail_list'),
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: AppSpace.page,
                    children: [
                      _Breadcrumb(work: work),
                      const SizedBox(height: AppSpace.md),
                      WorkSummaryPanel(work: work, menu: menu),
                      const SizedBox(height: AppSpace.md),
                      WorkspacePanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            ColoredBox(
                              color: context.colors.field,
                              child: GenTabBar(
                                showIcons: true,
                                activeIndex: 0,
                                tabs: const [
                                  GenTabItem(
                                    label: 'Tareas',
                                    icon: AppIcons.check,
                                  ),
                                  GenTabItem(
                                    label: 'Documentos',
                                    icon: AppIcons.document,
                                  ),
                                  GenTabItem(
                                    label: 'Archivos',
                                    icon: AppIcons.projects,
                                  ),
                                ],
                                // Documentos y Archivos son pantallas propias.
                                onSelect: (i) {
                                  if (i == 1) {
                                    context.push('/works/${work.id}/document');
                                  } else if (i == 2) {
                                    context.push('/works/${work.id}/files');
                                  }
                                },
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(AppSpacing.sm),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Semantics(
                                    header: true,
                                    child: Text(
                                      'Tareas',
                                      style: AppTextStyles.dialogTitle.copyWith(
                                        color: context.colors.text,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '${work.progress.pending} ${work.progress.pending == 1 ? 'pendiente' : 'pendientes'}',
                                    style: AppTextStyles.supporting.copyWith(
                                      color: context.colors.muted,
                                    ),
                                  ),
                                  if (work.canManageObjectives) ...[
                                    const SizedBox(height: AppSpacing.sm),
                                    Wrap(
                                      spacing: AppSpacing.xs,
                                      runSpacing: AppSpacing.xs,
                                      children: [
                                        OutlinedButton.icon(
                                          key: const ValueKey(
                                            'objective_create',
                                          ),
                                          onPressed: () => showObjectiveDialog(
                                            context,
                                            work.id,
                                          ),
                                          icon: const Icon(
                                            AppIcons.add,
                                            size: AppIconSizes.field,
                                          ),
                                          label: const Text('Nuevo objetivo'),
                                        ),
                                        OutlinedButton.icon(
                                          key: const ValueKey(
                                            'objective_insert_template',
                                          ),
                                          onPressed: () => showObjectiveDialog(
                                            context,
                                            work.id,
                                            fromTemplate: true,
                                          ),
                                          icon: const Icon(
                                            AppIcons.templates,
                                            size: AppIconSizes.field,
                                          ),
                                          label: const Text(
                                            'Insertar plantilla',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: AppSpacing.sm),
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: TaskViewToggle(
                                      padding: EdgeInsets.zero,
                                      board: _board,
                                      onChanged: (v) =>
                                          setState(() => _board = v),
                                    ),
                                  ),
                                  for (final section in work.sections)
                                    if (section.objective == null ||
                                        section.tasks.isNotEmpty ||
                                        canEdit)
                                      _WorkSectionView(
                                        work: work,
                                        section: section,
                                        canEdit: canEdit,
                                        board: _board,
                                        taskTile: taskTile,
                                      ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpace.xl),
                    ],
                  ),
                ),
              ),
              if (canEdit) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpace.lg,
                    AppSpace.sm,
                    AppSpace.lg,
                    0,
                  ),
                  child: DropdownButtonFormField<String>(
                    key: ValueKey(
                      'work_composer_section_${_targetObjectiveId ?? "general"}',
                    ),
                    initialValue:
                        work.objectives.any((o) => o.id == _targetObjectiveId)
                        ? _targetObjectiveId
                        : '',
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Agregar tarea en',
                      prefixIcon: Icon(AppIcons.addToList),
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text('Generales'),
                      ),
                      for (final o in work.objectives)
                        DropdownMenuItem(
                          value: o.id,
                          child: Text(o.title, overflow: TextOverflow.ellipsis),
                        ),
                    ],
                    onChanged: (id) => setState(
                      () => _targetObjectiveId = id == '' ? null : id,
                    ),
                  ),
                ),
                TaskComposer(
                  workId: work.id,
                  objectiveId:
                      work.objectives.any((o) => o.id == _targetObjectiveId)
                      ? _targetObjectiveId
                      : null,
                  hint: _targetObjectiveId == null
                      ? 'Nueva tarea en Generales…'
                      : 'Nueva tarea…',
                  onSubmit: _create,
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// «Todos los proyectos / Nombre», como las migas de la web.
class _Breadcrumb extends StatelessWidget {
  const _Breadcrumb({required this.work});

  final WorkDetail work;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = AppTextStyles.itemTitle.copyWith(
      fontWeight: FontWeight.w400,
      color: c.muted,
    );
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        InkWell(
          key: const ValueKey('work_breadcrumb_root'),
          onTap: () =>
              context.go(work.isTemplate ? Routes.templates : Routes.works),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
            child: Text(
              work.isTemplate
                  ? 'Plantillas de objetivo'
                  : 'Todos los proyectos',
              style: style,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
          child: Text('/', style: style.copyWith(color: c.outline)),
        ),
        Text(work.name, style: style),
      ],
    );
  }
}

/// Sección de tareas: «TAREAS GENERALES» (rótulo) o un objetivo con acento a la
/// izquierda, estado «Completo», acciones y avance.
class _WorkSectionView extends ConsumerWidget {
  const _WorkSectionView({
    required this.work,
    required this.section,
    required this.canEdit,
    required this.board,
    required this.taskTile,
  });

  final WorkDetail work;
  final WorkSection section;
  final bool canEdit, board;
  final Widget Function(Task) taskTile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final objective = section.objective;
    final tasks = section.tasks;
    final done = tasks.where((t) => t.isDone).length;
    final complete = tasks.isNotEmpty && done == tasks.length;
    final accent = complete ? c.ok : c.brand;

    final body = <Widget>[
      if (canEdit && tasks.length > 1)
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            key: ValueKey('section_reorder_${objective?.id ?? 'general'}'),
            icon: const Icon(AppIcons.reorder),
            label: const Text('Ordenar tareas'),
            onPressed: () => showReorderDialog(
              context,
              title: 'Ordenar tareas',
              load: () async {
                final current = await ref
                    .read(worksRepositoryProvider)
                    .detail(work.id);
                return current.tasks
                    .where((t) => t.objectiveId == objective?.id)
                    .map((t) => (id: t.id, label: t.displayText))
                    .toList();
              },
              save: (ids) => ref
                  .read(taskActionsProvider)
                  .reorder(work.id, objective?.id, ids),
            ),
          ),
        ),
      if (objective?.description?.isNotEmpty == true)
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.xs),
          child: Text(
            objective!.description!,
            style: AppTextStyles.body.copyWith(color: c.muted),
          ),
        ),
      if (tasks.isEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.xs),
          child: Text(
            'Sin tareas',
            style: AppTextStyles.body.copyWith(color: c.muted),
          ),
        ),
      if (board)
        TaskBoard(tasks: tasks, itemBuilder: taskTile)
      else
        for (var i = 0; i < tasks.length; i++) ...[
          if (i > 0) Divider(height: 1, color: c.border),
          taskTile(tasks[i]),
        ],
    ];

    if (objective == null) {
      return Padding(
        padding: const EdgeInsets.only(top: AppSpacing.sm),
        child: Column(
          key: const PageStorageKey('work_section_general'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xs,
                vertical: AppSpacing.xs,
              ),
              child: Text(
                'TAREAS GENERALES',
                style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
              ),
            ),
            ...body,
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(color: accent, width: kActiveTickWidth),
          ),
        ),
        child: ExpansionTile(
          key: PageStorageKey('work_section_${objective.id}'),
          initiallyExpanded: true,
          tilePadding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          childrenPadding: const EdgeInsets.only(left: AppSpacing.xs),
          title: Row(
            children: [
              Flexible(
                child: Text(
                  objective.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.itemTitle.copyWith(color: c.text),
                ),
              ),
              if (complete) ...[
                const SizedBox(width: AppSpacing.xs),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xs,
                    vertical: AppSpacing.xxs / 2,
                  ),
                  decoration: BoxDecoration(
                    color: c.successFill,
                    borderRadius: AppGeometry.chip,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        AppIcons.success,
                        size: AppIconSizes.compact,
                        color: c.successText,
                      ),
                      const SizedBox(width: AppSpacing.xxs),
                      Text(
                        'Completo',
                        style: AppTextStyles.supporting.copyWith(
                          fontWeight: FontWeight.w600,
                          color: c.successText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: AppSpacing.xxs),
            child: Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: tasks.isEmpty ? 0 : done / tasks.length,
                    minHeight: 4,
                    color: accent,
                    backgroundColor: c.outline,
                    borderRadius: AppGeometry.pill,
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  tasks.isEmpty
                      ? '0 tareas'
                      : '$done/${tasks.length} · ${(done / tasks.length * 100).round()}%',
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
              ],
            ),
          ),
          trailing: work.canManageObjectives
              ? ObjectiveActionsMenu(work: work, objective: objective)
              : null,
          children: body,
        ),
      ),
    );
  }
}
