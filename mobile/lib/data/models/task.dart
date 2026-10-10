import 'common.dart';
import 'json.dart';

enum StatusType { inProgress, done }

/// Estado configurable de tarea. `type` es binario: en curso o final.
class TaskStatusOption {
  const TaskStatusOption({
    required this.id,
    required this.name,
    required this.color,
    required this.type,
    this.sortOrder = 0,
  });

  final String id;
  final String name;
  final String color;
  final StatusType type;
  final int sortOrder;

  bool get isFinal => type == StatusType.done;

  factory TaskStatusOption.fromJson(Json json) => TaskStatusOption(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    color: json['color'] as String? ?? '#94a3b8',
    type: json['type'] == 'FINAL' ? StatusType.done : StatusType.inProgress,
    sortOrder: asInt(json['sortOrder']),
  );
}

enum LinkKind { exec, ref }

/// Vínculo de la tarea: `#sector` (exec) o `@sector`/`@usuario` (ref).
class TaskLinkRef {
  const TaskLinkRef({
    required this.kind,
    required this.name,
    required this.isUser,
    this.targetId,
  });

  final LinkKind kind;
  final String name;
  final bool isUser;
  final String? targetId;

  factory TaskLinkRef.fromJson(Json json) {
    final user = asJson(json['user']);
    final sector = asJson(json['sector']);
    return TaskLinkRef(
      kind: json['type'] == 'EXEC' ? LinkKind.exec : LinkKind.ref,
      isUser: user != null,
      name: (user?['name'] ?? sector?['name'] ?? '') as String,
      targetId: (user?['id'] ?? sector?['id']) as String?,
    );
  }
}

/// Tarea. Un único modelo para todas las variantes del contrato (WorkTaskDto,
/// MyDayTaskDto, SectorTaskDto, ReferenceDto, TaskWithLinks): los campos que una
/// variante no trae quedan en null / vacío.
class Task {
  const Task({
    required this.id,
    required this.rawText,
    required this.displayText,
    required this.status,
    this.statusOptions = const [],
    this.workId,
    this.work,
    this.homeSector,
    this.labels = const [],
    this.links = const [],
    this.description,
    this.dueDate,
    this.completedAt,
    this.parentId,
    this.parentText,
    this.objectiveId,
    this.objectiveTitle,
    this.myDayAt,
    this.canToggle,
    this.canManageMyDay,
    this.subtasks = const [],
    this.subtaskCount = 0,
    this.subtaskDone = 0,
    this.originIsSector = false,
    this.adopted = false,
  });

  final String id;
  final String rawText;
  final String displayText;
  final TaskStatusOption status;
  final List<TaskStatusOption> statusOptions;
  final String? workId;
  final NamedRef? work;
  final NamedRef? homeSector;
  final List<LabelChip> labels;
  final List<TaskLinkRef> links;
  final String? description;
  final DateTime? dueDate;
  final DateTime? completedAt;
  final String? parentId;
  final String? parentText;
  final String? objectiveId;
  final String? objectiveTitle;
  final DateTime? myDayAt;

  /// Permiso de cambiar estado; el texto también depende de su origen. Null cuando el endpoint no lo informa
  /// (proyecto/sector: se deriva del nivel de acceso del contenedor).
  final bool? canToggle;
  final bool? canManageMyDay;
  final List<Task> subtasks;
  final int subtaskCount;
  final int subtaskDone;
  final bool originIsSector;
  final bool adopted;

  DateTime? get effectiveDueDate {
    if (dueDate != null) return dueDate;
    final dates =
        subtasks
            .where((s) => !s.isDone && s.dueDate != null)
            .map((s) => s.dueDate!)
            .toList()
          ..sort();
    return dates.firstOrNull;
  }

  bool get isDone => status.isFinal;
  bool get isInMyDay => myDayAt != null;
  bool get isContainer => subtaskCount > 0;

