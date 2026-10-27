import 'package:flutter/material.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
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
      // Clave propia: sin ella el offset se guardaba con la clave del objetivo
      // plegable que lo contiene, que ya guarda ahí un bool.
      key: const PageStorageKey('task_board'),
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

/// Lado de cada botón de ícono del cambio de vista.
const double _iconButton = 36;

class TaskViewToggle extends StatelessWidget {
  const TaskViewToggle({
    super.key,
    required this.board,
    required this.onChanged,
    this.padding = AppSpace.page,
    this.compact = false,
    this.iconsOnly = false,
  });
  final bool board;

  /// Margen alrededor del control (cero cuando ya va dentro de un panel).
  final EdgeInsets padding;

  /// Solo el texto, sin íconos: para compartir la fila con otras acciones.
  final bool compact;

  /// Dos botones de ícono de 36 dp en lugar del segmentado, para el renglón
  /// del título (P12-M2).
  final bool iconsOnly;
  final ValueChanged<bool> onChanged;
  @override
  Widget build(BuildContext context) {
    if (iconsOnly) {
      final c = context.colors;
      Widget option(bool value, IconData icon, String label) {
        final selected = board == value;
        return Semantics(
          selected: selected,
          child: IconButton(
            tooltip: label,
            onPressed: () => onChanged(value),
            style: IconButton.styleFrom(
              minimumSize: const Size.square(_iconButton),
              backgroundColor: selected ? c.brandFill : null,
              foregroundColor: selected ? c.brand : c.muted,
              shape: const RoundedRectangleBorder(
                borderRadius: AppGeometry.control,
              ),
            ),
            icon: Icon(icon, size: AppIconSizes.action),
          ),
        );
      }

      return Padding(
        padding: padding,
        child: Row(
          key: const ValueKey('task_view_toggle'),
          mainAxisSize: MainAxisSize.min,
          children: [
            option(false, AppIcons.list, 'Ver como lista'),
            option(true, AppIcons.gridView, 'Ver como tablero'),
          ],
        ),
      );
    }
    return Padding(
      padding: padding,
      child: SegmentedButton<bool>(
        key: const ValueKey('task_view_toggle'),
        showSelectedIcon: false,
        segments: [
          ButtonSegment(
            value: false,
            icon: compact ? null : const Icon(AppIcons.list),
            label: const Text('Lista'),
          ),
          ButtonSegment(
            value: true,
            icon: compact ? null : const Icon(AppIcons.gridView),
            label: const Text('Tablero'),
          ),
        ],
        selected: {board},
        onSelectionChanged: (s) => onChanged(s.first),
      ),
    );
  }
}
