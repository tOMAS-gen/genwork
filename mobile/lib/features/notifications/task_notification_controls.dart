import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/task.dart';
import '../../core/theme/app_icons.dart';
import '../../shared/widgets/state_views.dart';
import '../reminders/reminder_form_screen.dart';
import '../tasks/task_actions.dart';
import 'notifications_providers.dart';

class TaskNotificationControls extends ConsumerStatefulWidget {
  const TaskNotificationControls({
    super.key,
    required this.task,
    required this.canEdit,
    required this.fromSector,
  });
  final Task task;
  final bool canEdit, fromSector;
  @override
  ConsumerState<TaskNotificationControls> createState() => _State();
}

class _State extends ConsumerState<TaskNotificationControls> {
  bool _busy = false;
  @override
  Widget build(BuildContext context) {
    final info = ref.watch(taskNotificationInfoProvider(widget.task.id));
    return info.when(
      loading: () => const LinearProgressIndicator(),
      error: (e, _) => ErrorView(
        error: e,
        onRetry: () =>
            ref.invalidate(taskNotificationInfoProvider(widget.task.id)),
      ),
      data: (data) {
        final enabled = widget.canEdit && data.task.canToggle == true && !_busy;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SwitchListTile(
              key: const ValueKey('task_urgent'),
              title: const Text('Urgente'),
              value: data.task.isUrgent,
              subtitle: Text(
                data.recipientCount == 0
                    ? 'Sin destinatarios. Agregá una mención o un sector ejecutor.'
                    : 'Avisar a ${data.recipientCount} ${data.recipientCount == 1 ? 'persona' : 'personas'} al activar.',
              ),
              onChanged: !enabled
                  ? null
                  : (value) async {
                      setState(() => _busy = true);
                      try {
                        await ref
                            .read(taskActionsProvider)
                            .setUrgent(
                              data.task,
                              value,
                              fromSector: widget.fromSector,
                            );
                      } catch (e) {
                        if (context.mounted) showErrorSnack(context, e);
                      } finally {
                        if (mounted) setState(() => _busy = false);
                      }
                    },
            ),
            TextButton.icon(
              key: const ValueKey('task_reminder'),
              icon: const Icon(AppIcons.reminders),
              label: const Text('Crear recordatorio'),
              onPressed: !enabled
                  ? null
                  : () => Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => ReminderFormScreen(
                          initialTask: data.task,
                          recipientCount: data.recipientCount,
                        ),
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }
}
