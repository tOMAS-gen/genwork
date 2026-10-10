import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/data/models/app_user.dart';

class MemoryStore implements TokenStore {
  StoredSession? value = StoredSession(
    token: 'test',
    user: AppUser.fromJson({
      'id': 'u',
      'email': 'u@test',
      'name': 'Persona',
      'globalRole': 'SUPERADMIN',
    }),
  );
  int writes = 0;
  @override
  Future<StoredSession?> read() async => value;
  @override
  Future<void> write(StoredSession session) async {
    value = session;
    writes++;
  }

  @override
  Future<void> clear() async {
    value = null;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  Future<(ProviderContainer, MemoryStore)> fixture(
    Future<Object?> Function() respond,
  ) async {
    SharedPreferences.setMockInitialValues({
      'server_url': 'https://test.invalid',
    });
    final store = MemoryStore();
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) async {
          try {
            h.resolve(
              Response(
                requestOptions: r,
                statusCode: 200,
                data: await respond(),
              ),
            );
          } catch (e) {
            h.reject(DioException(requestOptions: r, error: e));
          }
        },
      ),
    );
    final c = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(
          await SharedPreferences.getInstance(),
        ),
        tokenStoreProvider.overrideWithValue(store),
        apiClientProvider.overrideWithValue(
          ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio),
        ),
      ],
    );
    addTearDown(c.dispose);
    await c.read(sessionProvider.future);
    return (c, store);
  }

  test(
    'QA10 cambio de rol se aplica y persiste sin reescribir si sigue igual',
    () async {
      final (c, store) = await fixture(
        () async => {
          'id': 'u',
          'email': 'u@test',
          'name': 'Persona',
          'globalRole': 'MEMBER',
        },
      );
      await c.read(sessionProvider.notifier).refreshUser();
      expect(
        (c.read(sessionProvider).requireValue as SignedIn).user.isSuperAdmin,
        false,
      );
      expect(store.value!.user.role, GlobalRole.member);
      await c.read(sessionProvider.notifier).refreshUser();
      expect(store.writes, 1);
    },
  );
  test('QA10 una caída de red conserva la sesión', () async {
    final (c, store) = await fixture(() async => throw StateError('sin red'));
    await c.read(sessionProvider.notifier).refreshUser();
    expect(c.read(sessionProvider).requireValue, isA<SignedIn>());
    expect(store.writes, 0);
  });
  test(
    'QA10 respuesta tardía no restaura una sesión que ya se cerró',
    () async {
      final gate = Completer<Object?>();
      final started = Completer<void>();
      final (c, store) = await fixture(() {
        started.complete();
        return gate.future;
      });
      final pending = c.read(sessionProvider.notifier).refreshUser();
      await started.future;
      await c.read(sessionProvider.notifier).handleUnauthorized();
      gate.complete({
        'id': 'u',
        'name': 'Persona',
        'email': 'u@test',
        'globalRole': 'MEMBER',
      });
      await pending;
      expect(c.read(sessionProvider).requireValue, isA<SignedOut>());
      expect(store.value, isNull);
      expect(store.writes, 0);
    },
  );
}
