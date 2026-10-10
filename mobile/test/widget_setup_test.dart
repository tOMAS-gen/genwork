import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _MemoryTokenStore implements TokenStore {
  StoredSession? session;

  @override
  Future<void> clear() async => session = null;

  @override
  Future<StoredSession?> read() async => session;

  @override
  Future<void> write(StoredSession s) async => session = s;
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
      ],
      child: const GenworkApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('primer inicio pide la URL del sistema', (tester) async {
    await _pump(tester, {});
    expect(find.byKey(const ValueKey('setup_url_field')), findsOneWidget);
    expect(find.text('Continuar'), findsOneWidget);
  });

  testWidgets('con URL guardada y sin sesión muestra el login', (tester) async {
    await _pump(tester, {'server_url': 'https://work.test'});
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(find.text('work.test'), findsOneWidget);
  });
}
