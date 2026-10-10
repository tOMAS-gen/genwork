import '../../shared/widgets/task_text_field.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../shared/widgets/reorder_dialog.dart';
import '../works/works_providers.dart';
import 'task_move_dialog.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/util/format.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/app_button_styles.dart';
import '../../shared/widgets/app_work_section.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/status_chip.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_composer.dart';
import 'task_actions.dart';
import 'task_detail_provider.dart';

/// Abre el detalle de una tarea en pantalla completa.
///
/// [canEdit]: permiso de modificar (si el endpoint no trae `canToggle`, lo decide
/// el contenedor: acceso `operate` al proyecto/sector). [fromSector]: la edición de
/// texto se hace en contexto sector (reglas distintas en el servidor).
Future<void> showTaskDetail(
  BuildContext context,
  Task task, {
  required bool canEdit,
  bool canManageMyDay = false,
  bool fromSector = false,
  bool readOnly = false,
  String? workId,
  String? sectorId,
}) {
  return Navigator.of(context, rootNavigator: true).push<void>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => TaskDetailSheet(
        task: task,
        canEdit: !readOnly && canEdit && task.canToggle != false,
        canManageMyDay: !readOnly && (task.canManageMyDay ?? canManageMyDay),
        fromSector: fromSector,
        workId: workId,
        sectorId: sectorId,
      ),
    ),
  );
}

class TaskDetailSheet extends ConsumerStatefulWidget {
  const TaskDetailSheet({
    super.key,
    required this.task,
    required this.canEdit,
    required this.canManageMyDay,
    required this.fromSector,
    this.workId,
    this.sectorId,
  });

  final Task task;
  final bool canEdit;
  final bool canManageMyDay;
  final bool fromSector;
  final String? workId;
  final String? sectorId;

