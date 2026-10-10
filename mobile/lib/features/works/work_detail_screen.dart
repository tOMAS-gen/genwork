import '../../shared/widgets/reorder_dialog.dart';
import '../../shared/widgets/task_board.dart';
import '../../core/providers.dart';
import '../objectives/objective_actions_menu.dart';
import '../objectives/objective_dialog.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../shell/resource_refresh.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/util/format.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/task.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/progress_line.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_composer.dart';
import '../../shared/widgets/task_tile.dart';
import '../tasks/task_actions.dart';
import '../tasks/task_detail_sheet.dart';
import 'works_providers.dart';
import 'work_actions_menu.dart';

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
      appBar: AppBar(
        title: Text(detail.value?.name ?? 'Proyecto'),
        actions: [
          if (detail.value != null && !detail.hasError)
            WorkActionsMenu(
              work: detail.value!,
              onDeleted: () {
                if (!mounted) return;
                refreshResources(ref);
                // Quitar el detalle también de la rama que lo abrió con push.
                final router = GoRouter.of(context);
                if (router.canPop()) router.pop();
                router.go(
                  detail.value?.isTemplate == true
                      ? Routes.templates
                      : Routes.works,
                );
              },
            ),
        ],
      ),
      body: AsyncValueView(
        value: detail,
        onRetry: () => ref.invalidate(workDetailProvider(widget.workId)),
        data: (work) {
          final canEdit = work.canOperate && !work.isArchived;
          Widget taskTile(Task task) => TaskTile(
            task: task,
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
          return Column(
            children: [
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(workDetailProvider(widget.workId).future),
                  child: ListView(
                    key: const ValueKey('work_detail_list'),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      _WorkHeader(work: work),
                      Padding(
                        padding: AppSpace.page,
                        child: Wrap(
                          spacing: 8,
                          children: [
                            TextButton.icon(
                              key: const ValueKey('work_document'),
                              onPressed: () =>
                                  context.push('/works/${work.id}/document'),
                              icon: const Icon(Icons.article_outlined),
                              label: const Text('Documentación'),
                            ),
                            TextButton.icon(
                              key: const ValueKey('work_files'),
                              onPressed: () =>
                                  context.push('/works/${work.id}/files'),
                              icon: const Icon(Icons.folder_outlined),
                              label: const Text('Archivos'),
                            ),
                          ],
                        ),
                      ),
                      TaskViewToggle(
                        board: _board,
                        onChanged: (v) => setState(() => _board = v),
                      ),
                      if (work.canManageObjectives)
                        Padding(
                          padding: AppSpace.page,
                          child: Wrap(
                            spacing: AppSpace.sm,
                            children: [
                              TextButton.icon(
                                key: const ValueKey('objective_create'),
                                onPressed: () =>
                                    showObjectiveDialog(context, work.id),
                                icon: const Icon(Icons.add),
                                label: const Text('Nuevo objetivo'),
                              ),
                              TextButton.icon(
                                key: const ValueKey(
                                  'objective_insert_template',
                                ),
                                onPressed: () => showObjectiveDialog(
                                  context,
                                  work.id,
                                  fromTemplate: true,
                                ),
                                icon: const Icon(Icons.library_books_outlined),
                                label: const Text('Insertar plantilla'),
                              ),
                            ],
                          ),
                        ),
                      for (final section in work.sections)
                        if (section.objective == null ||
                            section.tasks.isNotEmpty ||
                            canEdit) ...[
                          ExpansionTile(
                            key: PageStorageKey(
                              'work_section_${section.objective?.id ?? "general"}',
                            ),
                            initiallyExpanded: true,
                            title: Text(
                              section.objective?.title ?? 'Generales',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            subtitle: Text(
                              '${section.tasks.length} ${section.tasks.length == 1 ? 'tarea' : 'tareas'}',
                            ),
                            trailing:
                                section.objective != null &&
                                    work.canManageObjectives
                                ? ObjectiveActionsMenu(
                                    work: work,
                                    objective: section.objective!,
                                  )
                                : null,
                            children: [
                              if (canEdit && section.tasks.length > 1)
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    key: ValueKey(
                                      'section_reorder_${section.objective?.id ?? 'general'}',
                                    ),
                                    icon: const Icon(Icons.swap_vert),
                                    label: const Text('Ordenar tareas'),
                                    onPressed: () => showReorderDialog(
                                      context,
                                      title: 'Ordenar tareas',
                                      load: () async {
                                        final current = await ref
                                            .read(worksRepositoryProvider)
                                            .detail(work.id);
                                        return current.tasks
                                            .where(
                                              (t) =>
                                                  t.objectiveId ==
                                                  section.objective?.id,
                                            )
                                            .map(
                                              (t) => (
                                                id: t.id,
                                                label: t.displayText,
                                              ),
                                            )
                                            .toList();
                                      },
                                      save: (ids) => ref
                                          .read(taskActionsProvider)
                                          .reorder(
                                            work.id,
                                            section.objective?.id,
                                            ids,
                                          ),
                                    ),
                                  ),
                                ),
                              if (section.objective?.description?.isNotEmpty ==
                                  true)
                                Padding(
                                  padding: AppSpace.page,
                                  child: Text(section.objective!.description!),
                                ),
                              if (section.tasks.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.fromLTRB(
                                    AppSpace.lg,
                                    0,
                                    AppSpace.lg,
                                    AppSpace.sm,
                                  ),
                                  child: Text('Sin tareas'),
                                ),
                              if (_board)
                                TaskBoard(
                                  tasks: section.tasks,
                                  itemBuilder: taskTile,
                                )
                              else
                                for (final task in section.tasks)
                                  taskTile(task),
                            ],
                          ),
                        ],
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
                      prefixIcon: Icon(Icons.playlist_add),
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

class _WorkHeader extends StatelessWidget {
  const _WorkHeader({required this.work});

  final WorkDetail work;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(AppSpace.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            [
              work.code,
              work.groupName ?? 'Personal',
              if (work.isArchived) 'Archivado',
              if (work.isTemplate) 'Plantilla de objetivo',
            ].join(' · '),
            style: theme.textTheme.bodySmall,
          ),
          if (work.description != null && work.description!.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Text(work.description!),
          ],
          const SizedBox(height: AppSpace.md),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [
              if (work.stageName != null)
                ColorPill(label: work.stageName!, hex: work.stageColor),
              if (work.dueDate != null)
                ColorPill(label: 'Vence ${formatDay(work.dueDate!)}'),
              for (final l in work.labels)
                ColorPill(label: l.valueName, hex: l.color),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          ProgressLine(progress: work.progress),
        ],
      ),
    );
  }
}
