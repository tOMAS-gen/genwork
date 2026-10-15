import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/connect_link_listener.dart';
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

void main() {
  testWidgets('un genwork://connect agrega el servidor y sigue al login', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(Uri.parse('genwork://connect?server=https%3A%2F%2Fa.test'));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test')]);
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
  });

  testWidgets('ignora el callback de login y links ajenos', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(Uri.parse('genwork://auth?code=abc&state=xyz'));
    links.add(Uri.parse('https://otro.test/'));
    links.add(Uri.parse('genwork://connect')); // sin server
    await tester.pumpAndSettle();
    expect(calls, isEmpty);
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
  });

  testWidgets('el mismo link por link inicial y por stream se maneja una sola vez', (tester) async {
    final link = Uri.parse('genwork://connect?server=https%3A%2F%2Fa.test');
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
        initialLinkProvider.overrideWith((ref) async => link),
      ],
      child: const GenworkApp(),
    ));
    links.add(link);
    await tester.pumpAndSettle();
    expect(calls.length, 1);
  });

  testWidgets('un link inicial solo agrega el servidor', (tester) async {
    final (_, calls) = await _pump(tester, initial: Uri.parse('genwork://connect?server=https%3A%2F%2Fa.test'));
    expect(calls, [Uri.parse('https://a.test')]);
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
  });
}
