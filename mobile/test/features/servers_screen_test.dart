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
import 'package:genwork_mobile/core/theme/app_icons.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
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
  _FakeAuth(Uri url, this.calls, this.behavior) : super(serverUrl: url);
  final List<Uri> calls;
  final Future<StoredSession> Function() behavior;
  @override
  Future<StoredSession> login() {
    calls.add(serverUrl);
    return behavior();
  }

  @override
  Future<void> logout(String token) async {}
}

final _a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'Taller A');
final _b = ServerProfile.forUrl(Uri.parse('https://b.test'), name: 'Taller B');

StoredSession _session(String id) => StoredSession(
      token: 't-$id',
      user: AppUser.fromJson({'id': id, 'email': '$id@test', 'name': id, 'globalRole': 'MEMBER'}),
    );

Future<StoredSession> _cancel() async => throw const LoginCancelled();

Future<({ProviderContainer c, List<Uri> calls, _Tokens tokens})> _pump(
  WidgetTester tester, {
  Map<String, StoredSession> tokens = const {},
  Future<StoredSession> Function() login = _cancel,
}) async {
  tester.view.physicalSize = const Size(400, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues({
    'server_profiles':
        '[${[_a, _b].map((p) => '{"id":"${p.id}","url":"${p.url}","name":"${p.name}"}').join(',')}]',
    'active_server_id': _a.id,
  });
  final prefs = await SharedPreferences.getInstance();
  final store = _Tokens()..byProfile.addAll(tokens);
  final calls = <Uri>[];
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(store),
      qrScannerBuilderProvider.overrideWithValue((c, onCode) => const SizedBox()),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url, calls, login)),
    ],
    child: const GenworkApp(),
  ));
  await tester.pumpAndSettle();
  final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
  container.read(routerProvider).go(Routes.servers);
  await tester.pumpAndSettle();
  return (c: container, calls: calls, tokens: store);
}

/// Desmonta el shell (timers de carga/live) antes de terminar.
Future<void> _unmount(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  await tester.pump(const Duration(minutes: 1));
}

Finder _inTile(ServerProfile p, Finder f) =>
    find.descendant(of: find.byKey(ValueKey('server_${p.id}')), matching: f);

void main() {
  testWidgets('lista los servidores, marca el activo y muestra «Sin sesión»', (tester) async {
    final s = await _pump(tester);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(find.text('Taller A'), findsOneWidget);
    expect(find.text('Taller B'), findsOneWidget);
    expect(find.text('https://a.test'), findsOneWidget);
    expect(_inTile(_a, find.byIcon(AppIcons.success)), findsOneWidget);
    expect(_inTile(_b, find.byIcon(AppIcons.success)), findsNothing);
    expect(_inTile(_a, find.text('Sin sesión')), findsOneWidget);
    expect(_inTile(_b, find.text('Sin sesión')), findsOneWidget);
    expect(find.byKey(const ValueKey('servers_add')), findsOneWidget);
    expect(s.calls, hasLength(1)); // el login automático del arranque, cancelado
  });

  testWidgets('cada servidor muestra su estado de sesión con el email', (tester) async {
    await _pump(tester, tokens: {_a.id: _session('ana'), _b.id: _session('beto')});
    expect(_inTile(_a, find.text('Sesión iniciada · ana@test')), findsOneWidget);
    expect(_inTile(_b, find.text('Sesión iniciada · beto@test')), findsOneWidget);
    expect(find.text('Sin sesión'), findsNothing);
    await _unmount(tester);
  });

  testWidgets('tocar un servidor sin sesión abre el navegador una vez; cancelar deja la lista y la otra sesión', (tester) async {
    final s = await _pump(tester, tokens: {_a.id: _session('ana')});
    final before = s.c.read(sessionProvider).value;
    expect(before, isA<SignedIn>());
    await tester.tap(find.byKey(ValueKey('server_${_b.id}')));
    await tester.pumpAndSettle();
    expect(s.calls, [_b.url]);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(identical(s.c.read(sessionProvider).value, before), isTrue);
    expect(_inTile(_b, find.text('Sin sesión')), findsOneWidget);
    await _unmount(tester);
  });

  testWidgets('tocar un servidor con sesión entra sin abrir el navegador', (tester) async {
    final s = await _pump(tester, tokens: {_a.id: _session('ana'), _b.id: _session('beto')});
    await tester.tap(find.byKey(ValueKey('server_${_b.id}')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(s.calls, isEmpty);
    final state = s.c.read(sessionProvider).value as SignedIn;
    expect(state.serverUrl, _b.url);
    expect(s.c.read(routerProvider).state.uri.path, Routes.myDay);
    await _unmount(tester);
  });

  testWidgets('mientras abre el navegador, la fila muestra el estado y no lanza dos veces', (tester) async {
    final gate = Completer<StoredSession>();
    var first = true;
    final s = await _pump(tester, login: () {
      if (first) {
        first = false;
        return _cancel(); // arranque
      }
      return gate.future;
    });
    await tester.tap(find.byKey(ValueKey('server_${_b.id}')));
    await tester.pump();
    expect(_inTile(_b, find.text('Abriendo el navegador…')), findsOneWidget);
    await tester.tap(find.byKey(ValueKey('server_${_b.id}')), warnIfMissed: false);
    await tester.tap(find.byKey(ValueKey('server_${_a.id}')), warnIfMissed: false);
    await tester.pump();
    expect(s.calls, [_a.url, _b.url]);
    gate.complete(_session('beto'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect((s.c.read(sessionProvider).value as SignedIn).serverUrl, _b.url);
    expect(s.tokens.byProfile[_b.id]!.token, 't-beto');
    expect(s.c.read(routerProvider).state.uri.path, Routes.myDay);
    await _unmount(tester);
  });

  testWidgets('un login fallido muestra el error en un aviso y queda en la lista', (tester) async {
    var first = true;
    final s = await _pump(tester, login: () async {
      if (first) {
        first = false;
        throw const LoginCancelled();
      }
      throw const ApiException(code: 'FORBIDDEN', message: 'Sin acceso');
    });
    await tester.tap(find.byKey(ValueKey('server_${_b.id}')));
    await tester.pumpAndSettle();
    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text('Sin acceso'), findsOneWidget);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(s.calls, [_a.url, _b.url]);
  });

  testWidgets('quitar pide confirmación y deja el otro servidor', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(ValueKey('server_remove_${_b.id}')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Quitar').last);
    await tester.pumpAndSettle();
    expect(find.text('Taller B'), findsNothing);
    expect(find.text('Taller A'), findsOneWidget);
  });

  testWidgets('quitar todos vuelve al primer inicio', (tester) async {
    await _pump(tester);
    for (final p in [_b, _a]) {
      await tester.tap(find.byKey(ValueKey('server_remove_${p.id}')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Quitar').last);
      await tester.pumpAndSettle();
    }
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
  });

  testWidgets('«Agregar servidor» abre el alta con escáner', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('servers_add')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
    expect(find.byKey(const ValueKey('setup_back')), findsOneWidget);
  });
}
