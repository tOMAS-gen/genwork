// Barra de configuración como `SettingsNav` de la web (P23–P32).
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/features/settings/settings_tabs.dart';
import 'package:go_router/go_router.dart';

import 'resource_operations_test.dart' show user;

Future<GoRouter> _mount(WidgetTester t, String role) async {
  Widget page(String current) =>
      Scaffold(body: SettingsTabs(current: current));
  final router = GoRouter(
    initialLocation: Routes.account,
    routes: [
      GoRoute(path: Routes.account, builder: (_, _) => page('account')),
      GoRoute(
        path: Routes.setting('mcp'),
        builder: (_, _) => page('mcp'),
      ),
      GoRoute(path: Routes.settings, builder: (_, _) => page('home')),
    ],
  );
  addTearDown(router.dispose);
  await t.pumpWidget(
    ProviderScope(
      overrides: [currentUserProvider.overrideWithValue(user(role))],
      child: MaterialApp.router(
        theme: AppTheme.light(),
        routerConfig: router,
      ),
    ),
  );
  await t.pumpAndSettle();
  return router;
}

void main() {
  testWidgets('quien no administra ve solo las secciones de su cuenta', (
    t,
  ) async {
    await _mount(t, 'MEMBER');
    expect(find.text('Mi cuenta'), findsOneWidget);
    expect(find.text('Vincular con Claude'), findsOneWidget);
    expect(find.text('Resumen'), findsNothing);
    expect(find.text('Errores'), findsNothing);
  });

  testWidgets('el admin ve también las del sistema y cambia de sección', (
    t,
  ) async {
    final router = await _mount(t, 'SUPERADMIN');
    expect(find.text('Resumen'), findsOneWidget);
    await t.tap(find.text('Vincular con Claude'));
    await t.pumpAndSettle();
    expect(
      router.routeInformationProvider.value.uri.path,
      Routes.setting('mcp'),
    );
  });
}
