import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/task.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/state_views.dart';
import 'task_actions.dart';

Future<bool> showTaskMove(
  BuildContext context,
  Task task, {
  required bool objective,
}) async =>
    await showAppFormDialog<bool>(
      context,
      barrierDismissible: false,
      builder: (_) => _TaskMoveDialog(task: task, objective: objective),
    ) ??
    false;

class _TaskMoveDialog extends ConsumerStatefulWidget {
  const _TaskMoveDialog({required this.task, required this.objective});
  final Task task;
  final bool objective;
  @override
  ConsumerState<_TaskMoveDialog> createState() => _TaskMoveDialogState();
}

class _TaskMoveDialogState extends ConsumerState<_TaskMoveDialog> {
  List<({String? id, String label})>? _options;
  Object? _error;
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final task = widget.task;
      final workId = task.workId ?? task.work?.id;
      WorkDetail? work;
      List<Task> tasks = [];
      if (workId != null) {
        work = await ref.read(worksRepositoryProvider).detail(workId);
        if (work.isArchived ||
            (widget.objective && !work.canManageObjectives)) {
          throw StateError('No tenés permiso para organizar este proyecto.');
        }
        tasks = work.tasks;
      } else if (task.homeSector != null) {
        final sector = await ref
            .read(sectorsRepositoryProvider)
            .board(task.homeSector!.id);
        tasks = sector.loose;
      }
      final options = widget.objective
          ? [
              (id: null, label: 'Tareas generales'),
              for (final o in work?.objectives ?? const [])
                (id: o.id as String?, label: o.title as String),
            ]
          : [
              for (final t in tasks.where(
                (t) => t.id != task.id && t.parentId == null,
              ))
                (
                  id: t.id as String?,
                  label:
                      '${t.displayText}${t.objectiveTitle == null ? '' : ' · ${t.objectiveTitle}'}',
                ),
            ];
      if (mounted) setState(() => _options = options);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _move(String? id) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final actions = ref.read(taskActionsProvider);
      if (widget.objective) {
        await actions.moveToObjective(widget.task, id);
      } else {
        await actions.setParent(widget.task, id);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AppWorkDialog(
      title: widget.objective ? 'Mover a objetivo' : 'Mover bajo otra tarea',
      closeEnabled: !_busy,
      onClose: () => Navigator.pop(context),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
      ],
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            widget.objective
                ? 'Las subtareas se mueven con su tarea principal.'
                : 'La tarea hereda el objetivo y los sectores de su nuevo padre.',
          ),
          if (_busy) const LinearProgressIndicator(),
          if (_error != null) ErrorView(error: _error!, onRetry: _load),
          if (_options?.isEmpty == true)
            const Text('No hay otras tareas disponibles.'),
          for (final option in _options ?? const [])
            ListTile(
              key: ValueKey('task_move_to_${option.id ?? 'general'}'),
              title: Text(option.label),
              subtitle: widget.objective && option.id == widget.task.objectiveId
                  ? const Text('Actual')
                  : null,
              onTap:
                  _busy ||
                      (widget.objective && option.id == widget.task.objectiveId)
                  ? null
                  : () => _move(option.id),
            ),
        ],
      ),
    ),
  );
}