  /// Estado final al que pasa al "completar" (primer FINAL de las opciones).
  TaskStatusOption? get finalOption =>
      statusOptions.where((s) => s.isFinal).firstOrNull;

  /// Estado en curso al que vuelve al "reabrir".
  TaskStatusOption? get openOption =>
      statusOptions.where((s) => !s.isFinal).firstOrNull;

  /// Copia con la marca de Mi día cambiada (feedback local tras el toggle).
  Task withMyDay(bool inMyDay) => _copy(inMyDay: inMyDay);

  Task withSubtasks(List<Task> subtasks) => _copy(subtasks: subtasks);

  bool canEditText({required bool fromSector}) =>
      !fromSector || (originIsSector && !adopted);

  Task _copy({bool? inMyDay, List<Task>? subtasks}) => Task(
    id: id,
    rawText: rawText,
    displayText: displayText,
    status: status,
    statusOptions: statusOptions,
    workId: workId,
    work: work,
    homeSector: homeSector,
    labels: labels,
    links: links,
    description: description,
    dueDate: dueDate,
    completedAt: completedAt,
    parentId: parentId,
    parentText: parentText,
    objectiveId: objectiveId,
    objectiveTitle: objectiveTitle,
    myDayAt: inMyDay == null
        ? myDayAt
        : inMyDay
        ? (myDayAt ?? DateTime.now())
        : null,
    canToggle: canToggle,
    canManageMyDay: canManageMyDay,
    subtasks: subtasks ?? this.subtasks,
    subtaskCount: subtaskCount,
    subtaskDone: subtaskDone,
    originIsSector: originIsSector,
    adopted: adopted,
  );

  factory Task.fromJson(Json json) {
    final objective = asJson(json['objective']);
    return Task(
      id: json['id'] as String,
      rawText: json['rawText'] as String? ?? '',
      displayText: (json['displayText'] ?? json['text'] ?? '') as String,
      status: TaskStatusOption.fromJson(
        asJson(json['status']) ?? const {'id': '', 'name': ''},
      ),
      statusOptions: parseList(
        json['statusOptions'],
        TaskStatusOption.fromJson,
      ),
      workId: json['workId'] as String?,
      work: NamedRef.maybe(json['work']),
      homeSector: NamedRef.maybe(json['homeSector']),
      labels: parseList(json['labels'], LabelChip.fromJson),
      links: parseList(json['links'], TaskLinkRef.fromJson),
      description: json['description'] as String?,
      dueDate: parseDate(json['dueDate']),
      completedAt: parseDate(json['completedAt']),
      parentId: json['parentId'] as String?,
      parentText: json['parentText'] as String?,
      objectiveId: json['objectiveId'] as String?,
      objectiveTitle:
          (objective?['title'] ?? json['objectiveTitle']) as String?,
      myDayAt: parseDate(json['myDayAt']),
      canToggle: json['canToggle'] as bool?,
      canManageMyDay: json['canManageMyDay'] as bool?,
      subtasks: parseList(json['subtasks'], Task.fromJson),
      subtaskCount: asInt(json['subtaskCount']),
      subtaskDone: asInt(json['subtaskDone']),
      originIsSector: json['originType'] == 'SECTOR',
      adopted: json['adoptedAt'] != null,
    );
  }
}

/// Cambio de estado del historial (`GET /api/tasks/[id]/status-changes`).
class StatusChange {
  const StatusChange({
    required this.changedAt,
    this.fromName,
    this.toName,
    this.toColor,
    this.byName,
  });

  final DateTime changedAt;
  final String? fromName;
  final String? toName;
  final String? toColor;
  final String? byName;

  factory StatusChange.fromJson(Json json) => StatusChange(
    changedAt: parseDate(json['changedAt']) ?? DateTime.now(),
    fromName: asJson(json['fromStatus'])?['name'] as String?,
    toName: asJson(json['toStatus'])?['name'] as String?,
    toColor: asJson(json['toStatus'])?['color'] as String?,
    byName: json['changedByName'] as String?,
  );
}
