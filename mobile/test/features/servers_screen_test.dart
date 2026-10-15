import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/app_router.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Tokens implements TokenStore {
  @override
  Future<StoredSession?> read(String id) async => null;
  @override
  Future<void> write(String id, StoredSession s) async {}
  @override
  Future<void> clear(String id) async {}
  @override
  Future<void> adoptLegacy(String id) async {}
  @override
  Future<void> discardLegacy() async {}
}

class _FakeAuth extends AuthRepository {
  _FakeAuth(Uri url) : super(serverUrl: url);
  @override
  Future<StoredSession> login() async => throw const LoginCancelled();
  @override
  Future<void> logout(String token) async {}
}

final _a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'Taller A');
final _b = ServerProfile.forUrl(Uri.parse('https://b.test'), name: 'Taller B');

Future<ProviderContainer> _pump(WidgetTester tester) async {
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
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(_Tokens()),
      qrScannerBuilderProvider.overrideWithValue((c, onCode) => const SizedBox()),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url)),
    ],
    child: const GenworkApp(),
  ));
  await tester.pumpAndSettle();
  final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
  container.read(routerProvider).go(Routes.servers);
  await tester.pumpAndSettle();
  return container;
}

void main() {
  testWidgets('lista los servidores y marca el activo', (tester) async {
    await _pump(tester);
    expect(find.text('Taller A'), findsOneWidget);
    expect(find.text('Taller B'), findsOneWidget);
    expect(find.text('https://a.test'), findsOneWidget);
    expect(find.byKey(const ValueKey('servers_add')), findsOneWidget);
  });

  testWidgets('tocar otro servidor lo activa (sin token → login de ese servidor)', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(ValueKey('server_${_b.id}')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(find.text('b.test'), findsOneWidget);
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
