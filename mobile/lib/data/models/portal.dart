import 'common.dart';
import 'json.dart';

/// DTO exclusivo del portal: no expone carpeta, adjuntos ni permisos internos.
class PortalWork {
  PortalWork.fromJson(Json json)
    : id = json['id'] as String,
      name = json['name'] as String? ?? '',
      description = json['description'] as String?,
      dueDate = parseDate(json['dueDate']),
      progress = Progress.fromJson(asJson(json['taskCounts'])),
      labels = parseList(json['labels'], LabelChip.fromJson),
      stage = asJson(json['stage']),
      tasks = parseList(json['tasks'], PortalTask.fromJson),
      objectives = parseList(json['objectives'], PortalObjective.fromJson),
      document = asJson(json['doc'])?['content'];
  final String id, name;
  final String? description;
  final DateTime? dueDate;
  final Progress progress;
  final List<LabelChip> labels;
  final Json? stage;
  final List<PortalTask> tasks;
  final List<PortalObjective> objectives;
  final Object? document;
}

class PortalObjective {
  PortalObjective.fromJson(Json json)
    : id = json['id'] as String,
      title = json['title'] as String? ?? '',
      description = json['description'] as String?,
      progress = Progress.fromJson(asJson(json['taskCounts'])),
      tasks = parseList(json['tasks'], PortalTask.fromJson);
  final String id, title;
  final String? description;
  final Progress progress;
  final List<PortalTask> tasks;
}

class PortalTask {
  PortalTask.fromJson(Json json)
    : id = json['id'] as String,
      text = json['displayText'] as String? ?? '',
      description = json['description'] as String?,
      dueDate = parseDate(json['dueDate']),
      status = asJson(json['status']) ?? const {},
      links = parseList(json['links'], (v) => v),
      labels = parseList(json['labels'], LabelChip.fromJson),
      subtasks = parseList(json['subtasks'], PortalTask.fromJson);
  final String id, text;
  final String? description;
  final DateTime? dueDate;
  final Json status;
  final List<Json> links;
  final List<LabelChip> labels;
  final List<PortalTask> subtasks;
}
