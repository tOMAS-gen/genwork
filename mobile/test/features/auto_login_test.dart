import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/app_router.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Tokens implements TokenStore {
  final Map<String, StoredSession> byProfile = {};
  @override
  Future<StoredSession?> read(String id) async => byProfile[id];
  @override
  Future<void> write(String id, StoredSession s) async => byProfile[id] = s;
  @override
  Future<void> clear(String id) async => byProfile.remove(id);
  @override
  Future<void> adoptLegacy(String id) async {}
  @override
  Future<void> discardLegacy() async {}
}

class _FakeAuth extends AuthRepository {
  _FakeAuth(Uri url, this.loginCalls, this.loginBehavior) : super(serverUrl: url);
  final List<Uri> loginCalls;
  final Future<StoredSession> Function() loginBehavior;
  @override
  Future<ServerInfo> checkServer() async => ServerInfo(name: 'Sistema ${serverUrl.host}');
  @override
  Future<StoredSession> login() {
    loginCalls.add(serverUrl);
    return loginBehavior();
  }
}

StoredSession _ok() => StoredSession(
      token: 't',
      user: AppUser.fromJson({'id': 'u', 'email': 'u@test', 'name': 'u', 'globalRole': 'MEMBER'}),
    );

Widget _fakeScanner(BuildContext context, ValueChanged<String> onCode) => TextButton(
      key: const ValueKey('scan'),
      onPressed: () => onCode('genwork://connect?server=https%3A%2F%2Fa.test'),
      child: const Text('scan'),
    );

Future<(List<Uri>, ProviderContainer)> _pump(
  WidgetTester tester, {
  required Future<StoredSession> Function() login,
  bool savedServer = false,
  bool twoServers = false,
}) async {
  tester.view.physicalSize = const Size(400, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await initializeDateFormatting('es');
  final a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'A');
  final b = ServerProfile.forUrl(Uri.parse('https://b.test'), name: 'B');
  SharedPreferences.setMockInitialValues(savedServer
      ? {
          'server_profiles': '[{"id":"${a.id}","url":"${a.url}","name":"A"}'
              '${twoServers ? ',{"id":"${b.id}","url":"${b.url}","name":"B"}' : ''}]',
          'active_server_id': a.id,
        }
      : {});
  final prefs = await SharedPreferences.getInstance();
  final calls = <Uri>[];
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(_Tokens()),
      qrScannerBuilderProvider.overrideWithValue(_fakeScanner),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url, calls, login)),
    ],
    child: const GenworkApp(),
  ));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
  final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
  return (calls, container);
}

void main() {
  testWidgets('agregar un servidor sin sesión abre el login una sola vez y queda dentro', (tester) async {
    final (calls, c) = await _pump(tester, login: () async => _ok());
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls, [Uri.parse('https://a.test')]);
    expect(c.read(sessionProvider).value, isA<SignedIn>());
    // Desmonta el shell (que arranca timers de carga/live) antes de terminar.
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(minutes: 1));
  });

  testWidgets('arranque con servidor guardado sin token no abre el login solo', (tester) async {
    final (calls, c) = await _pump(tester, login: () async => _ok(), savedServer: true);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(calls, isEmpty);
    expect(c.read(sessionProvider).value, isA<SignedOut>());
  });

  testWidgets('login cancelado deja la pantalla con el botón y no reintenta', (tester) async {
    final (calls, _) = await _pump(tester, login: () async => throw const LoginCancelled());
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(calls, hasLength(1));
    await tester.pump(const Duration(seconds: 1));
    expect(calls, hasLength(1));
  });

  testWidgets('error del login se muestra inline y no reintenta', (tester) async {
    final (calls, _) = await _pump(
      tester,
      login: () async => throw const ApiException(code: 'FORBIDDEN', message: 'Sin acceso'),
    );
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pumpAndSettle();
    expect(find.text('Sin acceso'), findsOneWidget);
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(calls, hasLength(1));
  });

  testWidgets('con el login ya abierto, agregar otro servidor sin sesión lo lanza una vez', (tester) async {
    final (calls, c) = await _pump(
      tester,
      login: () async => throw const LoginCancelled(),
      savedServer: true,
    );
    await tester.pumpAndSettle();
    expect(calls, isEmpty);
    await c.read(sessionProvider.notifier).addServer('https://b.test');
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://b.test')]);
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect((c.read(sessionProvider).value as SignedOut).autoLogin, isFalse);
  });

  testWidgets('desde /login, elegir en /servers otro servidor sin sesión lo lanza una vez', (tester) async {
    final b = ServerProfile.forUrl(Uri.parse('https://b.test'), name: 'B');
    final (calls, c) = await _pump(
      tester,
      login: () async => throw const LoginCancelled(),
      savedServer: true,
      twoServers: true,
    );
    await tester.pumpAndSettle();
    expect(calls, isEmpty);
    await tester.tap(find.byKey(const ValueKey('login_change_server')));
    await tester.pumpAndSettle();
    expect(c.read(routerProvider).state.uri.path, Routes.servers);
    await tester.tap(find.byKey(ValueKey('server_${b.id}')));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://b.test')]);
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
  });
}
