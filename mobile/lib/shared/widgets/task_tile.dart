import 'package:flutter/material.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/task.dart';
import 'color_dot.dart';
import 'row_actions_menu.dart';
import 'status_chip.dart';

/// Fila de tarea: casilla (o la flecha que pliega las subtareas, si las
/// tiene), el texto con "hechas/total" debajo y, a la derecha, como mucho el
/// sol si está en Mi día y un "⋯" con Mi día, agregar subtarea y eliminar
/// (PS9, T3: el texto conserva el ancho). Los gestos de deslizar (completar,
/// Mi día) son propios del teléfono.
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
    this.inlineCounter = false,
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

  /// Como el boceto de Mi día (P04): la tarea con hijas muestra su avance en
  /// una casilla a medio marcar que no se toca y «1/2» como chip junto al
  /// nombre, y las hijas van separadas por una línea.
  final bool inlineCounter;

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
    final partial =
        task.subtaskDone > 0 && task.subtaskDone < task.subtaskCount;
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
    final actions = [
      if (canDay)
        RowAction(
          key: 'task_day_${task.id}',
          label: task.isInMyDay ? 'Quitar de Mi día' : 'Agregar a Mi día',
          onSelected: onToggleMyDay,
        ),
      if (widget.onAddSubtask != null && depth == 0)
        RowAction(
          key: 'task_add_subtask_${task.id}',
          label: 'Agregar subtarea',
          onSelected: widget.onAddSubtask!,
        ),
      if (widget.onDelete != null)
        RowAction(
          key: 'task_delete_${task.id}',
          label: 'Eliminar tarea',
          destructive: true,
          onSelected: widget.onDelete!,
        ),
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
            AppSpace.xs,
            AppSpace.xs,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Una tarea con subtareas no lleva casilla (su estado sale de las
              // hijas): en su lugar va la flecha que las pliega, como la web.
              if (task.isContainer && widget.showSubtasks) ...[
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
                ),
                // Solo muestra el avance: el estado lo dan las hijas, así que
                // no se toca ni recibe foco (el chip «1/2» lo anuncia).
                if (widget.inlineCounter)
                  // Centrada con la primera línea, como las casillas de 48.
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpace.sm),
                    child: ExcludeFocus(
                      child: ExcludeSemantics(
                        child: IgnorePointer(
                          // Sin área táctil propia (no se toca): más angosta,
                          // y a medio marcar con contorno y guion gris.
                          child: Checkbox(
                            key: ValueKey('task_progress_box_${task.id}'),
                            tristate: true,
                            value: partial
                                ? null
                                : task.subtaskDone >= task.subtaskCount,
                            onChanged: (_) {},
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            visualDensity: VisualDensity.compact,
                            fillColor: partial
                                ? const WidgetStatePropertyAll(
                                    Colors.transparent,
                                  )
                                : null,
                            checkColor: partial ? c.muted : null,
                            side: partial
                                ? WidgetStateBorderSide.resolveWith(
                                    (_) => BorderSide(
                                      color: c.control,
                                      width: AppSpacing.hairline,
                                    ),
                                  )
                                : null,
                          ),
                        ),
                      ),
                    ),
                  ),
              ] else if (task.isContainer)
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
                          if (widget.inlineCounter &&
                              task.subtaskCount > 0) ...[
                            const SizedBox(width: AppSpace.sm),
                            Semantics(
                              label:
                                  '${task.subtaskDone} de ${task.subtaskCount} subtareas hechas',
                              excludeSemantics: true,
                              child: StatusChip(
                                key: ValueKey('task_counter_${task.id}'),
                                label:
                                    '${task.subtaskDone}/${task.subtaskCount}',
                                color: c.muted,
                                fill: c.field,
                                mono: true,
                              ),
                            ),
                          ],
                        ],
                      ),
                      // "hechas/total" en 12 gris debajo del título.
                      if (task.subtaskCount > 0 && !widget.inlineCounter)
                        Semantics(
                          label:
                              '${task.subtaskDone} de ${task.subtaskCount} subtareas hechas',
                          excludeSemantics: true,
                          child: Text(
                            '${task.subtaskDone}/${task.subtaskCount}',
                            style: AppTextStyles.supporting.copyWith(
                              color: c.muted,
                            ),
                          ),
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
              // Solo el estado de Mi día queda a la vista (P04-M5).
              if (task.isInMyDay)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: AppSpace.md,
                    horizontal: AppSpace.xxs,
                  ),
                  child: Icon(
                    AppIcons.myDay,
                    key: ValueKey('task_in_day_${task.id}'),
                    size: AppIconSizes.action,
                    color: c.brand,
                    semanticLabel: 'En Mi día',
                  ),
                ),
              if (actions.isNotEmpty)
                RowActionsMenu(
                  key: ValueKey('task_more_${task.id}'),
                  tooltip: 'Acciones de la tarea',
                  actions: actions,
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
                  for (final sub in task.subtasks) ...[
                    if (widget.inlineCounter)
                      Divider(
                        height: 1,
                        thickness: 1,
                        indent: AppSpace.lg,
                        color: c.border,
                      ),
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
                ],
              ),
            ),
        ],
      ),
    );
  }
}
