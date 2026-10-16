import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/app_router.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/account/logout_tile.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
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
  _FakeAuth(Uri url, this.loginCalls) : super(serverUrl: url);
  final List<Uri> loginCalls;
  @override
  Future<void> logout(String token) async {}
  @override
  Future<StoredSession> login() async {
    loginCalls.add(serverUrl);
    throw const LoginCancelled();
  }
}

final _a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'Taller A');
final _session = StoredSession(
  token: 't',
  user: AppUser.fromJson({'id': 'u', 'email': 'u@test', 'name': 'u', 'globalRole': 'MEMBER'}),
);

Future<({List<Uri> calls, _Tokens tokens, SharedPreferences prefs})> _setup(
  WidgetTester tester, {
  required bool signedIn,
}) async {
  tester.view.physicalSize = const Size(400, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues({
    'server_profiles': '[{"id":"${_a.id}","url":"${_a.url}","name":"${_a.name}"}]',
    'active_server_id': _a.id,
  });
  final tokens = _Tokens();
  if (signedIn) tokens.byProfile[_a.id] = _session;
  return (calls: <Uri>[], tokens: tokens, prefs: await SharedPreferences.getInstance());
}

List<Override> _overrides(SharedPreferences prefs, _Tokens tokens, List<Uri> calls) => [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(tokens),
      qrScannerBuilderProvider.overrideWithValue((c, onCode) => const SizedBox()),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url, calls)),
    ];

/// Router mínimo (sin shell): inicio con el tile + la pantalla real de servidores.
Future<ProviderContainer> _pumpMini(
  WidgetTester tester,
  ({List<Uri> calls, _Tokens tokens, SharedPreferences prefs}) s, {
  String initial = '/',
}) async {
  final router = GoRouter(initialLocation: initial, routes: [
    GoRoute(
      path: '/',
      builder: (_, _) => const Scaffold(body: LogoutTile(actionKey: 'account_logout')),
    ),
    GoRoute(path: Routes.servers, builder: (_, _) => const ServersScreen()),
    GoRoute(path: Routes.myDay, builder: (_, _) => const Scaffold(body: Text('mi_dia'))),
  ]);
  addTearDown(router.dispose);
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: _overrides(s.prefs, s.tokens, s.calls),
    child: MaterialApp.router(theme: AppTheme.light(), routerConfig: router),
  ));
  final c = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
  await c.read(sessionProvider.future);
  await tester.pumpAndSettle();
  return c;
}

void main() {
  testWidgets('cerrar sesión lleva a la lista de servidores sin abrir el navegador', (tester) async {
    final s = await _setup(tester, signedIn: true);
    final c = await _pumpMini(tester, s);
    expect(c.read(sessionProvider).value, isA<SignedIn>());
    await tester.tap(find.byKey(const ValueKey('account_logout')));
    await tester.pumpAndSettle();
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(find.text('Sin sesión'), findsOneWidget);
    expect(s.calls, isEmpty);
    final state = c.read(sessionProvider).value as SignedOut;
    expect(state.autoLogin, isFalse);
    expect(s.tokens.byProfile, isEmpty);
  });

  testWidgets('servidor activo con sesión: muestra la sesión y tocarlo no abre el navegador', (tester) async {
    final s = await _setup(tester, signedIn: true);
    await _pumpMini(tester, s, initial: Routes.servers);
    expect(find.text('Sesión iniciada · u@test'), findsOneWidget);
    expect(find.text('Sin sesión'), findsNothing);
    await tester.tap(find.byKey(ValueKey('server_${_a.id}')));
    await tester.pumpAndSettle();
    expect(s.calls, isEmpty);
  });

  testWidgets('arranque sin sesión: cae en la lista, abre el navegador una vez y cancelar no reintenta', (tester) async {
    final s = await _setup(tester, signedIn: false);
    await tester.pumpWidget(ProviderScope(
      retry: (_, _) => null,
      overrides: _overrides(s.prefs, s.tokens, s.calls),
      child: const GenworkApp(),
    ));
    await tester.pumpAndSettle();
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(s.calls, hasLength(1)); // arranque: login automático cancelado
    await tester.pump(const Duration(seconds: 1));
    expect(s.calls, hasLength(1));
    final c = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
    expect(c.read(routerProvider).state.uri.path, Routes.servers);
    expect(find.text('Sin sesión'), findsOneWidget);
    // Tocar el servidor activo sin sesión vuelve a abrir el navegador, una vez.
    await tester.tap(find.byKey(ValueKey('server_${_a.id}')));
    await tester.pumpAndSettle();
    expect(s.calls, hasLength(2));
    expect(find.byType(ServersScreen), findsOneWidget);
  });
}
