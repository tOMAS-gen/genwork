import '../../core/network/api_client.dart';
import '../models/group.dart';
import '../models/json.dart';
import '../models/work.dart';
import '../models/work_catalog.dart';

class WorksRepository {
  WorksRepository(this._api);

  final ApiClient _api;

  /// Proyectos activos (o archivados). Sin paginación en el servidor.
  Future<List<WorkSummary>> list({
    bool archived = false,
    String? groupId,
  }) async => parseList(
    await _api.get<List<dynamic>>(
      '/api/works',
      query: {'status': archived ? 'ARCHIVED' : null, 'groupId': groupId},
    ),
    WorkSummary.fromJson,
  );

  Future<WorkDetail> detail(String id) async =>
      WorkDetail.fromJson(await _api.get<Json>('/api/works/$id'));

  Future<Json> activity(String id) =>
      _api.get<Json>('/api/works/$id/mcp-activity');
  Future<List<Json>> clientGrants(String id) async => parseList(
    await _api.get<List<dynamic>>('/api/works/$id/client-grants'),
    (v) => v,
  );
  Future<void> grantClient(
    String id, {
    required String email,
    required String name,
  }) => _api.post<Object?>(
    '/api/works/$id/client-grants',
    body: {'email': email, 'name': name},
  );
  Future<void> revokeClient(String id, String userId) =>
      _api.delete<Object?>('/api/works/$id/client-grants/$userId');

  /// Crea un proyecto. [groupId] null = espacio personal. Devuelve el id.
  Future<String> create({
    required String name,
    bool isTemplate = false,
    String? templateId,
    String? description,
    String? groupId,
  }) async {
    final json = await _api.post<Json>(
      '/api/works',
      body: {
        'name': name,
        if (isTemplate) 'isTemplate': true,
        'cloneFromId': ?templateId,
        if (description != null && description.isNotEmpty)
          'description': description,
        'groupId': groupId,
      },
    );
    return json['id'] as String;
  }

  Future<void> update(
    String id, {
    String? name,
    String? description,
    DateTime? dueDate,
    bool clearDueDate = false,
  }) => _api.patch<Object?>(
    '/api/works/$id',
    body: {
      'name': ?name,
      'description': ?description,
      if (dueDate != null) 'dueDate': dueDate.toUtc().toIso8601String(),
      if (clearDueDate) 'dueDate': null,
    },
  );

  Future<void> setArchived(String id, bool archived) => _api.patch<Object?>(
    '/api/works/$id',
    body: {'status': archived ? 'ARCHIVED' : 'ACTIVE'},
  );

  Future<void> delete(String id, String confirmName) => _api.delete<Object?>(
    '/api/works/$id',
    body: {'confirmName': confirmName},
  );

  Future<void> setStage(String id, String? stageId) =>
      _api.patch<Object?>('/api/works/$id', body: {'stageId': stageId});

  Future<List<WorkStage>> stages(String? groupId) async => parseList(
    await _api.get<List<dynamic>>(
      '/api/stages',
      query: {if (groupId != null) 'groupId': groupId else 'personal': 'true'},
    ),
    WorkStage.fromJson,
  );

  Future<List<LabelOption>> labels(String? groupId) async {
    final keys = await _api.get<List<dynamic>>(
      '/api/labels',
      query: {'groupId': groupId},
    );
    return [
      for (final raw in keys)
        for (final value in (asJson(raw)?['values'] as List? ?? const []))
          LabelOption(
            keyId: raw['id'] as String,
            keyName: raw['name'] as String,
            valueId: value['id'] as String,
            valueName: value['name'] as String,
            scope: raw['scope'] as String? ?? 'personal',
            color: value['color'] as String?,
          ),
    ];
  }

  Future<void> assignLabel(
    String id,
    LabelOption label, {
    bool primary = false,
  }) => _api.put<Object?>(
    '/api/works/$id/labels${primary ? '/primary' : ''}',
    body: {'keyId': label.keyId, 'valueId': label.valueId},
  );

  Future<void> removeLabel(
    String id, {
    required String keyId,
    required String valueId,
  }) => _api.delete<Object?>(
    '/api/works/$id/labels',
    query: {'keyId': keyId, 'valueId': valueId},
  );

  Future<void> setFavorite(String id, bool favorite) => favorite
      ? _api.post<Object?>('/api/favorites', body: {'workId': id})
      : _api.delete<Object?>('/api/favorites/$id');

  Future<List<GroupSummary>> groups() async => parseList(
    await _api.get<List<dynamic>>('/api/groups'),
    GroupSummary.fromJson,
  );
}
