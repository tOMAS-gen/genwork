import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MemoryTokenStore implements TokenStore {
  final Map<String, StoredSession> byProfile = {};
  StoredSession? legacy;

  @override
  Future<StoredSession?> read(String id) async => byProfile[id];
  @override
  Future<void> write(String id, StoredSession s) async => byProfile[id] = s;
  @override
  Future<void> clear(String id) async => byProfile.remove(id);
  @override
  Future<void> adoptLegacy(String id) async {
    final l = legacy;
    legacy = null;
    if (l != null) byProfile[id] = l;
  }
}

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository(Uri url, {this.valid = true}) : super(serverUrl: url);
  final bool valid;
  @override
  Future<ServerInfo> checkServer() async {
    if (!valid) {
      throw const ApiException(code: 'NOT_GENWORK', message: 'No es genwork');
    }
    return ServerInfo(name: 'Sistema ${serverUrl.host}');
  }

  @override
  Future<void> logout(String token) async {}
}

AppUser _user(String id) => AppUser.fromJson({
      'id': id, 'email': '$id@test', 'name': id, 'globalRole': 'MEMBER',
    });

StoredSession _session(String token, String user) =>
    StoredSession(token: token, user: _user(user));

Future<(ProviderContainer, MemoryTokenStore)> _fixture({
  Map<String, Object> prefs = const {},
  Set<String> invalidHosts = const {},
  StoredSession? legacy,
}) async {
  SharedPreferences.setMockInitialValues(prefs);
  final instance = await SharedPreferences.getInstance();
  final store = MemoryTokenStore()..legacy = legacy;
  final container = ProviderContainer(overrides: [
    sharedPreferencesProvider.overrideWithValue(instance),
    tokenStoreProvider.overrideWithValue(store),
    authRepositoryProvider.overrideWith(
      (ref, url) => FakeAuthRepository(url, valid: !invalidHosts.contains(url.host)),
    ),
  ]);
  addTearDown(container.dispose);
  return (container, store);
}

void main() {
  test('sin perfiles → NeedsServer', () async {
    final (c, _) = await _fixture();
    expect(await c.read(sessionProvider.future), isA<NeedsServer>());
  });

  test('migra server_url + token global y conserva la sesión', () async {
    final (c, store) = await _fixture(
      prefs: {'server_url': 'https://old.test'},
      legacy: _session('viejo', 'u1'),
    );
    final s = await c.read(sessionProvider.future);
    expect(s, isA<SignedIn>());
    expect((s as SignedIn).token, 'viejo');
    expect(s.serverUrl, Uri.parse('https://old.test'));
    expect(c.read(serverListProvider), hasLength(1));
    expect(store.legacy, isNull);
  });

  test('addServer guarda con el nombre de /info, activa y queda SignedOut', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    await c.read(sessionProvider.notifier).addServer('https://a.test');
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(c.read(serverListProvider).single.name, 'Sistema a.test');
  });

  test('addServer con un servidor inválido no guarda nada', () async {
    final (c, _) = await _fixture(invalidHosts: {'x.test'});
    await c.read(sessionProvider.future);
    await expectLater(
      c.read(sessionProvider.notifier).addServer('https://x.test'),
      throwsA(isA<ApiException>()),
    );
    expect(c.read(serverListProvider), isEmpty);
    expect(c.read(sessionProvider).value, isA<NeedsServer>());
  });

  test('addServer del mismo servidor escrito distinto no duplica', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('A.TEST/');
    expect(c.read(serverListProvider), hasLength(1));
  });

  test('switchServer cambia entre dos sesiones sin pedir login', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    expect((c.read(sessionProvider).value as SignedIn).token, 'tb');

    await n.switchServer(a);
    final s = c.read(sessionProvider).value as SignedIn;
    expect(s.token, 'ta');
    expect(s.serverUrl, Uri.parse('https://a.test'));
  });

  test('switchServer a uno sin token queda SignedOut de ese servidor', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    await n.switchServer(ServerProfile.idFor(Uri.parse('https://a.test')));
    final s = c.read(sessionProvider).value;
    expect(s, isA<SignedOut>());
    expect((s as SignedOut).serverUrl, Uri.parse('https://a.test'));
  });

  test('logout y 401 afectan solo al perfil activo', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    await n.logout();
    expect(store.byProfile.containsKey(b), isFalse);
    expect(store.byProfile.containsKey(a), isTrue);
    expect(c.read(serverListProvider), hasLength(2)); // el perfil sigue guardado
  });

  test('removeServer del activo pasa a otro; del último vuelve a NeedsServer', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test'); // activo = b

    await n.removeServer(b);
    expect((c.read(sessionProvider).value as SignedIn).token, 'ta');
    expect(store.byProfile.containsKey(b), isFalse);

    await n.removeServer(a);
    expect(c.read(sessionProvider).value, isA<NeedsServer>());
    expect(c.read(serverListProvider), isEmpty);
  });

  test('removeServer de uno inactivo no toca la sesión actual', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test'); // activo = b (SignedOut)
    await n.removeServer(a);
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(c.read(serverListProvider), hasLength(1));
  });

  test('token legacy pendiente se adopta aunque la migración de prefs ya corrió', () async {
    final id = ServerProfile.idFor(Uri.parse('https://old.test'));
    final profile = ServerProfile.forUrl(Uri.parse('https://old.test'), name: 'Old');
    final (c, store) = await _fixture(
      prefs: {
        'server_profiles': jsonEncode([profile.toJson()]),
        'active_server_id': id,
      },
      legacy: _session('huerfano', 'u1'),
    );
    final s = await c.read(sessionProvider.future);
    expect(s, isA<SignedIn>());
    expect((s as SignedIn).token, 'huerfano');
    expect(store.legacy, isNull);
  });

  test('401 con el token del servidor activo lo desloguea y no toca al otro', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    await n.handleUnauthorized('tb');
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(store.byProfile.containsKey(b), isFalse);
    expect(store.byProfile[a]!.token, 'ta');
  });

  test('401 tardío de un servidor anterior no desloguea al nuevo activo', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    await n.switchServer(a);
    await n.handleUnauthorized('tb');
    expect((c.read(sessionProvider).value as SignedIn).token, 'ta');
    expect(store.byProfile[a]!.token, 'ta');
  });
}
