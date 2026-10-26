import 'package:flutter/material.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/task.dart';
import 'color_dot.dart';
import 'status_chip.dart';

/// Fila de tarea, como `TaskItem.tsx` de la web: casilla (o la flecha que
/// pliega las subtareas, si las tiene), el texto con la insignia "hechas/total",
/// y a la derecha Mi día (☀), agregar subtarea (+) y eliminar (×). Los gestos de
/// deslizar (completar, Mi día) son propios del teléfono.
class TaskTile extends StatefulWidget {
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
    this.onAddSubtask,
    this.onDelete,
    this.onSubtaskDelete,
    this.onSubtaskMyDay,
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

  /// "+" de la web: agregar una subtarea (solo en tareas de primer nivel).
  final VoidCallback? onAddSubtask;

  /// "×" de la web: eliminar la tarea (con confirmación, la pone quien llama).
  final VoidCallback? onDelete;
  final void Function(Task subtask)? onSubtaskDelete;

  /// ☀ de cada subtarea (la web lo muestra también en las hijas).
  final void Function(Task subtask)? onSubtaskMyDay;

  @override
  State<TaskTile> createState() => _TaskTileState();
}

class _TaskTileState extends State<TaskTile> {
  /// Subtareas desplegadas, como `subtasksOpen` de la web.
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final onToggleDone = widget.onToggleDone;
    final onToggleMyDay = widget.onToggleMyDay;
    final depth = widget.depth;
    final flat = widget.flat;
    final theme = Theme.of(context);
    final c = context.colors;
    final canToggle =
        onToggleDone != null && !task.isContainer && task.canToggle != false;
    final canDay = onToggleMyDay != null && task.canManageMyDay != false;
    final meta = <String>[
      if (widget.showWork && task.work != null) task.work!.name,
      if (widget.showSector && task.homeSector != null)
        '#${task.homeSector!.name}',
      if (task.parentText != null && depth == 0) '↳ ${task.parentText}',
    ];
    final chips = <Widget>[
      // Como la web: con solo «pendiente/hecha» el estado lo dice la casilla;
      // el pill aparece con más estados.
      if (task.statusOptions.length > 2)
        ColorPill(label: task.status.name, hex: task.status.color),
      if (widget.referenceIds.contains(task.id))
        StatusChip(label: 'Te mencionan', color: c.info, fill: c.infoFill),
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
    ];
    Widget row = Card(
      color: flat ? Colors.transparent : null,
      shape: flat ? const RoundedRectangleBorder() : null,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('task_${task.id}'),
        borderRadius: AppGeometry.card,
        onTap: widget.onTap,
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
              // Una tarea con subtareas no lleva casilla (su estado sale de las
              // hijas): en su lugar va la flecha que las pliega, como la web.
              if (task.isContainer && widget.showSubtasks)
                IconButton(
                  key: ValueKey('task_expand_${task.id}'),
                  tooltip: _expanded
                      ? 'Ocultar subtareas'
                      : 'Mostrar subtareas',
                  onPressed: () => setState(() => _expanded = !_expanded),
                  icon: Icon(
                    _expanded ? AppIcons.expandMore : AppIcons.chevronRight,
                    size: AppIconSizes.notice,
                    color: c.muted,
                  ),
                )
              else if (task.isContainer)
                const SizedBox(width: AppSpace.touch)
              else
                Semantics(
                  // Con el texto: en la lista de controles de TalkBack todas
                  // las casillas decían lo mismo. Sin acción, TalkBack la funde
                  // con la tarjeta, que ya lee el texto.
                  label:
                      '${task.isDone ? 'Reabrir tarea' : 'Completar tarea'}${canToggle ? ': ${task.displayText}' : ''}',
                  child: Checkbox(
                    key: ValueKey('task_toggle_${task.id}'),
                    value: task.isDone,
                    onChanged: canToggle ? (_) => onToggleDone() : null,
                  ),
                ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Flexible(
                            child: Text(
                              task.displayText,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                decoration: task.isDone
                                    ? TextDecoration.lineThrough
                                    : null,
                                color: task.isDone ? c.muted : c.text,
                              ),
                            ),
                          ),
                          // Progreso "hechas/total" junto al texto (`.badge`).
                          if (task.subtaskCount > 0) ...[
                            const SizedBox(width: AppSpace.sm),
                            Semantics(
                              label:
                                  '${task.subtaskDone} de ${task.subtaskCount} subtareas hechas',
                              excludeSemantics: true,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpace.xs,
                                  vertical: AppSpace.xxs,
                                ),
                                decoration: BoxDecoration(
                                  color: c.hover,
                                  border: Border.all(color: c.border),
                                  borderRadius: AppGeometry.pill,
                                ),
                                child: Text(
                                  '${task.subtaskDone}/${task.subtaskCount}',
                                  style: AppTextStyles.supporting.copyWith(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: c.muted,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (meta.isNotEmpty) ...[
                        const SizedBox(height: AppSpace.xs),
                        Text(
                          meta.join(' · '),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                      if (chips.isNotEmpty) ...[
                        const SizedBox(height: AppSpace.xs),
                        Wrap(
                          spacing: AppSpace.sm,
                          runSpacing: AppSpace.xs,
                          children: chips,
                        ),
                      ],
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
                    AppIcons.myDay,
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
              if (widget.onAddSubtask != null && depth == 0)
                IconButton(
                  key: ValueKey('task_add_subtask_${task.id}'),
                  tooltip: 'Agregar subtarea',
                  onPressed: widget.onAddSubtask,
                  icon: Icon(
                    AppIcons.add,
                    size: AppIconSizes.action,
                    color: c.muted,
                  ),
                ),
              if (widget.onDelete != null)
                IconButton(
                  key: ValueKey('task_delete_${task.id}'),
                  tooltip: 'Eliminar tarea',
                  onPressed: widget.onDelete,
                  icon: Icon(
                    AppIcons.close,
                    size: AppIconSizes.action,
                    color: c.muted,
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
        left: depth == 0 ? (flat ? 0 : AppSpace.lg) : 0,
        right: depth == 0 ? (flat ? 0 : AppSpace.lg) : 0,
        bottom: flat ? 0 : AppSpace.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          row,
          // Hijas con la línea guía a la izquierda, como `SubtaskList`.
          if (widget.showSubtasks && _expanded && task.subtasks.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(left: AppSpace.xxl),
              decoration: BoxDecoration(
                border: Border(left: BorderSide(color: c.border, width: 2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final sub in task.subtasks)
                    TaskTile(
                      task: sub,
                      flat: flat,
                      referenceIds: widget.referenceIds,
                      onSubtaskTap: widget.onSubtaskTap,
                      onSubtaskToggle: widget.onSubtaskToggle,
                      onSubtaskDelete: widget.onSubtaskDelete,
                      depth: depth + 1,
                      onTap: () => widget.onSubtaskTap?.call(sub),
                      onToggleDone: widget.onSubtaskToggle == null
                          ? null
                          : () => widget.onSubtaskToggle!(sub),
                      onDelete:
                          widget.onSubtaskDelete == null ||
                              sub.canToggle != true
                          ? null
                          : () => widget.onSubtaskDelete!(sub),
                      onToggleMyDay:
                          widget.onSubtaskMyDay == null ||
                              sub.canManageMyDay != true
                          ? null
                          : () => widget.onSubtaskMyDay!(sub),
                      onSubtaskMyDay: widget.onSubtaskMyDay,
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
