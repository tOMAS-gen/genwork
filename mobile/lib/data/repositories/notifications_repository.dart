import '../../core/network/api_client.dart';
import '../models/app_notification.dart';
import '../models/json.dart';

class NotificationsRepository {
  NotificationsRepository(this._api);
  final ApiClient _api;
  Future<NotificationPage> list({String? kind, String? cursor}) async =>
      NotificationPage.fromJson(
        await _api.get<Json>(
          '/api/me/notifications',
          query: {'kind': kind, 'cursor': cursor},
        ),
      );
  Future<Json> target(String id) => _api.get<Json>('/api/me/notifications/$id');
  Future<void> action(String id, String action) => _api.patch<Object?>(
    '/api/me/notifications/$id',
    body: {'action': action},
  );
  Future<Json> task(String id) =>
      _api.get<Json>('/api/tasks/$id/notifications');
  Future<Json> preferences() =>
      _api.get<Json>('/api/me/notifications/preferences');
  Future<void> savePreferences(bool reminders, bool urgent) =>
      _api.patch<Object?>(
        '/api/me/notifications/preferences',
        body: {'reminders': reminders, 'urgent': urgent},
      );
  Future<void> snooze(String deliveryId, String preset) => _api.patch<Object?>(
    '/api/reminders/deliveries/$deliveryId',
    body: {'action': 'SNOOZE', 'preset': preset},
  );
}
