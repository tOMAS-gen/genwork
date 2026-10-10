import 'dart:math' as math;
import '../../core/util/name_order.dart';
import 'common.dart';
import 'json.dart';
import 'task.dart';

/// Proyecto en el listado (`GET /api/works`, DashboardWorkDto).
class WorkSummary {
  const WorkSummary({
    required this.id,
    required this.name,
    required this.isArchived,
    required this.isTemplate,
    required this.progress,
    required this.isFavorite,
    required this.createdAt,
    this.description,
    this.createdById,
    this.ownerId,
    this.pendingCount = 0,
    this.sectorIds = const [],
    this.dueDate,
    this.groupId,
    this.groupName,
    this.stageName,
    this.stageColor,
    this.labels = const [],
  });

  final String id;
  final String name;
  final String? description;
  final bool isArchived;
  final bool isTemplate;
  final DateTime? dueDate;
  final String? groupId;
  final String? groupName;
  final String? stageName;
  final String? stageColor;
  final Progress progress;
  final List<LabelChip> labels;
  final bool isFavorite;
  final DateTime createdAt;
  final String? createdById;
  final String? ownerId;
  final int pendingCount;
  final List<String> sectorIds;

  /// Mismo color que la web: etiqueta principal o primera clave por nombre.
  String? get color {
    if (labels.isEmpty) return null;
    final primary = labels.where((label) => label.isPrimary).firstOrNull;
    if (primary != null) return primary.color;
    final sorted = [...labels]
      ..sort((a, b) => compareNamesEs(a.keyName, b.keyName));
    return sorted.first.color;
  }

  factory WorkSummary.fromJson(Json json) {
    final stage = asJson(json['stage']);
    return WorkSummary(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      isArchived: json['status'] == 'ARCHIVED',
      isTemplate: json['isTemplate'] == true,
      dueDate: parseDate(json['dueDate']),
      groupId: (json['groupId'] ?? asJson(json['group'])?['id']) as String?,
      createdById: json['createdById'] as String?,
      ownerId: json['ownerId'] as String?,
      pendingCount: math.max(
        0,
        asInt(
          json['pendingCount'],
          Progress.fromJson(asJson(json['taskCounts'])).pending,
        ),
      ),
      sectorIds:
          (json['sectorIds'] as List?)?.whereType<String>().toList() ??
          const [],
      groupName:
          (json['groupName'] ?? asJson(json['group'])?['name']) as String?,
      stageName: stage?['name'] as String?,
      stageColor: stage?['color'] as String?,
      progress: Progress.fromJson(asJson(json['taskCounts'])),
      labels: parseList(json['labels'], LabelChip.fromJson),
      isFavorite: json['isFavorite'] == true,
      createdAt: parseDate(json['createdAt']) ?? DateTime.now(),
    );
  }
}

/// Objetivo (sección) de un proyecto.
class Objective {
  const Objective({
    required this.id,
    required this.title,
    required this.position,
    this.description,
  });

  final String id;
  final String title;
  final String? description;
  final int position;

  factory Objective.fromJson(Json json) => Objective(
    id: json['id'] as String,
    title: json['title'] as String? ?? '',
    description: json['description'] as String?,
    position: asInt(json['position']),
  );
}

/// Detalle de proyecto (`GET /api/works/[id]`).
class WorkDetail {
  const WorkDetail({
    required this.id,
    required this.name,
    required this.code,
    required this.isArchived,
    required this.isTemplate,
    required this.canOperate,
    required this.canManageMyDay,
    required this.objectives,
    required this.tasks,
    this.document,
    this.description,
    this.dueDate,
    this.groupId,
    this.stageId,
    this.groupName,
    this.stageName,
    this.stageColor,
    this.labels = const [],
  });

  final Object? document;
  final String id;
  final String name;
  final String code;
  final String? description;
  final bool isArchived;
  final bool isTemplate;
  final DateTime? dueDate;
  final String? groupId;
  final String? stageId;
  final String? groupName;
  final String? stageName;
  final String? stageColor;
  final List<LabelChip> labels;

  /// `access == "operate"`: puede crear y cambiar tareas.
  final bool canOperate;
  final bool canManageMyDay;
  bool get canManageObjectives => canOperate && !isArchived && !isTemplate;
  final List<Objective> objectives;

  /// Tareas raíz (planas); agrupar por [Task.objectiveId] con [sections].
  final List<Task> tasks;

  /// Secciones en orden: generales (objetivo null) y luego cada objetivo.
  List<WorkSection> get sections => [
    WorkSection(
      objective: null,
      tasks: tasks.where((t) => t.objectiveId == null).toList(),
    ),
    for (final o in [
      ...objectives,
    ]..sort((a, b) => a.position.compareTo(b.position)))
      WorkSection(
        objective: o,
        tasks: tasks.where((t) => t.objectiveId == o.id).toList(),
      ),
  ];

  Progress get progress {
    final leaves = tasks.expand((t) => t.subtasks.isEmpty ? [t] : t.subtasks);
    return Progress(
      done: leaves.where((t) => t.isDone).length,
      total: leaves.length,
    );
  }

  factory WorkDetail.fromJson(Json json) {
    final stage = asJson(json['stage']);
    return WorkDetail(
      document: asJson(json['doc'])?['content'],
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      code: json['code'] as String? ?? '',
      description: json['description'] as String?,
      isArchived: json['status'] == 'ARCHIVED',
      isTemplate: json['isTemplate'] == true,
      dueDate: parseDate(json['dueDate']),
      groupId: (json['groupId'] ?? asJson(json['group'])?['id']) as String?,
      stageId: (json['stageId'] ?? stage?['id']) as String?,
      groupName: asJson(json['group'])?['name'] as String?,
      stageName: stage?['name'] as String?,
      stageColor: stage?['color'] as String?,
      labels: parseList(json['labels'], LabelChip.fromJson),
      canOperate: json['access'] == 'operate',
      canManageMyDay: json['canManageMyDay'] == true,
      objectives: parseList(json['objectives'], Objective.fromJson),
      tasks: parseList(json['tasks'], Task.fromJson),
    );
  }
}

class WorkSection {
  const WorkSection({required this.objective, required this.tasks});

  /// Null = tareas generales.
  final Objective? objective;
  final List<Task> tasks;
}
