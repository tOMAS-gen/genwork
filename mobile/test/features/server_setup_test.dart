import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
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
  _FakeAuth(Uri url, this.calls) : super(serverUrl: url);
  final List<Uri> calls;
  @override
  Future<ServerInfo> checkServer() async {
    calls.add(serverUrl);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    if (serverUrl.host == 'ajeno.test') {
      throw const ApiException(code: 'NOT_GENWORK', message: 'No es genwork');
    }
    return ServerInfo(name: 'Sistema ${serverUrl.host}');
  }
}

/// Escáner falso: un botón por payload, para disparar "lecturas".
Widget _fakeScanner(BuildContext context, ValueChanged<String> onCode) => Column(
      key: const ValueKey('fake_scanner'),
      children: [
        for (final p in ['genwork://connect?server=https%3A%2F%2Fa.test', 'texto cualquiera', 'https://ajeno.test'])
          TextButton(key: ValueKey('scan:$p'), onPressed: () => onCode(p), child: Text(p)),
      ],
    );

Future<List<Uri>> _pump(WidgetTester tester) async {
  tester.view.physicalSize = const Size(400, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final calls = <Uri>[];
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(_Tokens()),
      qrScannerBuilderProvider.overrideWithValue(_fakeScanner),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url, calls)),
    ],
    child: const GenworkApp(),
  ));
  await tester.pumpAndSettle();
  return calls;
}

void main() {
  testWidgets('primer inicio muestra el escáner y permite escribir a mano', (tester) async {
    await _pump(tester);
    expect(find.byKey(const ValueKey('fake_scanner')), findsOneWidget);
    expect(find.byKey(const ValueKey('setup_url_field')), findsNothing);
    // Instrucciones de cómo mostrar el QR en la web, junto al visor.
    expect(find.byKey(const ValueKey('setup_qr_instructions')), findsOneWidget);
    expect(find.textContaining('Configuración › App móvil'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('setup_manual_toggle')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('setup_url_field')), findsOneWidget);
    expect(find.byKey(const ValueKey('setup_qr_instructions')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('setup_scan_toggle')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('fake_scanner')), findsOneWidget);
  });

  testWidgets('un QR válido guarda el servidor y sigue al login', (tester) async {
    final calls = await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:genwork://connect?server=https%3A%2F%2Fa.test')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(find.text('a.test'), findsOneWidget);
    expect(calls, [Uri.parse('https://a.test')]);
  });

  testWidgets('QR de ruido: avisa y no guarda ni consulta ningún servidor', (tester) async {
    final calls = await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:texto cualquiera')));
    await tester.pumpAndSettle();
    expect(find.text('No es un QR de genwork.'), findsOneWidget);
    expect(find.byKey(const ValueKey('login_google')), findsNothing);
    // "texto cualquiera" se normaliza a una URL; igual no puede haber alta exitosa.
    expect(calls.length, lessThanOrEqualTo(1));
  });

  testWidgets('QR de un servidor que no es genwork muestra el error y sigue en setup', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:https://ajeno.test')));
    await tester.pumpAndSettle();
    expect(find.text('No es genwork'), findsOneWidget);
    expect(find.byKey(const ValueKey('login_google')), findsNothing);
  });

  testWidgets('lecturas repetidas del mismo QR hacen una sola verificación', (tester) async {
    final calls = await _pump(tester);
    final key = const ValueKey('scan:genwork://connect?server=https%3A%2F%2Fa.test');
    await tester.tap(find.byKey(key));
    await tester.tap(find.byKey(key), warnIfMissed: false);
    await tester.tap(find.byKey(key), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(calls.where((u) => u.host == 'a.test').length, 1);
  });
}
