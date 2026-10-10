import '../../data/models/task.dart';

/// Mi día conserva sus datos y permisos; las referencias solo agregan tareas
/// que todavía no están visibles, incluidas las subtareas anidadas.
({List<Task> myDay, List<Task> references, Set<String> referenceIds})
mergeMyDayAndReferences(List<Task> myDay, List<Task> references) {
  final visible = <String>{};
  final referenceIds = <String>{};
  void remember(Task task, Set<String> ids) {
    ids.add(task.id);
    for (final child in task.subtasks) {
      remember(child, ids);
    }
  }

  for (final task in references) {
    remember(task, referenceIds);
  }
  for (final task in myDay) {
    remember(task, visible);
  }
  Task? unseen(Task task) {
    if (!visible.add(task.id)) return null;
    return task.withSubtasks(
      task.subtasks.map(unseen).whereType<Task>().toList(),
    );
  }

  return (
    myDay: myDay,
    references: references.map(unseen).whereType<Task>().toList(),
    referenceIds: referenceIds,
  );
}
