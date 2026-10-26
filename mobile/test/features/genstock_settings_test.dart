// Integración con GenStock (P31b), como /admin/genstock de la web.
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/repositories/settings_repository.dart';
import 'package:genwork_mobile/features/settings/genstock_settings_screen.dart';
import 'package:genwork_mobile/features/settings/settings_providers.dart';

import 'resource_operations_test.dart' show user;

({SettingsRepository repo, List<RequestOptions> requests}) _repo() {
  final requests = <RequestOptions>[];
  final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (r, h) {
        requests.add(r);
        final data = r.path.endsWith('/test')
            ? {'ok': true, 'detail': 'Conectado a Genstock'}
            : {
                'baseUrl': r.method == 'PUT'
                    ? (r.data as Map)['baseUrl']
                    : 'http://127.0.0.1:8110',
                'source': 'database',
                'configured': true,
              };
        h.resolve(Response(requestOptions: r, statusCode: 200, data: data));
      },
    ),
  );
  return (
    repo: SettingsRepository(
      ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio),
    ),
    requests: requests,
  );
}

Future<List<RequestOptions>> _mount(WidgetTester t, String role) async {
  final f = _repo();
  await t.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        settingsRepositoryProvider.overrideWithValue(f.repo),
        currentUserProvider.overrideWithValue(user(role)),
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: const GenstockSettingsScreen(),
      ),
    ),
  );
  await t.pumpAndSettle();
  return f.requests;
}

void main() {
  testWidgets('el admin ve la URL, guarda y prueba la conexión', (t) async {
    final requests = await _mount(t, 'SUPERADMIN');
    expect(find.text('Integración con Genstock'), findsOneWidget);
    expect(find.text('URL del server Genstock'), findsOneWidget);
    expect(find.text('Usando configuración guardada'), findsOneWidget);
    await t.enterText(
      find.byKey(const ValueKey('genstock_url')),
      'https://stock.empresa.com',
    );
    await t.tap(find.byKey(const ValueKey('genstock_save')));
    await t.pumpAndSettle();
    expect(requests.last.method, 'PUT');
    expect(requests.last.data, {'baseUrl': 'https://stock.empresa.com'});
    expect(find.text('Configuración guardada'), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('genstock_test')));
    await t.pumpAndSettle();
    expect(requests.last.path, '/api/admin/genstock/test');
    expect(find.text('✓ Conectado a Genstock'), findsOneWidget);
  });

  testWidgets('quien no administra no ve ni pide la configuración', (t) async {
    final requests = await _mount(t, 'MEMBER');
    expect(find.byKey(const ValueKey('genstock_url')), findsNothing);
    expect(requests, isEmpty);
  });
}
