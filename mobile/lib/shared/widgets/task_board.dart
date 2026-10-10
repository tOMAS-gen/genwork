import 'package:flutter/material.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/task.dart';
import 'color_dot.dart';

/// Tablero de estados: cada subtarea tiene su propia tarjeta, como en la web.
class TaskBoard extends StatelessWidget {
  const TaskBoard({super.key, required this.tasks, required this.itemBuilder});
  final List<Task> tasks;
  final Widget Function(Task) itemBuilder;
  @override
  Widget build(BuildContext context) {
    final flat = tasks.expand((t) => [t, ...t.subtasks]).toList();
    final states = <String, TaskStatusOption>{};
    for (final t in flat) {
      for (final s in [...t.statusOptions, t.status]) {
        states.putIfAbsent(s.id, () => s);
      }
    }
    final columns = states.values.toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    if (flat.isEmpty) {
      return const Padding(
        padding: AppSpace.page,
        child: Text('No hay tareas para mostrar en el tablero.'),
      );
    }
    // Una columna visible a la vez en teléfono; altura natural y scroll exterior.
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final status in columns)
            SizedBox(
              width: (MediaQuery.sizeOf(context).width - AppSpace.xl)
                  .clamp(280, 420)
                  .toDouble(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: AppSpace.page,
                    child: Row(
                      children: [
                        ColorDot(hex: status.color),
                        const SizedBox(width: AppSpace.sm),
                        Expanded(
                          child: Text(
                            status.name,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                        ),
                        Text(
                          '${flat.where((t) => t.status.id == status.id).length}',
                        ),
                      ],
                    ),
                  ),
                  for (final task in flat.where(
                    (t) => t.status.id == status.id,
                  ))
                    itemBuilder(task),
                  if (!flat.any((t) => t.status.id == status.id))
                    const Padding(
                      padding: AppSpace.page,
                      child: Text('Sin tareas'),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class TaskViewToggle extends StatelessWidget {
  const TaskViewToggle({
    super.key,
    required this.board,
    required this.onChanged,
    this.padding = AppSpace.page,
  });
  final bool board;

  /// Margen alrededor del control (cero cuando ya va dentro de un panel).
  final EdgeInsets padding;
  final ValueChanged<bool> onChanged;
  @override
  Widget build(BuildContext context) => Padding(
    padding: padding,
    child: SegmentedButton<bool>(
      key: const ValueKey('task_view_toggle'),
      showSelectedIcon: false,
      segments: const [
        ButtonSegment(
          value: false,
          icon: Icon(AppIcons.list),
          label: Text('Lista'),
        ),
        ButtonSegment(
          value: true,
          icon: Icon(AppIcons.gridView),
          label: Text('Tablero'),
        ),
      ],
      selected: {board},
      onSelectionChanged: (s) => onChanged(s.first),
    ),
  );
}
