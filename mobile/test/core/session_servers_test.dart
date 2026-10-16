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

/// Logins pedidos al navegador (falso) en el test actual.
final _loginCalls = <Uri>[];

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository(Uri url, {this.valid = true, this.onLogout, this.loginGate})
      : super(serverUrl: url);
  final bool valid;
  final Future<void> Function(String token)? onLogout;

  /// Resultado del login del navegador; sin él, el usuario lo cancela.
  final Future<StoredSession> Function(Uri url)? loginGate;
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
  Future<StoredSession> login() {
    _loginCalls.add(serverUrl);
    final gate = loginGate;
    if (gate == null) return Future.error(const LoginCancelled());
    return gate(serverUrl);
  }
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
  Future<StoredSession> Function(Uri url)? loginGate,
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
  setUp(_loginCalls.clear);

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

  test('connect guarda con el nombre de /info, activa y (login cancelado) queda SignedOut', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    await c.read(sessionProvider.notifier).connect('https://a.test');
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(c.read(serverListProvider).single.name, 'Sistema a.test');
  });

  test('connect con un servidor inválido no guarda nada ni abre el navegador', () async {
    final (c, _) = await _fixture(invalidHosts: {'x.test'});
    await c.read(sessionProvider.future);
    await expectLater(
      c.read(sessionProvider.notifier).connect('https://x.test'),
      throwsA(isA<ApiException>()),
    );
    expect(c.read(serverListProvider), isEmpty);
    expect(c.read(sessionProvider).value, isA<NeedsServer>());
    expect(_loginCalls, isEmpty);
  });

  test('connect del mismo servidor escrito distinto no duplica', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.connect('https://a.test');
    await n.connect('A.TEST/');
    expect(c.read(serverListProvider), hasLength(1));
  });

  test('select cambia entre dos sesiones sin pedir login', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.connect('https://a.test');
    await n.connect('https://b.test');
    expect((c.read(sessionProvider).value as SignedIn).token, 'tb');

    await n.select(a);
    final s = c.read(sessionProvider).value as SignedIn;
    expect(s.token, 'ta');
    expect(s.serverUrl, Uri.parse('https://a.test'));
    expect(_loginCalls, isEmpty);
  });

  test('select a uno sin token y login cancelado queda SignedOut de ese servidor', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.connect('https://a.test');
    await n.connect('https://b.test');
    await n.select(ServerProfile.idFor(Uri.parse('https://a.test')));
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
    await n.connect('https://a.test');
    await n.connect('https://b.test');
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
    await n.connect('https://a.test');
    await n.connect('https://b.test'); // activo = b

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
    await n.connect('https://a.test');
    await n.connect('https://b.test'); // activo = b (SignedOut)
    await n.removeServer(a);
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(c.read(serverListProvider), hasLength(1));
  });

  group('autoLogin', () {
    bool flag(ProviderContainer c) => (c.read(sessionProvider).value as SignedOut).autoLogin;

    test('connect/select cancelados no dejan autoLogin (la pantalla ya lanzó el login)', () async {
      final (c, _) = await _fixture();
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.connect('https://a.test');
      expect(flag(c), isFalse);
      await n.connect('https://b.test');
      await n.select(ServerProfile.idFor(Uri.parse('https://a.test')));
      expect(flag(c), isFalse);
      expect(_loginCalls, hasLength(3));
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
      await n.connect('https://a.test');
      await n.logout();
      expect(flag(c), isFalse);
      store.byProfile[a] = _session('ta', 'ua');
      await n.select(a);
      await n.handleUnauthorized('ta');
      expect(flag(c), isTrue);
    });

    test('401 dentro de la ventana tras un login exitoso → sin autoLogin (anti-bucle)', () async {
      var now = DateTime(2026, 1, 1, 12);
      final (c, _) = await _fixture(
        loginGate: (_) async => _session('tz', 'uz'),
        clock: () => now,
      );
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.connect('https://a.test');
      expect((c.read(sessionProvider).value as SignedIn).token, 'tz');
      now = now.add(kFreshLoginWindow - const Duration(seconds: 1));
      await n.handleUnauthorized('tz');
      expect(flag(c), isFalse);
    });

    test('401 pasada la ventana tras un login → autoLogin', () async {
      var now = DateTime(2026, 1, 1, 12);
      final (c, _) = await _fixture(
        loginGate: (_) async => _session('tz', 'uz'),
        clock: () => now,
      );
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.connect('https://a.test');
      expect((c.read(sessionProvider).value as SignedIn).token, 'tz');
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
      await n.connect('https://a.test');
      await n.connect('https://b.test'); // activo = b con token
      await n.removeServer(b);
      expect(c.read(sessionProvider).value, isA<SignedOut>());
      expect(flag(c), isFalse);
    });

    Future<ProviderContainer> startupSignedOut({
      Future<StoredSession> Function(Uri url)? loginGate,
    }) async {
      final a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'A');
      final (c, _) = await _fixture(
        prefs: {
          'server_profiles': '[{"id":"${a.id}","url":"${a.url}","name":"A"}]',
          'active_server_id': a.id,
        },
        loginGate: loginGate,
      );
      await c.read(sessionProvider.future);
      return c;
    }

    test('consumeAutoLogin devuelve true una vez y limpia el flag', () async {
      final c = await startupSignedOut();
      final n = c.read(sessionProvider.notifier);
      expect(n.consumeAutoLogin(), isTrue);
      expect(flag(c), isFalse);
      expect(n.consumeAutoLogin(), isFalse);
      expect((c.read(sessionProvider).value as SignedOut).serverUrl, Uri.parse('https://a.test'));
    });

    test('consumeAutoLogin sin servidor → false', () async {
      final (c, _) = await _fixture();
      await c.read(sessionProvider.future);
      expect(c.read(sessionProvider.notifier).consumeAutoLogin(), isFalse);
    });

    test('loginActive: login ok → SignedIn del servidor activo', () async {
      final c = await startupSignedOut(loginGate: (_) async => _session('ta', 'ua'));
      final n = c.read(sessionProvider.notifier);
      n.consumeAutoLogin();
      expect(await n.loginActive(), ConnectResult.signedIn);
      final s = c.read(sessionProvider).value as SignedIn;
      expect(s.token, 'ta');
      expect(_loginCalls, [Uri.parse('https://a.test')]);
    });

    test('loginActive: cancelado → sigue SignedOut sin autoLogin', () async {
      final c = await startupSignedOut();
      final n = c.read(sessionProvider.notifier);
      n.consumeAutoLogin();
      expect(await n.loginActive(), ConnectResult.cancelled);
      expect(flag(c), isFalse);
      expect(c.read(serverListProvider), hasLength(1));
    });

    test('loginActive con sesión iniciada no abre el navegador', () async {
      final a = ServerProfile.idFor(Uri.parse('https://a.test'));
      final (c, store) = await _fixture();
      store.byProfile[a] = _session('ta', 'ua');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.connect('https://a.test');
      expect(await n.loginActive(), ConnectResult.cancelled);
      expect(_loginCalls, isEmpty);
    });
  });

  group('un solo login del navegador a la vez', () {
    final aUrl = Uri.parse('https://a.test');
    final bUrl = Uri.parse('https://b.test');
    final cUrl = Uri.parse('https://c.test');
    final a = ServerProfile.idFor(aUrl);
    final b = ServerProfile.idFor(bUrl);

    Future<void> untilLogin(int n) async {
      while (_loginCalls.length < n) {
        await Future<void>.delayed(Duration.zero);
      }
    }

    test('dos connect a la vez: un solo navegador; el segundo cancela y queda guardado', () async {
      final gate = Completer<StoredSession>();
      final (c, _) = await _fixture(loginGate: (_) => gate.future);
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      final first = n.connect('https://a.test');
      await untilLogin(1);
      expect(await n.connect('https://b.test'), ConnectResult.cancelled);
      expect(_loginCalls, [aUrl]);
      expect(c.read(serverListProvider).map((p) => p.id), containsAll([a, b]));
      gate.complete(_session('ta', 'ua'));
      expect(await first, ConnectResult.signedIn);
      expect((c.read(sessionProvider).value as SignedIn).serverUrl, aUrl);
    });

    test('select durante un login en curso no abre otro navegador', () async {
      final gate = Completer<StoredSession>();
      final (c, _) = await _fixture(loginGate: (_) => gate.future);
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      final first = n.connect('https://a.test');
      await untilLogin(1);
      await c.read(serverRegistryProvider).upsert(bUrl);
      expect(await n.select(b), ConnectResult.cancelled);
      expect(_loginCalls, [aUrl]);
      gate.completeError(const LoginCancelled());
      expect(await first, ConnectResult.cancelled);
    });

    test('loginActive durante un connect en curso no abre otro navegador', () async {
      final gate = Completer<StoredSession>();
      final pa = ServerProfile.forUrl(aUrl, name: 'A');
      final (c, _) = await _fixture(
        prefs: {
          'server_profiles': '[{"id":"${pa.id}","url":"${pa.url}","name":"A"}]',
          'active_server_id': pa.id,
        },
        loginGate: (_) => gate.future,
      );
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      final first = n.connect('https://b.test');
      await untilLogin(1);
      expect(await n.loginActive(), ConnectResult.cancelled);
      expect(_loginCalls, [bUrl]);
      gate.completeError(const LoginCancelled());
      await first;
    });

    test('un 401 durante otro login: no se consume en curso y al terminar lanza un solo loginActive', () async {
      final gate = Completer<StoredSession>();
      final (c, store) = await _fixture(
        loginGate: (url) => url == cUrl ? gate.future : Future.error(const LoginCancelled()),
      );
      store.byProfile[a] = _session('ta', 'ua');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.connect('https://a.test'); // SignedIn(A)
      // Como la lista de servidores: al ver el flag, consume y lanza.
      final consumed = <bool>[];
      final sub = c.listen(sessionProvider, (_, next) {
        final s = next.value;
        if (s is SignedOut && s.autoLogin) {
          final ok = n.consumeAutoLogin();
          consumed.add(ok);
          if (ok) n.loginActive();
        }
      });
      addTearDown(sub.close);
      final pending = n.connect('https://c.test'); // navegador de C
      await untilLogin(1);
      await n.handleUnauthorized('ta'); // 401 de A mientras tanto
      expect(consumed, [false]);
      expect((c.read(sessionProvider).value as SignedOut).autoLogin, isTrue);
      gate.completeError(const LoginCancelled());
      expect(await pending, ConnectResult.cancelled);
      await untilLogin(2);
      await Future<void>.delayed(Duration.zero);
      expect(_loginCalls, [cUrl, aUrl]);
      expect(consumed, [false, true]);
      // Cancelado: sin flag, no hay bucle.
      for (var i = 0; i < 5; i++) {
        await Future<void>.delayed(Duration.zero);
      }
      expect(_loginCalls, hasLength(2));
      expect((c.read(sessionProvider).value as SignedOut).autoLogin, isFalse);
    });

    test('terminado un login, el siguiente connect abre el navegador normalmente', () async {
      final (c, _) = await _fixture();
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      expect(await n.connect('https://a.test'), ConnectResult.cancelled);
      expect(await n.connect('https://b.test'), ConnectResult.cancelled);
      expect(_loginCalls, [aUrl, bUrl]);
    });
  });

  group('connect/select (login del navegador en el lugar)', () {
    final aUrl = Uri.parse('https://a.test');
    final bUrl = Uri.parse('https://b.test');
    final a = ServerProfile.idFor(aUrl);
    final b = ServerProfile.idFor(bUrl);
    String? activeId(ProviderContainer c) => c.read(serverRegistryProvider).active()?.id;

    test('con token guardado entra sin abrir el navegador', () async {
      final (c, store) = await _fixture();
      store.byProfile[a] = _session('ta', 'ua');
      await c.read(sessionProvider.future);
      final r = await c.read(sessionProvider.notifier).connect('https://a.test');
      expect(r, ConnectResult.signedIn);
      expect((c.read(sessionProvider).value as SignedIn).token, 'ta');
      expect(_loginCalls, isEmpty);
    });

    test('sin token + login ok → SignedIn, token guardado en su perfil y activo', () async {
      final (c, store) = await _fixture(loginGate: (_) async => _session('ta', 'ua'));
      await c.read(sessionProvider.future);
      final r = await c.read(sessionProvider.notifier).connect('https://a.test');
      expect(r, ConnectResult.signedIn);
      final s = c.read(sessionProvider).value as SignedIn;
      expect(s.serverUrl, aUrl);
      expect(store.byProfile[a]!.token, 'ta');
      expect(activeId(c), a);
      expect(_loginCalls, [aUrl]);
    });

    test('sin token + cancelado desde el primer inicio → SignedOut y servidor guardado', () async {
      final (c, store) = await _fixture();
      await c.read(sessionProvider.future);
      final r = await c.read(sessionProvider.notifier).connect('https://a.test');
      expect(r, ConnectResult.cancelled);
      final s = c.read(sessionProvider).value as SignedOut;
      expect(s.serverUrl, aUrl);
      expect(s.autoLogin, isFalse);
      expect(c.read(serverListProvider).single.id, a);
      expect(activeId(c), a);
      expect(store.byProfile, isEmpty);
    });

    test('sin token + cancelado con otra sesión iniciada → la sesión de A sigue intacta', () async {
      final (c, store) = await _fixture();
      store.byProfile[a] = _session('ta', 'ua');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.connect('https://a.test');
      final before = c.read(sessionProvider).value;
      expect(await n.connect('https://b.test'), ConnectResult.cancelled);
      expect(identical(c.read(sessionProvider).value, before), isTrue);
      expect(activeId(c), a);
      expect(c.read(serverListProvider).map((p) => p.id), containsAll([a, b]));
      // Elegir B (guardado, sin sesión) y cancelar tampoco toca a A.
      expect(await n.select(b), ConnectResult.cancelled);
      expect(identical(c.read(sessionProvider).value, before), isTrue);
      expect(_loginCalls, [bUrl, bUrl]);
    });

    test('sin token + error → relanza; desde el primer inicio queda SignedOut', () async {
      final (c, _) = await _fixture(
        loginGate: (_) async => throw const ApiException(code: 'FORBIDDEN', message: 'Sin acceso'),
      );
      await c.read(sessionProvider.future);
      await expectLater(
        c.read(sessionProvider.notifier).connect('https://a.test'),
        throwsA(isA<ApiException>()),
      );
      expect((c.read(sessionProvider).value as SignedOut).serverUrl, aUrl);
      expect(c.read(serverListProvider), hasLength(1));
    });

    test('sin token + error con otra sesión iniciada → relanza y A sigue intacta', () async {
      final (c, store) = await _fixture(
        loginGate: (_) async => throw const ApiException(code: 'FORBIDDEN', message: 'Sin acceso'),
      );
      store.byProfile[a] = _session('ta', 'ua');
      await c.read(sessionProvider.future);
      final n = c.read(sessionProvider.notifier);
      await n.connect('https://a.test');
      final before = c.read(sessionProvider).value;
      await expectLater(n.connect('https://b.test'), throwsA(isA<ApiException>()));
      expect(identical(c.read(sessionProvider).value, before), isTrue);
      expect(activeId(c), a);
    });

    test('select de un id desconocido no hace nada', () async {
      final (c, _) = await _fixture();
      await c.read(sessionProvider.future);
      expect(await c.read(sessionProvider.notifier).select('nope'), ConnectResult.cancelled);
      expect(c.read(sessionProvider).value, isA<NeedsServer>());
      expect(_loginCalls, isEmpty);
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
    await n.connect('https://a.test');
    await n.connect('https://b.test');
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
    await n.connect('https://a.test');
    await n.connect('https://b.test');
    await n.select(a);
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
    await c.read(sessionProvider.notifier).connect('https://nuevo.test');
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
    await n.connect('https://a.test');
    await n.removeServer(a).timeout(const Duration(seconds: 2));
    expect(store.byProfile.containsKey(a), isFalse);
    expect(c.read(serverListProvider), isEmpty);
    expect(c.read(sessionProvider).value, isA<NeedsServer>());
    expect(revoked, ['ta']);
  });

  test('login: si el estado cambió durante el navegador, guarda el token en su perfil sin pisar el estado', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final gate = Completer<StoredSession>();
    final (c, store) = await _fixture(loginGate: (_) => gate.future);
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    final login = n.connect('https://a.test'); // navegador de A abierto
    while (_loginCalls.isEmpty) {
      await Future<void>.delayed(Duration.zero);
    }
    await n.connect('https://b.test'); // mientras tanto entra a B (tiene token)
    final during = c.read(sessionProvider).value as SignedIn;
    gate.complete(_session('ta', 'ua'));
    await login;
    expect(store.byProfile[a]!.token, 'ta');
    expect(identical(c.read(sessionProvider).value, during), isTrue);
    expect(c.read(serverRegistryProvider).active()?.id, b);
  });

  test('cancelar tras un cambio de estado durante el navegador no pisa el estado', () async {
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final gate = Completer<StoredSession>();
    final (c, store) = await _fixture(loginGate: (_) => gate.future);
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    final login = n.connect('https://a.test');
    while (_loginCalls.isEmpty) {
      await Future<void>.delayed(Duration.zero);
    }
    await n.connect('https://b.test');
    final during = c.read(sessionProvider).value;
    gate.completeError(const LoginCancelled());
    expect(await login, ConnectResult.cancelled);
    expect(identical(c.read(sessionProvider).value, during), isTrue);
    expect(c.read(serverRegistryProvider).active()?.id, b);
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
    await n.connect('https://b.test');
    await n.connect('https://a.test'); // activo = a
    final subClient = c.listen(apiClientProvider, (_, _) {});
    final subLive = c.listen(liveEventsProvider, (_, _) {});
    final clientA = subClient.read();
    expect(clientA.dio.options.baseUrl, 'https://a.test');
    expect(tokens, hasLength(1));
    expect(tokens.single.isCancelled, isFalse);

    await n.select(b);
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
