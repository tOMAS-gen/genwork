import '../../core/network/api_client.dart';
import '../models/group.dart';
import '../models/json.dart';

class GroupsRepository {
  GroupsRepository(this._api);
  final ApiClient _api;
  Future<List<GroupSummary>> list() async => parseList(
    await _api.get<List<dynamic>>('/api/groups'),
    GroupSummary.fromJson,
  );
  Future<String> create({required String name, String? color}) async =>
      (await _api.post<Json>(
            '/api/groups',
            body: {'name': name, 'color': color},
          ))['id']
          as String;
  Future<void> update(
    String id, {
    String? name,
    String? color,
    bool updateColor = false,
    bool? publicRead,
  }) => _api.patch<Object?>(
    '/api/groups/$id',
    body: {
      'name': ?name,
      if (updateColor) 'color': color,
      'publicRead': ?publicRead,
    },
  );
  Future<void> delete(String id) => _api.delete<Object?>('/api/groups/$id');
  Future<List<GroupMember>> searchMembers(String id, String query) async =>
      parseList(
        await _api.get<List<dynamic>>(
          '/api/groups/$id/members/search',
          query: {'q': query},
        ),
        GroupMember.fromJson,
      );
  Future<void> setMember(
    String id, {
    required String email,
    required String role,
  }) => _api.post<Object?>(
    '/api/groups/$id/members',
    body: {'email': email, 'role': role},
  );
  Future<void> removeMember(String id, String userId) =>
      _api.delete<Object?>('/api/groups/$id/members/$userId');
  Future<GroupClients> clients(String id) async =>
      GroupClients.fromJson(await _api.get<Json>('/api/groups/$id/clients'));
  Future<void> addClient(
    String id, {
    required String name,
    required String email,
    required Set<String> workIds,
  }) => _api.post<Object?>(
    '/api/groups/$id/clients',
    body: {'name': name, 'email': email, 'workIds': workIds.toList()},
  );
  Future<void> setClientWorks(String id, String userId, Set<String> workIds) =>
      _api.put<Object?>(
        '/api/groups/$id/clients/$userId',
        body: {'workIds': workIds.toList()},
      );
  Future<void> removeClient(String id, String userId) =>
      _api.delete<Object?>('/api/groups/$id/clients/$userId');
  Future<List<GroupLabel>> labels(String id) async {
    final all = await _api.get<List<dynamic>>(
      '/api/labels',
      query: {'groupId': id},
    );
    return parseList(
      all.where((key) => key['scope'] == 'group').toList(),
      GroupLabel.fromJson,
    );
  }

  Future<void> createLabel(String groupId, String name) => _api.post<Object?>(
    '/api/labels',
    body: {'groupId': groupId, 'name': name},
  );
  Future<void> renameLabel(String id, String name) =>
      _api.patch<Object?>('/api/labels/keys/$id', body: {'name': name});
  Future<void> createValue(String keyId, String name, String color) =>
      _api.post<Object?>(
        '/api/labels/values',
        body: {'keyId': keyId, 'name': name, 'color': color},
      );
  Future<void> updateValue(String id, String name, String color) =>
      _api.patch<Object?>(
        '/api/labels/values/$id',
        body: {'name': name, 'color': color},
      );
  Future<void> deleteLabel(
    String id, {
    bool value = false,
    bool confirm = false,
  }) => _api.delete<Object?>(
    '/api/labels/${value ? 'values' : 'keys'}/$id',
    query: {if (confirm) 'confirm': 'true'},
  );
}
