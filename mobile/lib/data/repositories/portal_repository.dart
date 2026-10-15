import '../../core/network/api_client.dart';
import '../models/json.dart';
import '../models/portal.dart';

class PortalRepository {
  PortalRepository(this._api);
  final ApiClient _api;
  Future<List<PortalWork>> list() async => parseList(
    await _api.get<List<dynamic>>('/api/portal/works'),
    PortalWork.fromJson,
  );
  Future<PortalWork> detail(String id) async =>
      PortalWork.fromJson(await _api.get<Json>('/api/portal/works/$id'));
  Future<Json> activity(String id, {String? cursor}) => _api.get<Json>(
    '/api/portal/works/$id/activity',
    query: {'cursor': cursor},
  );
}
