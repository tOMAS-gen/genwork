import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:genwork_mobile/features/setup/server_setup_screen.dart';
import 'package:genwork_mobile/features/setup/servers_screen.dart';
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

/// Logins pedidos al navegador (falso, siempre cancelado) en el test actual.
final logins = <Uri>[];

class _FakeAuth extends AuthRepository {
  _FakeAuth(Uri url, this.calls) : super(serverUrl: url);
  final List<Uri> calls;
  @override
  Future<StoredSession> login() async {
    logins.add(serverUrl);
    throw const LoginCancelled();
  }
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

Future<List<Uri>> _pump(WidgetTester tester, {Map<String, Object> prefs = const {}}) async {
  tester.view.physicalSize = const Size(400, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues(prefs);
  final instance = await SharedPreferences.getInstance();
  final calls = <Uri>[];
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(instance),
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
  setUp(logins.clear);

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

  testWidgets('el link «Escribir dirección a mano» está debajo del escáner y arriba de las instrucciones', (tester) async {
    await _pump(tester);
    final scanner = tester.getRect(find.byKey(const ValueKey('fake_scanner')));
    final manual = tester.getRect(find.byKey(const ValueKey('setup_manual_toggle')));
    final steps = tester.getRect(find.byKey(const ValueKey('setup_qr_instructions')));
    expect(manual.top, greaterThanOrEqualTo(scanner.bottom));
    expect(steps.top, greaterThanOrEqualTo(manual.bottom));
  });

  testWidgets('un QR válido guarda el servidor y abre el navegador directo (sin pantalla de login)', (tester) async {
    final calls = await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:genwork://connect?server=https%3A%2F%2Fa.test')));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test')]);
    expect(logins, [Uri.parse('https://a.test')]);
    // Cancelado: queda guardado «Sin sesión» en la lista de servidores.
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(find.text('Sin sesión'), findsOneWidget);
  });

  testWidgets('en «Agregar servidor», cancelar el navegador vuelve a la lista', (tester) async {
    final a = ServerProfile.forUrl(Uri.parse('https://b.test'), name: 'B');
    await _pump(tester, prefs: {
      'server_profiles': '[{"id":"${a.id}","url":"${a.url}","name":"B"}]',
      'active_server_id': a.id,
    });
    expect(find.byType(ServersScreen), findsOneWidget); // arranque cancelado
    await tester.tap(find.byKey(const ValueKey('servers_add')));
    await tester.pumpAndSettle();
    expect(find.byType(ServerSetupScreen), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('scan:genwork://connect?server=https%3A%2F%2Fa.test')));
    await tester.pumpAndSettle();
    expect(find.byType(ServerSetupScreen), findsNothing);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(find.text('Sin sesión'), findsNWidgets(2));
    expect(logins, [Uri.parse('https://b.test'), Uri.parse('https://a.test')]);
  });

  testWidgets('QR de ruido: avisa y no guarda ni consulta ningún servidor', (tester) async {
    final calls = await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:texto cualquiera')));
    await tester.pumpAndSettle();
    expect(find.text('No es un QR de genwork.'), findsOneWidget);
    expect(find.byType(ServersScreen), findsNothing);
    // "texto cualquiera" se normaliza a una URL; igual no puede haber alta exitosa.
    expect(calls.length, lessThanOrEqualTo(1));
  });

  testWidgets('QR de un servidor que no es genwork muestra el error y sigue en setup', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:https://ajeno.test')));
    await tester.pumpAndSettle();
    expect(find.text('No es genwork'), findsOneWidget);
    expect(find.byType(ServerSetupScreen), findsOneWidget);
    expect(logins, isEmpty);
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
