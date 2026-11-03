import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_geometry.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/labeled_field.dart';
import '../../shared/widgets/state_views.dart';
import 'task_actions.dart';

/// Texto de confirmación al eliminar, como `deleteConfirmMessage` de la web:
/// borrar una tarea se lleva sus subtareas, y lo dice.
String deleteTaskMessage(Task task) => switch (task.subtaskCount) {
  0 => '¿Eliminar esta tarea?',
  1 => '¿Eliminar esta tarea? También se elimina su subtarea.',
  final n => '¿Eliminar esta tarea? También se eliminan sus $n subtareas.',
};

/// "×" de la fila: pide confirmación y elimina la tarea.
Future<void> confirmDeleteTask(
  BuildContext context,
  WidgetRef ref,
  Task task,
) => confirmAction(
  context,
  title: 'Eliminar tarea',
  message: deleteTaskMessage(task),
  confirmLabel: 'Eliminar',
  danger: true,
  onConfirm: () => ref.read(taskActionsProvider).delete(task),
);

/// "+" de la fila: pide el texto y crea la subtarea bajo [task].
Future<void> promptSubtask(BuildContext context, Task task) =>
    showAppFormDialog<void>(
      context,
      builder: (_) => _SubtaskDialog(parent: task),
    );

class _SubtaskDialog extends ConsumerStatefulWidget {
  const _SubtaskDialog({required this.parent});

  final Task parent;

  @override
  ConsumerState<_SubtaskDialog> createState() => _SubtaskDialogState();
}

class _SubtaskDialogState extends ConsumerState<_SubtaskDialog> {
  final _text = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final text = _text.text.trim();
    if (_saving || text.isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(taskActionsProvider)
          .create(text, parentId: widget.parent.id);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        showErrorSnack(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) => AppWorkDialog(
    title: 'Agregar subtarea',
    subtitle: widget.parent.displayText,
    closeEnabled: !_saving,
    actions: [
      TextButton(
        key: const ValueKey('subtask_cancel'),
        onPressed: _saving ? null : () => Navigator.pop(context),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        key: const ValueKey('subtask_save'),
        onPressed: _saving ? null : _save,
        child: Text(_saving ? 'Agregando…' : 'Agregar'),
      ),
    ],
    child: Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: LabeledField(
        label: 'Subtarea',
        child: TextField(
          key: const ValueKey('subtask_text'),
          controller: _text,
          autofocus: true,
          enabled: !_saving,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _save(),
          decoration: const InputDecoration(hintText: 'Escribí una subtarea…'),
        ),
      ),
    ),
  );
}
