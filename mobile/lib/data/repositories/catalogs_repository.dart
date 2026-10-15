import '../../core/network/api_client.dart';
import '../models/json.dart';

enum CatalogKind {
  labels('Etiquetas y colores', '/api/labels'),
  stages('Etapas de producción', '/api/stages'),
  statuses('Estados de tarea', '/api/task-statuses');

  const CatalogKind(this.title, this.path);
  final String title, path;
}

typedef CatalogQuery = ({CatalogKind kind, String scope, String? ownerId});
Json catalogScope(CatalogQuery query) => {
  if (query.scope == 'global') 'global': true,
  if (query.scope.startsWith('group:')) 'groupId': query.scope.substring(6),
  if (query.scope.startsWith('sector:')) 'sectorId': query.scope.substring(7),
  if (query.scope == 'personal' && query.kind == CatalogKind.stages)
    'personal': true,
  if (query.scope == 'personal' && query.kind == CatalogKind.statuses)
    'ownerId': query.ownerId,
};

class CatalogsRepository {
  CatalogsRepository(this._api);
  final ApiClient _api;
  Future<Object?> read(CatalogQuery query) =>
      _api.get<Object?>(query.kind.path, query: catalogScope(query));
  Future<void> create(CatalogQuery query, Json input) => _api.post<Object?>(
    query.kind.path,
    body: {...catalogScope(query), ...input},
  );
  String path(CatalogKind kind, String id) =>
      '${kind.path}/${kind == CatalogKind.labels ? 'keys/' : ''}$id';
  Future<void> update(CatalogQuery query, String id, Json input) =>
      _api.patch<Object?>(
        path(query.kind, id),
        body: {
          ...input,
          if (query.scope.startsWith('sector:'))
            'asSectorId': query.scope.substring(7),
        },
      );
  Future<void> delete(CatalogQuery query, String id, {bool confirm = false}) =>
      _api.delete<Object?>(
        path(query.kind, id),
        query: {
          if (confirm) 'confirm': 'true',
          if (query.scope.startsWith('sector:'))
            'asSectorId': query.scope.substring(7),
        },
      );
  Future<void> createValue(String id, Json input) =>
      _api.post<Object?>('/api/labels/values', body: {'keyId': id, ...input});
  Future<void> updateValue(String id, Json input) =>
      _api.patch<Object?>('/api/labels/values/$id', body: input);
  Future<void> deleteValue(String id, {bool confirm = false}) =>
      _api.delete<Object?>(
        '/api/labels/values/$id',
        query: {if (confirm) 'confirm': 'true'},
      );
  Future<void> reorderStages(List<String> ids) =>
      _api.put<Object?>('/api/stages/reorder', body: {'ids': ids});
}
