import 'dart:async';

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
import 'package:genwork_mobile/features/setup/server_setup_screen.dart';
import 'package:genwork_mobile/features/setup/servers_screen.dart';
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
  Future<void> logout(String token) async {}
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
  Map<String, StoredSession> tokens = const {},
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
      tokenStoreProvider.overrideWithValue(_Tokens()..byProfile.addAll(tokens)),
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

Future<void> _unmount(WidgetTester tester) async {
  // Desmonta el shell (que arranca timers de carga/live) antes de terminar.
  await tester.pumpWidget(const SizedBox());
  await tester.pump(const Duration(minutes: 1));
}

String _path(ProviderContainer c) => c.read(routerProvider).state.uri.path;

void main() {
  testWidgets('vincular un servidor sin sesión lo guarda, abre el navegador una vez y entra', (tester) async {
    final (calls, c) = await _pump(tester, login: () async => _ok());
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls, [Uri.parse('https://a.test')]);
    expect(c.read(sessionProvider).value, isA<SignedIn>());
    expect(c.read(serverListProvider), hasLength(1));
    expect(_path(c), Routes.myDay);
    await _unmount(tester);
  });

  testWidgets('mientras se abre el navegador sigue en el escáner mostrando el estado', (tester) async {
    final gate = Completer<StoredSession>();
    final (calls, c) = await _pump(tester, login: () => gate.future);
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls, hasLength(1));
    expect(_path(c), Routes.setup);
    expect(find.byType(ServerSetupScreen), findsOneWidget);
    expect(find.text('Abriendo el navegador…'), findsOneWidget);
    gate.completeError(const LoginCancelled());
    await tester.pumpAndSettle();
    expect(find.byType(ServersScreen), findsOneWidget);
  });

  testWidgets('arranque con servidor guardado sin token abre el navegador una sola vez y entra', (tester) async {
    final (calls, c) = await _pump(tester, login: () async => _ok(), savedServer: true);
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls, [Uri.parse('https://a.test')]);
    expect(c.read(sessionProvider).value, isA<SignedIn>());
    expect(_path(c), Routes.myDay);
    await _unmount(tester);
  });

  testWidgets('arranque con login cancelado deja la lista de servidores y no reintenta', (tester) async {
    final (calls, c) = await _pump(
      tester,
      login: () async => throw const LoginCancelled(),
      savedServer: true,
    );
    await tester.pumpAndSettle();
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(_path(c), Routes.servers);
    await tester.pump(const Duration(seconds: 1));
    expect(calls, hasLength(1));
  });

  testWidgets('cerrar sesión a mano cae en la lista sin abrir el navegador', (tester) async {
    final a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'A');
    final (calls, c) = await _pump(
      tester,
      login: () async => throw const LoginCancelled(),
      savedServer: true,
      tokens: {a.id: _ok()},
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(c.read(sessionProvider).value, isA<SignedIn>());
    // Fuera del shell (que necesita datos reales) para aislar el cierre de sesión.
    c.read(routerProvider).go(Routes.servers);
    await tester.pumpAndSettle();
    await c.read(sessionProvider.notifier).logout();
    await tester.pumpAndSettle();
    expect((c.read(sessionProvider).value as SignedOut).autoLogin, isFalse);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(calls, isEmpty);
    await _unmount(tester);
  });

  testWidgets('401 con la sesión vencida cae en la lista y abre el navegador una vez', (tester) async {
    final a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'A');
    final (calls, c) = await _pump(
      tester,
      login: () async => throw const LoginCancelled(),
      savedServer: true,
      tokens: {a.id: _ok()},
    );
    await tester.pump(const Duration(milliseconds: 100));
    c.read(routerProvider).go(Routes.servers);
    await tester.pumpAndSettle();
    await c.read(sessionProvider.notifier).handleUnauthorized('t');
    await tester.pumpAndSettle();
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(calls, [Uri.parse('https://a.test')]);
    await tester.pump(const Duration(seconds: 1));
    expect(calls, hasLength(1));
    await _unmount(tester);
  });

  testWidgets('401 recién ingresado (ventana anti-bucle) no abre el navegador', (tester) async {
    final (calls, c) = await _pump(tester, login: () async => _ok());
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(c.read(sessionProvider).value, isA<SignedIn>());
    c.read(routerProvider).go(Routes.servers);
    await tester.pumpAndSettle();
    await c.read(sessionProvider.notifier).handleUnauthorized('t');
    await tester.pumpAndSettle();
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(calls, hasLength(1)); // solo el del vínculo
    await _unmount(tester);
  });

  testWidgets('vincular y cancelar deja el servidor guardado «Sin sesión» en la lista', (tester) async {
    final (calls, c) = await _pump(tester, login: () async => throw const LoginCancelled());
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pumpAndSettle();
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(find.text('Sin sesión'), findsOneWidget);
    expect(c.read(serverListProvider), hasLength(1));
    expect(calls, hasLength(1));
    await tester.pump(const Duration(seconds: 1));
    expect(calls, hasLength(1));
  });

  testWidgets('un login fallido al vincular muestra el error en un aviso y queda en la lista', (tester) async {
    final (calls, c) = await _pump(
      tester,
      login: () async => throw const ApiException(code: 'FORBIDDEN', message: 'Sin acceso'),
    );
    await tester.tap(find.byKey(const ValueKey('scan')));
    await tester.pumpAndSettle();
    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text('Sin acceso'), findsOneWidget);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(c.read(serverListProvider), hasLength(1));
    expect(calls, hasLength(1));
  });

  testWidgets('desde la lista tras cancelar el arranque, tocar otro servidor abre su navegador una vez', (tester) async {
    final b = ServerProfile.forUrl(Uri.parse('https://b.test'), name: 'B');
    final (calls, c) = await _pump(
      tester,
      login: () async => throw const LoginCancelled(),
      savedServer: true,
      twoServers: true,
    );
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test')]); // arranque
    expect(_path(c), Routes.servers);
    await tester.tap(find.byKey(ValueKey('server_${b.id}')));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test'), Uri.parse('https://b.test')]);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect((c.read(sessionProvider).value as SignedOut).serverUrl, Uri.parse('https://b.test'));
  });
}
