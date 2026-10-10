import '../../core/network/api_client.dart';
import '../models/json.dart';

enum SettingsSection {
  system('Sistema', '/api/system-info'),
  storageLink('Cuenta de almacenamiento', '/api/auth/storage-link/status'),
  access('Acceso', '/api/admin/access'),
  emails('Correos permitidos', '/api/admin/access/emails'),
  users('Usuarios', '/api/admin/users'),
  clients('Clientes externos', '/api/admin/clients'),
  storage('Almacenamiento del sistema', '/api/admin/storage'),
  jobs('Trabajos de almacenamiento', '/api/admin/storage/jobs'),
  reminders('Recordatorios del sistema', '/api/admin/reminders'),
  errors('Registro de errores', '/api/admin/errors'),
  mcp('Conexiones MCP', '/api/me/mcp-connections'),
  activity('Actividad MCP', '/api/me/mcp-connections/activity');

  const SettingsSection(this.title, this.path);
  final String title, path;
  bool get adminOnly => ![system, storageLink, mcp, activity].contains(this);
}

typedef SettingsQuery = ({SettingsSection section, String? filter});

class SettingsRepository {
  SettingsRepository(this._api);
  final ApiClient _api;
  Future<Object?> read(SettingsQuery query) => _api.get<Object?>(
    query.section.path,
    query: {
      if (query.section == SettingsSection.errors) 'status': query.filter,
    },
  );
  Future<void> saveAccess(Json input) =>
      _api.put<Object?>(SettingsSection.access.path, body: input);
  Future<void> allowEmail(String email) =>
      _api.post<Object?>(SettingsSection.emails.path, body: {'email': email});
  Future<void> removeEmail(String email) =>
      _api.delete<Object?>(SettingsSection.emails.path, body: {'email': email});
  Future<void> setRole(String userId, String role) => _api.put<Object?>(
    SettingsSection.users.path,
    body: {'userId': userId, 'globalRole': role},
  );
  Future<void> grantReader(String userId, String groupId, bool enabled) =>
      _api.post<Object?>(
        SettingsSection.users.path,
        body: {'userId': userId, 'groupId': groupId, 'enabled': enabled},
      );
  Future<void> createClient(Json input) =>
      _api.post<Object?>(SettingsSection.clients.path, body: input);
  Future<void> deleteClient(String id) =>
      _api.delete<Object?>('${SettingsSection.clients.path}/$id');
  Future<void> saveStorage(Json input) =>
      _api.put<Object?>(SettingsSection.storage.path, body: input);
  Future<Json> testStorage() => _api.post<Json>('/api/admin/storage/test');
  Future<Json> folders({String? parent, String? sharedDriveId}) =>
      _api.get<Json>(
        '/api/admin/storage/google/folders',
        query: {'parent': parent, 'sharedDriveId': sharedDriveId},
      );
  Future<void> retryJob(String id) =>
      _api.post<Object?>(SettingsSection.jobs.path, body: {'jobId': id});
  Future<void> saveReminders(Json input) =>
      _api.patch<Object?>(SettingsSection.reminders.path, body: input);
  Future<Json> error(String id) =>
      _api.get<Json>('${SettingsSection.errors.path}/$id');
  Future<void> setErrorStatus(String id, String status) => _api.patch<Object?>(
    '${SettingsSection.errors.path}/$id',
    body: {'status': status},
  );
  Future<Json> createMcp(String label) =>
      _api.post<Json>(SettingsSection.mcp.path, body: {'label': label});
  Future<void> revokeMcp(String id) =>
      _api.delete<Object?>('${SettingsSection.mcp.path}/$id');
  Future<Json> startNextcloud() =>
      _api.post<Json>('/api/auth/storage-link/nextcloud/start');
  Future<Json> pollNextcloud(String token) => _api.post<Json>(
    '/api/auth/storage-link/nextcloud/poll',
    body: {'pollToken': token},
  );
  Future<void> unlinkStorage(String provider) => _api.delete<Object?>(
    '/api/auth/storage-link/${provider == 'GDRIVE' ? 'google-drive' : 'nextcloud'}',
  );
  Future<Json> startGoogle(String purpose, String challenge) => _api.post<Json>(
    '/api/auth/mobile/integrations/start',
    body: {'purpose': purpose, 'codeChallenge': challenge},
  );
  Future<void> cancelGoogle(String flowId) => _api.post<Object?>(
    '/api/auth/mobile/integrations/cancel',
    body: {'flowId': flowId},
  );
  Future<void> finishGoogle(String flowId, String verifier) =>
      _api.post<Object?>(
        '/api/auth/mobile/integrations/finish',
        body: {'flowId': flowId, 'codeVerifier': verifier},
      );
}
