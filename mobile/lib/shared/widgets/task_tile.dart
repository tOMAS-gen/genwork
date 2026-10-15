import 'package:flutter/material.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/task.dart';
import 'color_dot.dart';
import 'status_chip.dart';

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
    this.flat = false,
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

  /// Sin marco de card (ni margen lateral): para filas dentro de un panel que
  /// ya dibuja su propio borde y separadores.
  final bool flat;
  final Set<String> referenceIds;
  final void Function(Task subtask)? onSubtaskTap, onSubtaskToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = context.colors;
    final canToggle =
        onToggleDone != null && !task.isContainer && task.canToggle != false;
    final canDay = onToggleMyDay != null && task.canManageMyDay != false;
    final meta = <String>[
      if (showWork && task.work != null) task.work!.name,
      if (showSector && task.homeSector != null) '#${task.homeSector!.name}',
      if (task.parentText != null && depth == 0) '↳ ${task.parentText}',
      if (task.subtaskCount > 0)
        '${task.subtaskDone}/${task.subtaskCount} subtareas',
    ];
    Widget row = Card(
      color: flat ? Colors.transparent : null,
      shape: flat ? const RoundedRectangleBorder() : null,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('task_${task.id}'),
        borderRadius: AppGeometry.card,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.xs,
            AppSpace.xs,
            AppSpace.md,
            AppSpace.xs,
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
                        style: theme.textTheme.bodyMedium?.copyWith(
                          decoration: task.isDone
                              ? TextDecoration.lineThrough
                              : null,
                          color: task.isDone ? c.muted : c.text,
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
                          // Como la web: con solo «pendiente/hecha» el estado lo
                          // dice la casilla; el pill aparece con más estados.
                          if (task.statusOptions.length > 2)
                            ColorPill(
                              label: task.status.name,
                              hex: task.status.color,
                            ),
                          if (referenceIds.contains(task.id))
                            StatusChip(
                              label: 'Te mencionan',
                              color: c.info,
                              fill: c.infoFill,
                            ),
                          if (task.effectiveDueDate != null)
                            StatusChip(
                              label:
                                  'Vence ${formatDay(task.effectiveDueDate!)}${task.dueDate == null ? ' · subtareas' : ''}',
                              color: c.dueText,
                              fill: c.dueFill,
                              mono: true,
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
                    task.isInMyDay ? AppIcons.myDayFilled : AppIcons.myDay,
                    size: AppIconSizes.action,
                    color: task.isInMyDay ? c.warning : c.muted,
                  ),
                )
              else if (task.isInMyDay)
                Padding(
                  padding: const EdgeInsets.all(AppSpace.sm),
                  child: Icon(
                    AppIcons.myDay,
                    size: AppIconSizes.action,
                    color: c.warning,
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
          color: day ? c.brandFill : c.success,
          borderRadius: AppGeometry.card,
        ),
        child: Icon(
          day
              ? AppIcons.myDay
              : task.isDone
              ? AppIcons.undo
              : AppIcons.check,
          color: day ? c.brand : readableOn(c.success),
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
        left: depth == 0 ? (flat ? 0 : AppSpace.lg) : AppSpace.xl,
        right: depth == 0 ? (flat ? 0 : AppSpace.lg) : 0,
        bottom: flat ? 0 : AppSpace.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          row,
          if (showSubtasks)
            for (final sub in task.subtasks)
              TaskTile(
                task: sub,
                flat: flat,
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
