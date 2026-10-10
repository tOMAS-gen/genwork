import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/format.dart';
import '../../data/models/task.dart';
import 'color_dot.dart';

class TaskTile extends StatelessWidget {
  const TaskTile({
    super.key,
    required this.task,
    required this.onTap,
    this.onToggleDone,
    this.onToggleMyDay,
    this.showWork = false,
    this.showSector = false,
    this.depth = 0,
    this.showSubtasks = true,
    this.referenceIds = const {},
    this.onSubtaskTap,
    this.onSubtaskToggle,
  });
  final Task task;
  final VoidCallback onTap;
  final VoidCallback? onToggleDone, onToggleMyDay;
  final bool showWork, showSector;
  final int depth;
  final bool showSubtasks;
  final Set<String> referenceIds;
  final void Function(Task subtask)? onSubtaskTap, onSubtaskToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final canToggle =
        onToggleDone != null && !task.isContainer && task.canToggle != false;
    final canDay = onToggleMyDay != null && task.canManageMyDay != false;
    final meta = <String>[
      if (showWork && task.work != null) task.work!.name,
      if (showSector && task.homeSector != null) '#${task.homeSector!.name}',
      if (task.parentText != null && depth == 0) '↳ ${task.parentText}',
      if (task.effectiveDueDate != null)
        'Vence ${formatDay(task.effectiveDueDate!)}${task.dueDate == null ? ' · subtareas' : ''}',
      if (task.subtaskCount > 0)
        '${task.subtaskDone}/${task.subtaskCount} subtareas',
    ];
    Widget row = Card(
      child: InkWell(
        key: ValueKey('task_${task.id}'),
        borderRadius: AppTokens.of(context).cardRadius,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.xs,
            AppSpace.sm,
            AppSpace.sm,
            AppSpace.sm,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                // Con el texto: en la lista de controles de TalkBack todas
                // las casillas decían lo mismo. Sin acción, TalkBack la funde
                // con la tarjeta, que ya lee el texto.
                label: task.isContainer
                    ? 'Estado calculado por subtareas'
                    : '${task.isDone ? 'Reabrir tarea' : 'Completar tarea'}${canToggle ? ': ${task.displayText}' : ''}',
                child: Checkbox(
                  key: ValueKey('task_toggle_${task.id}'),
                  value: task.isDone,
                  onChanged: canToggle ? (_) => onToggleDone!() : null,
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.displayText,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                          decoration: task.isDone
                              ? TextDecoration.lineThrough
                              : null,
                          color: task.isDone
                              ? theme.colorScheme.onSurfaceVariant
                              : null,
                        ),
                      ),
                      if (meta.isNotEmpty) ...[
                        const SizedBox(height: AppSpace.xs),
                        Text(
                          meta.join(' · '),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                      const SizedBox(height: AppSpace.sm),
                      Wrap(
                        spacing: AppSpace.sm,
                        runSpacing: AppSpace.xs,
                        children: [
                          ColorPill(
                            label: task.status.name,
                            hex: task.status.color,
                          ),
                          if (referenceIds.contains(task.id))
                            const Chip(
                              avatar: Icon(Icons.alternate_email, size: 16),
                              label: Text('Te mencionan'),
                            ),
                          for (final label in task.labels)
                            ColorPill(label: label.valueName, hex: label.color),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              if (canDay)
                IconButton(
                  key: ValueKey('task_day_${task.id}'),
                  tooltip: task.isInMyDay
                      ? 'Quitar de Mi día'
                      : 'Agregar a Mi día',
                  onPressed: onToggleMyDay,
                  icon: Icon(
                    task.isInMyDay ? Icons.wb_sunny : Icons.wb_sunny_outlined,
                    size: AppSpace.icon,
                    color: task.isInMyDay ? theme.colorScheme.primary : null,
                  ),
                )
              else if (task.isInMyDay)
                const Padding(
                  padding: EdgeInsets.all(AppSpace.sm),
                  child: Icon(
                    Icons.wb_sunny_outlined,
                    size: AppSpace.icon,
                    semanticLabel: 'En Mi día',
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    if (canToggle || canDay) {
      Widget background(bool day) => Container(
        alignment: day ? Alignment.centerRight : Alignment.centerLeft,
        padding: AppSpace.page,
        decoration: BoxDecoration(
          color: theme.colorScheme.primaryContainer,
          borderRadius: AppTokens.of(context).cardRadius,
        ),
        child: Icon(
          day
              ? Icons.wb_sunny_outlined
              : task.isDone
              ? Icons.undo
              : Icons.check,
          color: theme.colorScheme.onPrimaryContainer,
        ),
      );
      row = Dismissible(
        key: ValueKey('task_swipe_${task.id}'),
        direction: canToggle && canDay
            ? DismissDirection.horizontal
            : canToggle
            ? DismissDirection.startToEnd
            : DismissDirection.endToStart,
        movementDuration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : const Duration(milliseconds: 180),
        background: background(!canToggle),
        secondaryBackground: canToggle && canDay ? background(true) : null,
        confirmDismiss: (direction) async {
          if (direction == DismissDirection.startToEnd) {
            onToggleDone?.call();
          } else {
            onToggleMyDay?.call();
          }
          return false;
        },
        child: row,
      );
    }
    return Padding(
      padding: EdgeInsets.only(
        left: depth == 0 ? AppSpace.lg : AppSpace.xl,
        right: depth == 0 ? AppSpace.lg : 0,
        bottom: AppSpace.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          row,
          if (showSubtasks)
            for (final sub in task.subtasks)
              TaskTile(
                task: sub,
                referenceIds: referenceIds,
                onSubtaskTap: onSubtaskTap,
                onSubtaskToggle: onSubtaskToggle,
                depth: depth + 1,
                onTap: () => onSubtaskTap?.call(sub),
                onToggleDone: onSubtaskToggle == null
                    ? null
                    : () => onSubtaskToggle!(sub),
              ),
        ],
      ),
    );
  }
}
