import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Sin navegador real: el login automático se cancela.
class _NoBrowserAuth extends AuthRepository {
  _NoBrowserAuth(Uri url) : super(serverUrl: url);
  @override
  Future<StoredSession> login() async => throw const LoginCancelled();
}

class _MemoryTokenStore implements TokenStore {
  final Map<String, StoredSession> sessions = {};

  @override
  Future<void> clear(String id) async => sessions.remove(id);

  @override
  Future<StoredSession?> read(String id) async => sessions[id];

  @override
  Future<void> write(String id, StoredSession s) async => sessions[id] = s;

  @override
  Future<void> adoptLegacy(String id) async {}
  @override
  Future<void> discardLegacy() async {}
}

Future<void> _pump(WidgetTester tester, Map<String, Object> prefs) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = 1.5;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues(prefs);
  final instance = await SharedPreferences.getInstance();
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(instance),
        tokenStoreProvider.overrideWithValue(_MemoryTokenStore()),
        authRepositoryProvider.overrideWith((ref, url) => _NoBrowserAuth(url)),
        qrScannerBuilderProvider.overrideWithValue(
          (context, onCode) => const SizedBox(key: ValueKey('setup_scanner')),
        ),
      ],
      child: const GenworkApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('primer inicio ofrece escribir la URL a mano', (tester) async {
    await _pump(tester, {});
    await tester.tap(find.byKey(const ValueKey('setup_manual_toggle')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('setup_url_field')), findsOneWidget);
    expect(find.text('Continuar'), findsOneWidget);
  });

  testWidgets('con URL guardada y sin sesión muestra el login', (tester) async {
    await _pump(tester, {'server_url': 'https://work.test'});
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(find.text('work.test'), findsOneWidget);
  });
}
