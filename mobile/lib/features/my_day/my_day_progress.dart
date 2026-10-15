import '../../data/models/common.dart';
import '../../data/models/task.dart';

/// Mismo cómputo que myDayProgress web: hijas si están incluidas, si no la raíz.
/// Las referencias ajenas a Mi día no aportan al progreso.
Progress myDayProgress(List<Task> tasks) {
  final units = tasks.expand((t) => t.subtasks.isEmpty ? [t] : t.subtasks);
  return Progress(
    done: units.where((t) => t.isDone).length,
    total: units.length,
  );
}

String? myDaySourceLabel(Task task) {
  final parts = [
    task.work?.name ?? task.homeSector?.name,
    task.objectiveTitle,
    task.parentText,
  ].whereType<String>().where((s) => s.isNotEmpty).toList();
  return parts.isEmpty ? null : parts.join(' › ');
}
