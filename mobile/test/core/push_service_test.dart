import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/notifications/push_service.dart';
import 'package:genwork_mobile/core/servers/server_registry.dart';
import 'package:genwork_mobile/data/models/app_user.dart';

class MemoryTokens implements TokenStore {
  final values = <String, StoredSession>{};
  @override
  Future<StoredSession?> read(String id) async => values[id];
  @override
  Future<void> write(String id, StoredSession s) async {
    values[id] = s;
  }

  @override
  Future<void> clear(String id) async {
    values.remove(id);
  }

  @override
  Future<void> adoptLegacy(String id) async {}
  @override
  Future<void> discardLegacy() async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'push solo acepta servidor conocido, cuenta vigente e ID válido',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final registry = ServerRegistry(prefs);
      final profile = await registry.upsert(Uri.parse('https://one.example'));
      final tokens = MemoryTokens();
      await tokens.write(
        profile.id,
        StoredSession(
          token: 'local-test-token',
          user: AppUser.fromJson({
            'id': 'u',
            'name': 'Test',
            'email': 'test@example.com',
            'globalRole': 'MEMBER',
          }),
        ),
      );
      final service = PushService(prefs, registry, tokens);
      final data = {
        'serverUrl': 'https://one.example',
        'userId': 'u',
        'notificationId': '12345678-1234-4123-8123-123456789abc',
      };
      final event = await service.validatePayload(data, true);
      expect(event?.serverId, profile.id);
      expect(event?.open, isTrue);
      expect(
        await service.validatePayload({
          ...data,
          'serverUrl': 'https://unknown.example',
        }, true),
        isNull,
      );
      expect(
        await service.validatePayload({...data, 'userId': 'other'}, true),
        isNull,
      );
      expect(
        await service.validatePayload({
          ...data,
          'notificationId': '../other',
        }, true),
        isNull,
      );
      await tokens.clear(profile.id);
      expect(await service.validatePayload(data, true), isNull);
    },
  );
  test('instalación estable y permiso no solicitado por defecto', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final service = PushService(prefs, ServerRegistry(prefs), MemoryTokens());
    final id = service.installationId;
    expect(
      id,
      matches(
        RegExp(
          r'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$',
        ),
      ),
    );
    expect(service.installationId, id);
    expect(service.hasAsked, isFalse);
    expect(await service.permitted(), isFalse);
  });
}
