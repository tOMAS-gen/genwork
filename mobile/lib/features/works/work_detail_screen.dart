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
import '../../shared/widgets/breadcrumb.dart';
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
import '../tasks/task_row_actions.dart';
import '../../shared/widgets/dashed_border.dart';
import '../../shared/widgets/count_badge.dart';
import 'work_metadata_dialog.dart';
import 'works_dashboard.dart';
import '../../shared/widgets/progress_bar.dart';
import '../../shared/widgets/row_actions_menu.dart';
import '../../shared/widgets/content_width.dart';

/// Detalle de proyecto: cabecera, tareas por sección (generales + objetivos) y
/// alta rápida de tareas en la sección elegida.
class WorkDetailScreen extends ConsumerStatefulWidget {
  const WorkDetailScreen({
    super.key,
    required this.workId,
    this.initialObjectiveId,
  });

  final String workId;
  final String? initialObjectiveId;

  @override
  ConsumerState<WorkDetailScreen> createState() => _WorkDetailScreenState();
}

class _WorkDetailScreenState extends ConsumerState<WorkDetailScreen> {
  /// Objetivo donde se crean las tareas nuevas (null = generales).
  String? _targetObjectiveId;
  bool _board = false;
  final _objectiveKeys = <String, GlobalKey>{};

  /// Objetivos plegados (por id).
  final _collapsed = <String>{};
  bool _revealedObjective = false;

