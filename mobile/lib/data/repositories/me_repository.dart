import '../../core/network/api_client.dart';
import '../models/app_user.dart';
import '../models/json.dart';
import '../models/task.dart';

class MeRepository {
  MeRepository(this._api);

  final ApiClient _api;

  Future<AppUser> me() async => AppUser.fromJson(await _api.get<Json>('/api/me'));

  /// Tareas marcadas para hoy (incluye las completadas hoy).
  Future<List<Task>> myDay() async => parseList(await _api.get<List<dynamic>>('/api/me/my-day'), Task.fromJson);

  /// Tareas que me mencionan (`@yo`). [done] null = todas.
  Future<List<Task>> references({bool? done}) async => parseList(
        await _api.get<List<dynamic>>('/api/me/references', query: {
          'type': done == null ? null : (done ? 'FINAL' : 'IN_PROGRESS'),
        }),
        Task.fromJson,
      );
}
