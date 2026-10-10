import 'common.dart';
import 'json.dart';
import 'task.dart';

/// Snapshot de consulta: /api/board no expone permisos ni IDs de proyectos.
class BoardTask {
  const BoardTask({
    required this.id,
    required this.text,
    required this.status,
    this.workName,
    this.workColor,
    this.objectiveTitle,
    this.parentId,
    this.parentText,
    this.subtaskCount = 0,
    this.subtaskDone = 0,
  });
  final String id, text;
  final TaskStatusOption status;
  final String? workName, workColor, objectiveTitle, parentId, parentText;
  final int subtaskCount, subtaskDone;
  bool get isContainer => subtaskCount > 0;
  bool get isDone => isContainer ? subtaskDone == subtaskCount : status.isFinal;
  String get contextLabel => workName == null
      ? 'Sin proyecto'
      : [workName!, ?objectiveTitle].join(' › ');
  factory BoardTask.fromJson(Json json) => BoardTask(
    id: json['id'] as String,
    text: json['text'] as String? ?? '',
    status: TaskStatusOption.fromJson(asJson(json['status'])!),
    workName: json['workName'] as String?,
    workColor: json['workColor'] as String?,
    objectiveTitle: json['objectiveTitle'] as String?,
    parentId: json['parentId'] as String?,
    parentText: json['parentText'] as String?,
    subtaskCount: asInt(json['subtaskCount']),
    subtaskDone: asInt(json['subtaskDone']),
  );
}

class BoardColumn {
  const BoardColumn({required this.sector, this.color, required this.tasks});
  final NamedRef sector;
  final String? color;
  final List<BoardTask> tasks;
  Progress get progress => boardTaskProgress(tasks);
  factory BoardColumn.fromJson(Json json) => BoardColumn(
    sector: NamedRef.fromJson(asJson(json['sector'])!),
    color: asJson(json['sector'])?['color'] as String?,
    tasks: parseList(json['tasks'], BoardTask.fromJson),
  );
}

/// Las contenedoras no suman; sus hijas cuentan solo donde tienen vínculo EXEC.
Progress boardTaskProgress(Iterable<BoardTask> tasks) {
  final leaves = tasks.where((t) => !t.isContainer);
  return Progress(
    done: leaves.where((t) => t.isDone).length,
    total: leaves.length,
  );
}

/// Una tarea puede pertenecer a varios sectores; cuenta una vez en el resumen.
Progress boardProgress(List<BoardColumn> columns) => boardTaskProgress(
  {
    for (final column in columns)
      for (final task in column.tasks) task.id: task,
  }.values,
);