  @override
  ConsumerState<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends ConsumerState<TaskDetailSheet> {
  late Task _task = widget.task;
  late final _textController = TaskTextController(text: widget.task.rawText);
  late final _descriptionController = TextEditingController(
    text: widget.task.description ?? '',
  );
  bool _busy = false;
  Task? _receivedTask;

  TaskDetailQuery get _query =>
      (id: widget.task.id, workId: widget.workId, sectorId: widget.sectorId);

  void _acceptTask(Task task) {
    if (identical(task, _receivedTask)) return;
    _receivedTask = task;
    // Una recarga nunca pisa un borrador escrito en esta hoja.
    if (_textController.text == _task.rawText) {
      _textController.text = task.rawText;
    }
    if (_descriptionController.text == (_task.description ?? '')) {
      _descriptionController.text = task.description ?? '';
    }
    _task = task;
  }

  @override
  void dispose() {
    _textController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _run(
    Future<void> Function(TaskActions actions) action, {
    bool close = false,
  }) async {
    setState(() => _busy = true);
    try {
      await action(ref.read(taskActionsProvider));
      if (close && mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Borrar tarea'),
        content: Text(
          _task.subtaskCount > 0
              ? 'Se borrará la tarea y sus ${_task.subtaskCount} subtareas.'
              : '¿Borrar esta tarea?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('task_delete_confirm'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Borrar'),
          ),
        ],
      ),
    );
    if (ok == true) await _run((a) => a.delete(_task), close: true);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final detail = ref.watch(taskDetailProvider(_query));
    final latest = detail.value;
    if (latest?.task case final Task task) _acceptTask(task);
    final unavailable =
        detail.hasError || (detail.hasValue && latest?.task == null);
    final canEdit =
        widget.canEdit &&
        !_busy &&
        !unavailable &&
        (latest?.canOperate ?? true) &&
        _task.canToggle != false;
    final workContext = widget.workId == null
        ? null
        : ref.watch(workDetailProvider(widget.workId!)).value;
    final canEditText =
        canEdit && _task.canEditText(fromSector: widget.fromSector);
    final canManageMyDay =
        widget.canManageMyDay &&
        !unavailable &&
        (latest?.canManageMyDay ?? true);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const ValueKey('task_close'),
          tooltip: 'Cerrar detalle',
          onPressed: () => Navigator.pop(context),
          icon: const Icon(AppIcons.close),
        ),
        title: Text(
          _task.displayText,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SafeArea(
        child: ListView(
          key: const ValueKey('task_detail_list'),
          padding: AppSpace.page,
          children: [
            if (_busy || detail.isLoading) const LinearProgressIndicator(),
            if (detail.hasError)
              ErrorView(
                error: detail.error!,
                onRetry: () => ref.invalidate(taskDetailProvider(_query)),
              ),
            if (detail.hasValue && latest?.task == null)
              const Text('La tarea ya no está disponible en esta vista.'),
            TaskTextField(
              fieldKey: 'task_text_field',
              workId: _task.workId ?? widget.workId,
              sectorId: widget.fromSector ? widget.sectorId : null,
              controller: _textController,
              enabled: canEditText,
              maxLines: null,
              style: Theme.of(context).textTheme.titleMedium,
              decoration: const InputDecoration(labelText: 'Tarea'),
              onSubmitted: (value) => _run(
                (a) => a.updateText(
                  _task,
                  value.trim(),
                  fromSector: widget.fromSector,
                ),
              ),
            ),
            if (canEditText)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  key: const ValueKey('task_text_save'),
                  onPressed: canEditText
                      ? () => _run(
                          (a) => a.updateText(
                            _task,
                            _textController.text.trim(),
                            fromSector: widget.fromSector,
                          ),
                        )
                      : null,
                  icon: const Icon(AppIcons.check),
                  label: const Text('Guardar tarea'),
                ),
              ),
            const SizedBox(height: AppSpace.md),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xs,
              children: [
                if (_task.work != null)
                  ActionChip(
                    key: const ValueKey('task_origin_work'),
                    label: Text(_task.work!.name),
                    onPressed: () {
                      final router = GoRouter.of(context);
                      Navigator.pop(context);
                      router.push(Routes.work(_task.work!.id));
                    },
                  ),
                if (_task.homeSector != null)
                  ActionChip(
                    key: const ValueKey('task_origin_sector'),
                    label: Text('#${_task.homeSector!.name}'),
                    onPressed: () {
                      final router = GoRouter.of(context);
                      Navigator.pop(context);
                      router.push(Routes.sector(_task.homeSector!.id));
                    },
                  ),
                if (_task.objectiveTitle != null)
                  StatusChip(
                    label: _task.objectiveTitle!,
                    color: c.tagWorkText,
                    fill: c.tagWorkFill,
                  ),
                if (_task.effectiveDueDate != null)
                  StatusChip(
                    label:
                        'Vence ${formatDay(_task.effectiveDueDate!)}${_task.dueDate == null ? ' · subtareas' : ''}',
                    color: c.dueText,
                    fill: c.dueFill,
                    mono: true,
                  ),
                for (final link in _task.links)
                  ActionChip(
                    key: ValueKey('task_link_${link.targetId}'),
                    label: Text(
                      '${link.kind == LinkKind.exec ? '#' : '@'}${link.name}',
                    ),
                    onPressed: link.isUser || link.targetId == null
                        ? null
                        : () {
                            final router = GoRouter.of(context);
                            Navigator.pop(context);
                            router.push(Routes.sector(link.targetId!));
                          },
                  ),
                for (final label in _task.labels)
                  ColorPill(
                    label: '${label.keyName}: ${label.valueName}',
                    hex: label.color,
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.lg),
            AppWorkSection(
              title: 'Estado',
              icon: AppIcons.check,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Wrap(
                    spacing: AppSpace.sm,
                    children: [
                      for (final option
                          in _task.statusOptions.isEmpty
                              ? [_task.status]
                              : _task.statusOptions)
                        ChoiceChip(
                          key: ValueKey('task_status_${option.id}'),
                          avatar: ColorDot(hex: option.color),
                          label: Text(option.name),
                          selected: option.id == _task.status.id,
                          onSelected: !canEdit || _task.isContainer
                              ? null
                              : option.id == _task.status.id
                              // El estado vigente no se vuelve a elegir, pero tampoco
                              // se pinta como deshabilitado.
                              ? (_) {}
                              : (_) => _run(
                                  (a) => a.setStatus(_task, option.id),
                                  close: true,
                                ),
                        ),
                    ],
                  ),
                  if (canManageMyDay) ...[
                    const SizedBox(height: AppSpace.sm),
                    SwitchListTile(
                      key: const ValueKey('task_my_day_switch'),
                      contentPadding: EdgeInsets.zero,
                      title: const Text('En Mi día'),
                      subtitle: const Text('Tenela a mano para hoy'),
                      secondary: const Icon(AppIcons.myDay),
                      value: _task.isInMyDay,
                      onChanged: _busy
                          ? null
                          : (value) => _run((a) async {
                              await a.setMyDay(_task, value);
                              _task = _task.withMyDay(value);
                            }),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpace.md),
            AppWorkSection(
              title: 'Descripción',
              icon: AppIcons.document,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    key: const ValueKey('task_description_field'),
                    controller: _descriptionController,
                    enabled: canEdit,
                    minLines: 2,
                    maxLines: 6,
                    decoration: const InputDecoration(
                      labelText: 'Descripción',
                      alignLabelWithHint: true,
                    ),
                  ),
                  if (canEdit)
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        key: const ValueKey('task_description_save'),
                        onPressed: () {
                          final text = _descriptionController.text.trim();
                          _run(
                            (a) => a.updateDescription(
                              _task,
                              text.isEmpty ? null : text,
                            ),
                          );
                        },
                        child: const Text('Guardar descripción'),
                      ),
                    ),
                ],
              ),
            ),
            if (canEdit)
              Wrap(
                spacing: AppSpace.sm,
                children: [
                  if (_task.parentId == null &&
                      workContext?.canManageObjectives == true)
                    TextButton(
                      key: const ValueKey('task_move_objective'),
                      onPressed: () async {
                        final moved = await showTaskMove(
                          context,
                          _task,
                          objective: true,
                        );
                        if (moved && context.mounted) Navigator.pop(context);
                      },
                      child: const Text('Mover a objetivo'),
                    ),
                  if (!_task.isContainer)
                    TextButton(
                      key: const ValueKey('task_move_parent'),
                      onPressed: () async {
                        final moved = await showTaskMove(
                          context,
                          _task,
                          objective: false,
                        );
                        if (moved && context.mounted) Navigator.pop(context);
                      },
                      child: const Text('Mover bajo otra tarea'),
                    ),
                  if (_task.parentId != null)
                    TextButton(
                      key: const ValueKey('task_promote'),
                      onPressed: () =>
                          _run((a) => a.setParent(_task, null), close: true),
                      child: const Text('Separar del padre'),
                    ),
                ],
              ),
            if (_task.parentId == null) ...[
              const SizedBox(height: AppSpace.md),
              AppWorkSection(
                title: 'Subtareas',
                icon: AppIcons.list,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (canEdit && _task.subtasks.length > 1)
                      TextButton.icon(
                        key: const ValueKey('subtasks_reorder'),
                        icon: const Icon(AppIcons.reorder),
                        label: const Text('Ordenar subtareas'),
                        onPressed: () => showReorderDialog(
                          context,
                          title: 'Ordenar subtareas',
                          load: () async {
                            final current = await ref.refresh(
                              taskDetailProvider(_query).future,
                            );
                            if (current.task == null || !current.canOperate) {
                              throw StateError(
                                'La tarea no está disponible para editar.',
                              );
                            }
                            return current.task!.subtasks
                                .map((t) => (id: t.id, label: t.displayText))
                                .toList();
                          },
                          save: (ids) => ref
                              .read(taskActionsProvider)
                              .reorderSubtasks(_task, ids),
                        ),
                      ),
                    for (final sub in _task.subtasks)
                      CheckboxListTile(
                        key: ValueKey('task_subtask_${sub.id}'),
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        value: sub.isDone,
                        title: Text(sub.displayText),
                        onChanged:
                            canEdit &&
                                sub.canToggle != false &&
                                !sub.isContainer
                            ? (_) => _run((a) => a.toggleDone(sub))
                            : null,
                      ),
                    if (canEdit)
                      TaskComposer(
                        key: const ValueKey('subtask_composer'),
                        parentId: _task.id,
                        workId: _task.workId,
                        sectorId: _task.workId == null
                            ? _task.homeSector?.id
                            : null,
                        hint: 'Nueva subtarea…',
                        onSubmit: (text) async {
                          try {
                            await ref
                                .read(taskActionsProvider)
                                .create(text, parentId: _task.id);
                            return true;
                          } catch (e) {
                            if (context.mounted) showErrorSnack(context, e);
                            return false;
                          }
                        },
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: AppSpace.md),
            AppWorkSection(
              title: 'Historial',
              icon: AppIcons.schedule,
              child: _StatusHistory(taskId: _task.id),
            ),
            if (widget.canEdit) ...[
              const SizedBox(height: AppSpace.lg),
              OutlinedButton.icon(
                key: const ValueKey('task_delete'),
                onPressed: canEdit ? _confirmDelete : null,
                style: AppButtonStyles.destructiveOutlined(context),
                icon: const Icon(AppIcons.delete),
                label: const Text('Borrar tarea'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusHistory extends ConsumerStatefulWidget {
  const _StatusHistory({required this.taskId});

  final String taskId;

  @override
  ConsumerState<_StatusHistory> createState() => _StatusHistoryState();
}

class _StatusHistoryState extends ConsumerState<_StatusHistory> {
  Future<List<StatusChange>>? _history;

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      key: const ValueKey('task_history'),
      maintainState: true,
      onExpansionChanged: (expanded) {
        if (expanded && _history == null) {
          setState(
            () => _history = ref
                .read(tasksRepositoryProvider)
                .statusChanges(widget.taskId),
          );
        }
      },
      tilePadding: EdgeInsets.zero,
      title: const Text('Historial de estados'),
      children: [
        if (_history != null)
          FutureBuilder<List<StatusChange>>(
            future: _history,
            builder: (context, snapshot) {
              if (snapshot.hasError) return Text(errorMessage(snapshot.error!));
              if (!snapshot.hasData) return const LinearProgressIndicator();
              final changes = snapshot.data!;
              if (changes.isEmpty) {
                return const ListTile(title: Text('Sin cambios todavía'));
              }
              return Column(
                children: [
                  for (final c in changes)
                    ListTile(
                      dense: true,
                      leading: ColorDot(hex: c.toColor),
                      title: Text('${c.fromName ?? '—'} → ${c.toName ?? '—'}'),
                      subtitle: Text(
                        '${c.byName ?? 'Alguien'} · ${formatDay(c.changedAt)}',
                      ),
                    ),
                ],
              );
            },
          ),
      ],
    );
  }
}
