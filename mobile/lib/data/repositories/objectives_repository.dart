import '../../core/network/api_client.dart';
import '../models/json.dart';
import '../models/template.dart';

class ObjectivesRepository {
  ObjectivesRepository(this._api);
  final ApiClient _api;
  Future<List<ObjectiveTemplate>> templates() async => parseList(
    await _api.get<List<dynamic>>('/api/templates'),
    ObjectiveTemplate.fromJson,
  );
  Future<void> create(String workId, String title, String description) =>
      _api.post<Object?>(
        '/api/works/$workId/objectives',
        body: {'title': title, 'description': description},
      );
  Future<void> update(String id, String title, String description) =>
      _api.patch<Object?>(
        '/api/objectives/$id',
        body: {'title': title, 'description': description},
      );
  Future<void> reorder(String workId, List<String> ids) => _api.patch<Object?>(
    '/api/works/$workId/objectives/reorder',
    body: {'orderedObjectiveIds': ids},
  );
  Future<void> delete(String id, {required bool keepTasks}) =>
      _api.delete<Object?>(
        '/api/objectives/$id',
        body: {'mode': keepTasks ? 'moveToGeneral' : 'deleteTasks'},
      );
  Future<void> insert(String workId, String templateId, String title) =>
      _api.post<Object?>(
        '/api/works/$workId/objectives/from-template',
        body: {'templateId': templateId, 'title': title},
      );
  Future<ObjectiveTemplate> saveTemplate(String id) async =>
      ObjectiveTemplate.fromJson(
        await _api.post<Json>('/api/objectives/$id/save-as-template', body: {}),
      );
}
