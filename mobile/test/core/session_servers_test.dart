import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/session_controller.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/core/servers/server_registry.dart';
import 'package:genwork_mobile/data/models/live_event.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/shell/live_refresher.dart';
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

  @override
  Future<void> discardLegacy() async => legacy = null;
}

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository(Uri url, {this.valid = true, this.onLogout, this.loginGate})
      : super(serverUrl: url);
  final bool valid;
  final Future<void> Function(String token)? onLogout;
  final Future<StoredSession>? loginGate;
  @override
  Future<ServerInfo> checkServer() async {
    if (!valid) {
      throw const ApiException(code: 'NOT_GENWORK', message: 'No es genwork');
    }
    return ServerInfo(name: 'Sistema ${serverUrl.host}');
  }

  @override
  Future<void> logout(String token) async => onLogout?.call(token);

  @override
  Future<StoredSession> login() => loginGate!;
}

/// Registro cuyo `setActive` falla una vez: simula morir entre migrar y activar.
class _CrashingRegistry extends ServerRegistry {
  _CrashingRegistry(super.prefs);
  bool crashed = false;
  @override
  Future<void> setActive(String id) async {
    if (!crashed) {
      crashed = true;
      throw StateError('crash');
    }
    return super.setActive(id);
  }
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
  Future<void> Function(String token)? onLogout,
  Future<StoredSession>? loginGate,
  DateTime Function()? clock,
}) async {
  SharedPreferences.setMockInitialValues(prefs);
  final instance = await SharedPreferences.getInstance();
  final store = MemoryTokenStore()..legacy = legacy;
  final container = ProviderContainer(overrides: [
    sharedPreferencesProvider.overrideWithValue(instance),
    tokenStoreProvider.overrideWithValue(store),
    if (clock != null) authClockProvider.overrideWithValue(clock),
    authRepositoryProvider.overrideWith(
      (ref, url) => FakeAuthRepository(
        url,
        valid: !invalidHosts.contains(url.host),
        onLogout: onLogout,
        loginGate: loginGate,
      ),
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

  group('autoLogin', () {
    bool flag(ProviderContainer c) => (c.read(sessionProvider).value as SignedOut).autoLogin;

    test('addServer sin token → SignedOut con autoLogin; con token → SignedIn', () async {
      final a = ServerProfile.idFor(Uri.parse('https://a.test'));
      final (c, store) = await _fixture();
      store.byProfile[a] = _session('ta', 'ua');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.addServer('https://b.test');
      expect(flag(c), isTrue);
      await n.addServer('https://a.test');
      expect(c.read(sessionProvider).value, isA<SignedIn>());
    });

    test('switchServer a un perfil sin token → autoLogin', () async {
      final a = ServerProfile.idFor(Uri.parse('https://a.test'));
      final b = ServerProfile.idFor(Uri.parse('https://b.test'));
      final (c, store) = await _fixture();
      store.byProfile[b] = _session('tb', 'ub');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.addServer('https://a.test');
      await n.addServer('https://b.test');
      await n.switchServer(a);
      expect(flag(c), isTrue);
    });

    test('arranque con perfil sin token → autoLogin', () async {
      final a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'A');
      final (c, _) = await _fixture(prefs: {
        'server_profiles': '[{"id":"${a.id}","url":"${a.url}","name":"A"}]',
        'active_server_id': a.id,
      });
      await c.read(sessionProvider.future);
      expect(flag(c), isTrue);
    });

    test('logout → sin autoLogin; 401 → autoLogin', () async {
      final a = ServerProfile.idFor(Uri.parse('https://a.test'));
      final (c, store) = await _fixture();
      store.byProfile[a] = _session('ta', 'ua');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.addServer('https://a.test');
      await n.logout();
      expect(flag(c), isFalse);
      store.byProfile[a] = _session('ta', 'ua');
      await n.switchServer(a);
      await n.handleUnauthorized('ta');
      expect(flag(c), isTrue);
    });

    test('401 dentro de la ventana tras un login exitoso → sin autoLogin (anti-bucle)', () async {
      var now = DateTime(2026, 1, 1, 12);
      final (c, _) = await _fixture(
        loginGate: Future.value(_session('tz', 'uz')),
        clock: () => now,
      );
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.addServer('https://a.test');
      await n.login();
      now = now.add(kFreshLoginWindow - const Duration(seconds: 1));
      await n.handleUnauthorized('tz');
      expect(flag(c), isFalse);
    });

    test('401 pasada la ventana tras un login → autoLogin', () async {
      var now = DateTime(2026, 1, 1, 12);
      final (c, _) = await _fixture(
        loginGate: Future.value(_session('tz', 'uz')),
        clock: () => now,
      );
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.addServer('https://a.test');
      await n.login();
      now = now.add(kFreshLoginWindow + const Duration(seconds: 1));
      await n.handleUnauthorized('tz');
      expect(flag(c), isTrue);
    });

    test('removeServer del activo cayendo a uno sin token → sin autoLogin', () async {
      final b = ServerProfile.idFor(Uri.parse('https://b.test'));
      final (c, store) = await _fixture();
      store.byProfile[b] = _session('tb', 'ub');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.addServer('https://a.test');
      await n.addServer('https://b.test'); // activo = b con token
      await n.removeServer(b);
      expect(c.read(sessionProvider).value, isA<SignedOut>());
      expect(flag(c), isFalse);
    });

    test('consumeAutoLogin devuelve true una vez y limpia el flag', () async {
      final (c, _) = await _fixture();
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      expect(n.consumeAutoLogin(), isFalse); // NeedsServer
      await n.addServer('https://a.test');
      expect(n.consumeAutoLogin(), isTrue);
      expect(flag(c), isFalse);
      expect(n.consumeAutoLogin(), isFalse);
      expect((c.read(sessionProvider).value as SignedOut).serverUrl, Uri.parse('https://a.test'));
    });
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

  test('URL legacy inválida: sin perfil, token legacy descartado y no adoptado después', () async {
    final (c, store) = await _fixture(
      prefs: {'server_url': ''},
      legacy: _session('huerfano', 'u1'),
    );
    expect(await c.read(sessionProvider.future), isA<NeedsServer>());
    expect(store.legacy, isNull);
    expect(c.read(serverListProvider), isEmpty);
    await c.read(sessionProvider.notifier).addServer('https://nuevo.test');
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(store.byProfile, isEmpty);
  });

  test('si la migración muere tras el upsert, el próximo inicio termina SignedIn', () async {
    SharedPreferences.setMockInitialValues({'server_url': 'https://old.test'});
    final prefs = await SharedPreferences.getInstance();
    final store = MemoryTokenStore()..legacy = _session('viejo', 'u1');
    final registry = _CrashingRegistry(prefs);
    ProviderContainer make() => ProviderContainer(overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          serverRegistryProvider.overrideWithValue(registry),
          tokenStoreProvider.overrideWithValue(store),
          authRepositoryProvider.overrideWith((ref, url) => FakeAuthRepository(url)),
        ]);
    final first = make();
    addTearDown(first.dispose);
    await expectLater(first.read(sessionProvider.future), throwsA(isA<StateError>()));
    expect(prefs.getString('server_url'), isNotNull); // la clave vieja sigue
    final second = make();
    addTearDown(second.dispose);
    final s = await second.read(sessionProvider.future);
    expect(s, isA<SignedIn>());
    expect((s as SignedIn).token, 'viejo');
    expect(prefs.getString('server_url'), isNull);
  });

  test('removeServer no espera la revocación de red y revoca con el token del perfil', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final never = Completer<void>();
    final revoked = <String>[];
    final (c, store) = await _fixture(onLogout: (t) {
      revoked.add(t);
      return never.future;
    });
    store.byProfile[a] = _session('ta', 'ua');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.removeServer(a).timeout(const Duration(seconds: 2));
    expect(store.byProfile.containsKey(a), isFalse);
    expect(c.read(serverListProvider), isEmpty);
    expect(c.read(sessionProvider).value, isA<NeedsServer>());
    expect(revoked, ['ta']);
  });

  test('login: si cambió el servidor activo, guarda el token en su perfil sin pisar el estado', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final gate = Completer<StoredSession>();
    final (c, store) = await _fixture(loginGate: gate.future);
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test'); // SignedOut de A
    final login = n.login();
    await n.addServer('https://b.test'); // el usuario cambia a B mientras tanto
    gate.complete(_session('ta', 'ua'));
    await login;
    expect(store.byProfile[a]!.token, 'ta');
    final s = c.read(sessionProvider).value;
    expect(s, isA<SignedOut>());
    expect((s as SignedOut).serverUrl, Uri.parse('https://b.test'));
  });

  test('cambiar de servidor reconstruye el cliente y cierra el stream live anterior', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final dios = <Dio>[];
    final tokens = <CancelToken>[];
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final store = MemoryTokenStore()
      ..byProfile[a] = _session('ta', 'ua')
      ..byProfile[b] = _session('tb', 'ub');
    final c = ProviderContainer(overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(store),
      authRepositoryProvider.overrideWith((ref, url) => FakeAuthRepository(url)),
      liveStreamFactoryProvider.overrideWithValue((dio, {cancelToken, path = '/api/stream'}) {
        dios.add(dio);
        tokens.add(cancelToken!);
        return const Stream<LiveEvent>.empty();
      }),
    ]);
    addTearDown(c.dispose);
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://b.test');
    await n.addServer('https://a.test'); // activo = a
    final subClient = c.listen(apiClientProvider, (_, _) {});
    final subLive = c.listen(liveEventsProvider, (_, _) {});
    final clientA = subClient.read();
    expect(clientA.dio.options.baseUrl, 'https://a.test');
    expect(tokens, hasLength(1));
    expect(tokens.single.isCancelled, isFalse);

    await n.switchServer(b);
    await Future<void>.delayed(Duration.zero); // deja correr el rebuild de los providers
    final clientB = subClient.read();
    expect(identical(clientA, clientB), isFalse);
    expect(clientB.dio.options.baseUrl, 'https://b.test');
    expect(tokens.first.isCancelled, isTrue); // se cerró el live de A
    expect(tokens, hasLength(2));
    expect(tokens.last.isCancelled, isFalse);
    expect(dios.last, same(clientB.dio));

    // El Bearer del cliente nuevo es el de B.
    String? auth;
    clientB.dio.httpClientAdapter = _CaptureAdapter((o) => auth = o.headers['Authorization'] as String?);
    await clientB.dio.get('/x');
    expect(auth, 'Bearer tb');
    subLive.close();
  });
}

class _CaptureAdapter implements HttpClientAdapter {
  _CaptureAdapter(this.onRequest);
  final void Function(RequestOptions) onRequest;
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? requestStream, Future<void>? cancelFuture) async {
    onRequest(options);
    return ResponseBody.fromString('{}', 200, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}
