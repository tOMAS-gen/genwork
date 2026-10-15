import 'json.dart';

/// Evento del SSE `/api/stream`. Solo trae IDs: la app vuelve a pedir lo afectado.
sealed class LiveEvent {
  const LiveEvent();

  static LiveEvent? fromJson(Json json) => switch (json['type']) {
    'task-changed' => TaskChanged(
      taskId: json['taskId'] as String? ?? '',
      workId: json['workId'] as String?,
      sectorIds:
          (json['sectorIds'] as List?)?.whereType<String>().toList() ??
          const [],
    ),
    'work-changed' => WorkChanged(workId: json['workId'] as String? ?? ''),
    _ => null,
  };
}

class TaskChanged extends LiveEvent {
  const TaskChanged({
    required this.taskId,
    required this.workId,
    required this.sectorIds,
  });

  final String taskId;
  final String? workId;
  final List<String> sectorIds;
}

class WorkChanged extends LiveEvent {
  const WorkChanged({required this.workId});

  /// Vacío = refrescar todo (ej. se borró un sector).
  final String workId;
}

/// La conexión vuelve a estar lista; no hay replay de eventos perdidos.
class LiveConnected extends LiveEvent {
  const LiveConnected();
}
