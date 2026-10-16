import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/connect_link_listener.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
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
    if (serverUrl.host == 'ajeno.test') {
      throw const ApiException(code: 'NOT_GENWORK', message: 'No es genwork');
    }
    return ServerInfo(name: 'Sistema ${serverUrl.host}');
  }
}

Future<(StreamController<Uri>, List<Uri>)> _pump(WidgetTester tester, {Uri? initial}) async {
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final links = StreamController<Uri>();
  addTearDown(links.close);
  final calls = <Uri>[];
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(_Tokens()),
      qrScannerBuilderProvider.overrideWithValue((c, onCode) => const SizedBox()),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url, calls)),
      incomingLinksProvider.overrideWithValue(links.stream),
      initialLinkProvider.overrideWith((ref) async => initial),
    ],
    child: const GenworkApp(),
  ));
  await tester.pumpAndSettle();
  return (links, calls);
}

final _link = Uri.parse('genwork://connect?server=https%3A%2F%2Fa.test');
const _dialogTitle = 'Vincular servidor';
const _confirm = ValueKey('action_confirm');
const _cancel = ValueKey('action_cancel');

int _savedServers(WidgetTester tester) =>
    ProviderScope.containerOf(tester.element(find.byType(GenworkApp)))
        .read(serverListProvider)
        .length;

void main() {
  setUp(logins.clear);

  testWidgets('un genwork://connect pide confirmar mostrando el host; al confirmar guarda y abre el navegador', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(_link);
    await tester.pumpAndSettle();
    expect(find.text(_dialogTitle), findsOneWidget);
    expect(find.textContaining('«a.test»'), findsOneWidget);
    expect(calls, isEmpty); // nada antes de confirmar
    await tester.tap(find.byKey(_confirm));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test')]);
    expect(logins, [Uri.parse('https://a.test')]);
    // Navegador cancelado: el servidor queda guardado y se ve la lista.
    expect(_savedServers(tester), 1);
    expect(find.byType(ServersScreen), findsOneWidget);
    expect(find.text('Sin sesión'), findsOneWidget);
  });

  testWidgets('si el servidor del link no es genwork, avisa con un mensaje y no guarda nada', (tester) async {
    final (links, _) = await _pump(tester);
    links.add(Uri.parse('genwork://connect?server=https%3A%2F%2Fajeno.test'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(_confirm));
    await tester.pumpAndSettle();
    expect(find.text(_dialogTitle), findsNothing);
    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text('No es genwork'), findsOneWidget);
    expect(_savedServers(tester), 0);
    expect(logins, isEmpty);
  });

  testWidgets('reenviar el mismo link tras un servidor que falla vuelve a preguntar', (tester) async {
    final (links, calls) = await _pump(tester);
    final foreign = Uri.parse('genwork://connect?server=https%3A%2F%2Fajeno.test');
    links.add(foreign);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(_confirm));
    await tester.pumpAndSettle();
    expect(find.text('No es genwork'), findsOneWidget);
    links.add(foreign); // dentro de la ventana de 5 s
    await tester.pumpAndSettle();
    expect(find.text(_dialogTitle), findsOneWidget);
    await tester.tap(find.byKey(_confirm));
    await tester.pumpAndSettle();
    expect(calls, hasLength(2));
  });

  testWidgets('cancelar no consulta ni guarda ni activa nada', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(_link);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(_cancel));
    await tester.pumpAndSettle();
    expect(calls, isEmpty);
    expect(_savedServers(tester), 0);
    expect(find.text(_dialogTitle), findsNothing);
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
  });

  testWidgets('reenviar el link tras cancelar vuelve a preguntar', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(_link);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(_cancel));
    await tester.pumpAndSettle();
    links.add(_link);
    await tester.pumpAndSettle();
    expect(find.text(_dialogTitle), findsOneWidget);
    await tester.tap(find.byKey(_confirm));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test')]);
  });

  testWidgets('ignora el callback de login y links ajenos (sin diálogo)', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(Uri.parse('genwork://auth?code=abc&state=xyz'));
    links.add(Uri.parse('https://otro.test/'));
    links.add(Uri.parse('genwork://connect')); // sin server
    await tester.pumpAndSettle();
    expect(calls, isEmpty);
    expect(find.text(_dialogTitle), findsNothing);
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
  });

  testWidgets('el mismo link por link inicial y por stream pregunta y agrega una sola vez', (tester) async {
    final (links, calls) = await _pump(tester, initial: _link);
    links.add(_link);
    await tester.pumpAndSettle();
    expect(find.text(_dialogTitle), findsOneWidget);
    await tester.tap(find.byKey(_confirm));
    await tester.pumpAndSettle();
    expect(calls.length, 1);
    expect(find.text(_dialogTitle), findsNothing);
  });

  testWidgets('un link inicial solo pregunta y, al confirmar, agrega el servidor', (tester) async {
    final (_, calls) = await _pump(tester, initial: _link);
    await tester.pumpAndSettle();
    expect(find.text(_dialogTitle), findsOneWidget);
    await tester.tap(find.byKey(_confirm));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test')]);
    expect(logins, [Uri.parse('https://a.test')]);
    expect(find.byType(ServersScreen), findsOneWidget);
  });
}
