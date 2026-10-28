import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/task.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/state_views.dart';
import '../reminders/reminder_form_screen.dart';
import '../tasks/task_actions.dart';
import 'notifications_providers.dart';

/// Chips "Urgente" y "Recordatorio" de la fila del detalle de tarea (piloto
/// premium P09). A quién avisa la urgencia se lee en el tooltip del chip y en
/// el aviso al activarla. Arma la fila entera con [leading] delante, para que
/// los cuatro chips compartan renglón (boceto P09).
class TaskNotificationControls extends ConsumerStatefulWidget {
  const TaskNotificationControls({
    super.key,
    required this.task,
    required this.canEdit,
    required this.fromSector,
    this.leading = const [],
  });
  final Task task;
  final bool canEdit, fromSector;
  final List<Widget> leading;
  @override
  ConsumerState<TaskNotificationControls> createState() => _State();
}

String recipientsMessage(int count) => count == 0
    ? 'Sin destinatarios. Agregá una mención o un sector ejecutor.'
    : 'Avisa a $count ${count == 1 ? 'persona' : 'personas'} al activar.';

class _State extends ConsumerState<TaskNotificationControls> {
  bool _busy = false;
  @override
  Widget build(BuildContext context) {
    final info = ref.watch(taskNotificationInfoProvider(widget.task.id));
    return Wrap(
      spacing: AppSpace.xs,
      runSpacing: AppSpace.xs,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [...widget.leading, ..._chips(info)],
    );
  }

  List<Widget> _chips(AsyncValue<({Task task, int recipientCount})> info) {
    return info.when(
      loading: () => const [],
      error: (e, _) => [
        ActionChip(
          key: const ValueKey('task_notifications_retry'),
          avatar: const Icon(AppIcons.retry, size: AppIconSizes.notice),
          label: const Text('Reintentar avisos'),
          tooltip: errorMessage(e),
          onPressed: () =>
              ref.invalidate(taskNotificationInfoProvider(widget.task.id)),
        ),
      ],
      data: (data) {
        final enabled = widget.canEdit && data.task.canToggle == true && !_busy;
        return [
          FilterChip(
            key: const ValueKey('task_urgent'),
            avatar: const Icon(AppIcons.urgent, size: AppIconSizes.notice),
            showCheckmark: false,
            label: const Text('Urgente'),
            tooltip: recipientsMessage(data.recipientCount),
            selected: data.task.isUrgent,
            onSelected: !enabled
                ? null
                : (value) async {
                    setState(() => _busy = true);
                    final messenger = ScaffoldMessenger.of(context);
                    try {
                      await ref
                          .read(taskActionsProvider)
                          .setUrgent(
                            data.task,
                            value,
                            fromSector: widget.fromSector,
                          );
                      if (value) {
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(
                              data.recipientCount == 0
                                  ? recipientsMessage(0)
                                  : 'Se avisó a ${data.recipientCount} ${data.recipientCount == 1 ? 'persona' : 'personas'}.',
                            ),
                          ),
                        );
                      }
                    } catch (e) {
                      if (mounted) showErrorSnack(context, e);
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
          ),
          ActionChip(
            key: const ValueKey('task_reminder'),
            avatar: const Icon(AppIcons.bell, size: AppIconSizes.notice),
            label: const Text('Recordatorio'),
            tooltip: 'Crear recordatorio',
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
        ];
      },
    );
  }
}
