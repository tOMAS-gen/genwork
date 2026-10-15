import '../models/tag_suggestion.dart';
import '../../core/network/api_client.dart';
import '../models/json.dart';
import '../models/task.dart';

/// Tareas. El texto usa la sintaxis del servidor: `/proyecto`, `#sector`,
/// `@sector|@usuario`, `$etiqueta` y fechas en el texto.
class TasksRepository {
  TasksRepository(this._api);

  final ApiClient _api;

  /// Crea una tarea. Al menos un contexto es obligatorio.
  Future<Task> create(
    String rawText, {
    String? workId,
    String? sectorId,
    String? parentId,
    String? objectiveId,
  }) async => Task.fromJson(
    await _api.post<Json>(
      '/api/tasks',
      body: {
        'rawText': rawText,
        'contextWorkId': ?workId,
        'contextSectorId': ?sectorId,
        'parentId': ?parentId,
        'contextObjectiveId': ?objectiveId,
      },
    ),
  );

  /// Re-parsea el texto. [fromSector] true si se edita desde la vista de sector.
  Future<void> updateText(
    String id,
    String rawText, {
    bool fromSector = false,
  }) => _api.patch<Object?>(
    '/api/tasks/$id',
    body: {'rawText': rawText, 'editContext': fromSector ? 'sector' : 'work'},
  );

  Future<void> updateDescription(String id, String? description) =>
      _api.patch<Object?>('/api/tasks/$id', body: {'description': description});

  Future<void> setStatus(String id, String statusId) =>
      _api.post<Object?>('/api/tasks/$id/status', body: {'statusId': statusId});

  Future<void> setMyDay(String id, bool inMyDay) => inMyDay
      ? _api.post<Object?>('/api/tasks/$id/my-day')
      : _api.delete<Object?>('/api/tasks/$id/my-day');

  /// Borra la tarea y sus subtareas. Devuelve cuántas subtareas se borraron.
  Future<int> delete(String id) async {
    final json = await _api.delete<Json>('/api/tasks/$id');
    return asInt(json['deletedSubtasks']);
  }

  Future<List<TagSuggestion>> suggest(
    String symbol,
    String query, {
    String? workId,
    String? sectorId,
  }) async => parseList(
    await _api.get<List<dynamic>>(
      '/api/tags/suggest',
      query: {
        'symbol': symbol,
        'q': query,
        'contextWorkId': workId,
        'contextSectorId': workId == null ? sectorId : null,
      },
    ),
    TagSuggestion.fromJson,
  );

  Future<void> moveToObjective(String id, String? objectiveId) =>
      _api.patch<Object?>('/api/tasks/$id', body: {'objectiveId': objectiveId});
  Future<void> setParent(String id, String? parentId) =>
      _api.patch<Object?>('/api/tasks/$id', body: {'parentId': parentId});
  Future<void> reorder(String workId, String? objectiveId, List<String> ids) =>
      _api.patch<Object?>(
        '/api/works/$workId/tasks/reorder',
        body: {'objectiveId': objectiveId, 'orderedTaskIds': ids},
      );
  Future<void> reorderSubtasks(String id, List<String> ids) =>
      _api.patch<Object?>(
        '/api/tasks/$id/subtasks/reorder',
        body: {'orderedTaskIds': ids},
      );

  Future<List<StatusChange>> statusChanges(String id) async => parseList(
    await _api.get<List<dynamic>>('/api/tasks/$id/status-changes'),
    StatusChange.fromJson,
  );
}