  @override
  void didUpdateWidget(covariant WorkDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.workId != widget.workId) {
      _targetObjectiveId = null;
      _objectiveKeys.clear();
    }
    if (oldWidget.workId != widget.workId ||
        oldWidget.initialObjectiveId != widget.initialObjectiveId) {
      _revealedObjective = false;
    }
  }

  Future<void> _toggle(Task task) async {
    try {
      await ref.read(taskActionsProvider).toggleDone(task);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  /// Selector de la fecha límite, como el `DatePicker` del detalle web.
  Future<void> _pickDue(WorkDetail work) async {
    final initial = work.dueDate ?? DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(initial.year < 2000 ? initial.year : 2000),
      lastDate: DateTime(initial.year > 2100 ? initial.year : 2100, 12, 31),
    );
    if (date != null && mounted) await _saveDue(work, date);
  }

  Future<void> _saveDue(WorkDetail work, DateTime? date) async {
    try {
      await ref
          .read(worksRepositoryProvider)
          .update(work.id, dueDate: date, clearDueDate: date == null);
      refreshResources(ref);
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
      body: ContentWidth(
        child: AsyncValueView(
          value: detail,
          onRetry: () => ref.invalidate(workDetailProvider(widget.workId)),
          errorTitle: 'No se pudo cargar el proyecto',
          data: (work) {
            final canEdit = work.canOperate && !work.isArchived;
            if (!_revealedObjective && widget.initialObjectiveId != null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted) return;
                final target =
                    _objectiveKeys[widget.initialObjectiveId]?.currentContext;
                if (target != null) {
                  setState(() => _collapsed.remove(widget.initialObjectiveId));
                  _revealedObjective = true;
                  Scrollable.ensureVisible(target, alignment: 0);
                }
              });
            }
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
              // Como la fila de la web: + para una subtarea y × para eliminar
              // (en el tablero las acciones van en el detalle).
              onAddSubtask: canEdit && !_board && task.parentId == null
                  ? () => promptSubtask(context, task)
                  : null,
              onDelete: canEdit && !_board
                  ? () => confirmDeleteTask(context, ref, task)
                  : null,
              onSubtaskMyDay: (s) {
                if (s.canManageMyDay == true) toggleDay(s);
              },
              onSubtaskDelete: canEdit && !_board
                  ? (s) => confirmDeleteTask(context, ref, s)
                  : null,
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
                    // Slivers perezosos: solo se construyen las tareas
                    // visibles (T2).
                    child: CustomScrollView(
                      key: const ValueKey('work_detail_list'),
                      physics: const AlwaysScrollableScrollPhysics(),
                      slivers: [
                        SliverPadding(
                          padding: AppSpace.page.copyWith(bottom: 0),
                          sliver: SliverToBoxAdapter(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Breadcrumb(
                                  rootKey: const ValueKey(
                                    'work_breadcrumb_root',
                                  ),
                                  rootLabel: work.isTemplate
                                      ? 'Plantillas de objetivo'
                                      : 'Todos los proyectos',
                                  onRoot: () => context.go(
                                    work.isTemplate
                                        ? Routes.templates
                                        : Routes.works,
                                  ),
                                ),
                                const SizedBox(height: AppSpace.md),
                                WorkSummaryPanel(
                                  work: work,
                                  menu: menu,
                                  onPickDue: work.canOperate && !work.isArchived
                                      ? () => _pickDue(work)
                                      : null,
                                  onClearDue:
                                      work.canOperate && !work.isArchived
                                      ? () => _saveDue(work, null)
                                      : null,
                                  onEditLabels:
                                      work.canOperate && !work.isArchived
                                      ? () => showWorkMetadata(
                                          context,
                                          work,
                                          labels: true,
                                        )
                                      : null,
                                ),
                                const SizedBox(height: AppSpace.md),
                              ],
                            ),
                          ),
                        ),

                        SliverPadding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpace.gutter,
                          ),
                          sliver: PanelSliver(
                            sliver: SliverMainAxisGroup(
                              slivers: [
                                SliverToBoxAdapter(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.vertical(
                                          top: AppGeometry.card.topLeft,
                                        ),
                                        child: ColoredBox(
                                          color: context.colors.field,
                                          child: GenTabBar(
                                            showIcons: true,
                                            activeIndex: 0,
                                            tabs: [
                                              GenTabItem(
                                                label: 'Tareas',
                                                icon: AppIcons.check,
                                              ),
                                              const GenTabItem(
                                                label: 'Materiales',
                                                icon: AppIcons.materials,
                                              ),
                                              GenTabItem(
                                                label: 'Documentos',
                                                icon: AppIcons.document,
                                              ),
                                              GenTabItem(
                                                label: 'Archivos',
                                                icon: AppIcons.projects,
                                              ),
                                              const GenTabItem(
                                                label: 'Actividad',
                                                icon: AppIcons.schedule,
                                              ),
                                              if (work.canManageClients)
                                                const GenTabItem(
                                                  label: 'Acceso cliente',
                                                  icon: AppIcons.view,
                                                ),
                                            ],
                                            // Documentos y Archivos son pantallas propias.
                                            onSelect: (i) {
                                              const pages = [
                                                null,
                                                'materials',
                                                'document',
                                                'files',
                                                'activity',
                                                'clients',
                                              ];
                                              final page = pages[i];
                                              if (page != null) {
                                                context.push(
                                                  '/works/${work.id}/$page',
                                                );
                                              }
                                            },
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.fromLTRB(
                                          AppSpacing.sm,
                                          AppSpacing.sm,
                                          AppSpacing.sm,
                                          0,
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Semantics(
                                              header: true,
                                              child: Text(
                                                'Tareas',
                                                style: AppTextStyles.dialogTitle
                                                    .copyWith(
                                                      color:
                                                          context.colors.text,
                                                    ),
                                              ),
                                            ),
                                            Text(
                                              '${work.progress.pending} ${work.progress.pending == 1 ? 'pendiente' : 'pendientes'}',
                                              style: AppTextStyles.supporting
                                                  .copyWith(
                                                    color: context.colors.muted,
                                                  ),
                                            ),
                                            // Una sola fila: Lista | Tablero y, a la
                                            // derecha, "+ Objetivo" y "⋯" con Insertar
                                            // plantilla (P07-M4).
                                            const SizedBox(
                                              height: AppSpacing.sm,
                                            ),
                                            Wrap(
                                              alignment:
                                                  WrapAlignment.spaceBetween,
                                              crossAxisAlignment:
                                                  WrapCrossAlignment.center,
                                              spacing: AppSpacing.xs,
                                              runSpacing: AppSpacing.xs,
                                              children: [
                                                TaskViewToggle(
                                                  padding: EdgeInsets.zero,
                                                  compact: true,
                                                  board: _board,
                                                  onChanged: (v) => setState(
                                                    () => _board = v,
                                                  ),
                                                ),
                                                if (work.canManageObjectives)
                                                  Row(
                                                    mainAxisSize:
                                                        MainAxisSize.min,
                                                    children: [
                                                      OutlinedButton.icon(
                                                        key: const ValueKey(
                                                          'objective_create',
                                                        ),
                                                        onPressed: () =>
                                                            showObjectiveDialog(
                                                              context,
                                                              work.id,
                                                            ),
                                                        icon: const Icon(
                                                          AppIcons.add,
                                                          size: AppIconSizes
                                                              .field,
                                                        ),
                                                        label: const Text(
                                                          'Objetivo',
                                                        ),
                                                      ),
                                                      RowActionsMenu(
                                                        key: const ValueKey(
                                                          'work_tasks_more',
                                                        ),
                                                        tooltip:
                                                            'Más acciones de tareas',
                                                        actions: [
                                                          RowAction(
                                                            key:
                                                                'objective_insert_template',
                                                            label:
                                                                'Insertar plantilla',
                                                            onSelected: () =>
                                                                showObjectiveDialog(
                                                                  context,
                                                                  work.id,
                                                                  fromTemplate:
                                                                      true,
                                                                ),
                                                          ),
                                                        ],
                                                      ),
                                                    ],
                                                  ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                for (final section in work.sections)
                                  if (section.objective == null ||
                                      section.tasks.isNotEmpty ||
                                      canEdit)
                                    SliverPadding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: AppSpacing.sm,
                                      ),
                                      sliver: _WorkSectionView(
                                        headerKey: section.objective == null
                                            ? null
                                            : _objectiveKeys.putIfAbsent(
                                                section.objective!.id,
                                                GlobalKey.new,
                                              ),
                                        work: work,
                                        section: section,
                                        expanded: !_collapsed.contains(
                                          section.objective?.id,
                                        ),
                                        onToggle: section.objective == null
                                            ? null
                                            : () => setState(() {
                                                final id =
                                                    section.objective!.id;
                                                if (!_collapsed.remove(id)) {
                                                  _collapsed.add(id);
                                                }
                                              }),
                                        canEdit: canEdit,
                                        board: _board,
                                        taskTile: taskTile,
                                      ),
                                    ),
                                const SliverToBoxAdapter(
                                  child: SizedBox(height: AppSpacing.sm),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(
                          child: SizedBox(height: AppSpace.xl),
                        ),
                      ],
                    ),
                  ),
                ),
                if (canEdit) ...[
                  TaskComposer(
                    workId: work.id,
                    // El destino como chip dentro del campo (P07-M1).
                    destination: ComposerTarget(
                      key: ValueKey(
                        'work_composer_section_${_targetObjectiveId ?? "general"}',
                      ),
                      selected:
                          work.objectives.any((o) => o.id == _targetObjectiveId)
                          ? _targetObjectiveId!
                          : '',
                      options: {
                        '': 'Generales',
                        for (final o in work.objectives) o.id: o.title,
                      },
                      onSelected: (id) => setState(
                        () => _targetObjectiveId = id == '' ? null : id,
                      ),
                    ),
                    objectiveId:
                        work.objectives.any((o) => o.id == _targetObjectiveId)
                        ? _targetObjectiveId
                        : null,
                    hint: 'Nueva tarea…',
                    onSubmit: _create,
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Sección de tareas como grupo de slivers: «TAREAS GENERALES» (rótulo) o un
/// objetivo con acento a la izquierda, estado «Completo», acciones y avance.
/// Las tareas se construyen de a una, solo las visibles (T2).
class _WorkSectionView extends ConsumerWidget {
  const _WorkSectionView({
    this.headerKey,
    required this.work,
    required this.section,
    required this.expanded,
    required this.onToggle,
    required this.canEdit,
    required this.board,
    required this.taskTile,
  });

  /// Para llevar el encabezado del objetivo a la vista desde un enlace.
  final GlobalKey? headerKey;
  final WorkDetail work;
  final WorkSection section;
  final bool expanded, canEdit, board;
  final VoidCallback? onToggle;
  final Widget Function(Task) taskTile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final objective = section.objective;
    final tasks = section.tasks;
    // Como la web: el avance cuenta las hojas (una tarea con subtareas aporta
    // sus subtareas, no ella misma).
    final (:done, :total) = leafProgress(tasks);
    final complete = total > 0 && done == total;
    final accent = complete ? c.ok : c.brand;

    final intro = <Widget>[
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
          child: DashedBorder(
            color: c.outline,
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Text(
                objective == null ? 'Sin tareas generales.' : 'Sin tareas.',
                style: AppTextStyles.body.copyWith(color: c.muted),
              ),
            ),
          ),
        ),
    ];

    final body = <Widget>[
      if (intro.isNotEmpty)
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: intro,
          ),
        ),
      if (board)
        SliverToBoxAdapter(
          child: TaskBoard(tasks: tasks, itemBuilder: taskTile),
        )
      else
        SliverList.separated(
          itemCount: tasks.length,
          separatorBuilder: (_, _) => Divider(height: 1, color: c.border),
          itemBuilder: (_, i) => taskTile(tasks[i]),
        ),
    ];

    if (objective == null) {
      return SliverMainAxisGroup(
        key: const PageStorageKey('work_section_general'),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.xs,
                AppSpacing.md,
                AppSpacing.xs,
                AppSpacing.xs,
              ),
              child: Text(
                'TAREAS GENERALES',
                style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
              ),
            ),
          ),
          ...body,
        ],
      );
    }

    final header = Semantics(
      expanded: expanded,
      child: InkWell(
        key: ValueKey('work_section_${objective.id}'),
        onTap: onToggle,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xs,
            vertical: AppSpacing.xs,
          ),
          child: Row(
            children: [
              // La flecha a la izquierda, como el encabezado de objetivo web.
              Icon(
                expanded ? AppIcons.expandMore : AppIcons.chevronRight,
                size: AppIconSizes.action,
                color: c.muted,
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            objective.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.itemTitle.copyWith(
                              color: c.text,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        CountBadge(
                          count: tasks.length,
                          singular: 'tarea',
                          plural: 'tareas',
                        ),
                        if (complete) ...[
                          const SizedBox(width: AppSpacing.xs),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.xs,
                              vertical: AppSpacing.hairline,
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
                    const SizedBox(height: AppSpacing.xxs),
                    Row(
                      children: [
                        Expanded(
                          child: ProgressBar(
                            value: total == 0 ? 0 : done / total,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          total == 0
                              ? '0 tareas'
                              : '$done/$total · ${(done / total * 100).round()}%',
                          style: AppTextStyles.supporting.copyWith(
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (work.canManageObjectives)
                ObjectiveActionsMenu(work: work, objective: objective),
            ],
          ),
        ),
      ),
    );

    return SliverPadding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      sliver: DecoratedSliver(
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(color: accent, width: kActiveTickWidth),
          ),
        ),
        sliver: SliverMainAxisGroup(
          key: PageStorageKey('work_section_group_${objective.id}'),
          slivers: [
            SliverToBoxAdapter(
              child: KeyedSubtree(key: headerKey, child: header),
            ),
            if (expanded)
              SliverPadding(
                padding: const EdgeInsets.only(left: AppSpacing.xs),
                sliver: SliverMainAxisGroup(slivers: body),
              ),
          ],
        ),
      ),
    );
  }
}
