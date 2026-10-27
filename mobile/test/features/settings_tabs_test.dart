// Barra de configuración como `SettingsNav` de la web (P23–P32).
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/repositories/catalogs_repository.dart';
import 'package:genwork_mobile/data/repositories/settings_repository.dart';
import 'package:genwork_mobile/features/settings/mobile_app_screen.dart';
import 'package:genwork_mobile/features/settings/settings_tabs.dart';
import 'package:go_router/go_router.dart';

import 'resource_operations_test.dart' show user;

Future<GoRouter> _mount(
  WidgetTester t,
  String role, {
  String initial = Routes.account,
}) async {
  t.view.physicalSize = const Size(390, 844);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  Widget page(String current) => Scaffold(body: SettingsTabs(current: current));
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      GoRoute(path: Routes.account, builder: (_, _) => page('account')),
      GoRoute(path: Routes.setting('mcp'), builder: (_, _) => page('mcp')),
      GoRoute(path: Routes.settings, builder: (_, _) => page('home')),
      GoRoute(path: Routes.mobileApp, builder: (_, _) => page('mobile')),
      GoRoute(
        path: Routes.setting('errors'),
        builder: (_, _) => page('errors'),
      ),
      GoRoute(
        path: Routes.catalog('stages'),
        builder: (_, _) => page('stages'),
      ),
    ],
  );
  addTearDown(router.dispose);
  await t.pumpWidget(
    ProviderScope(
      overrides: [currentUserProvider.overrideWithValue(user(role))],
      child: MaterialApp.router(theme: AppTheme.light(), routerConfig: router),
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
    expect(find.text('Configuración'), findsNothing);
    expect(find.text('Errores'), findsNothing);
  });

  testWidgets('el admin ve también las del sistema y cambia de sección', (
    t,
  ) async {
    final router = await _mount(t, 'SUPERADMIN');
    expect(find.text('Configuración'), findsOneWidget);
    await t.ensureVisible(find.text('Vincular con Claude'));
    await t.pumpAndSettle();
    await t.tap(find.text('Vincular con Claude'));
    await t.pumpAndSettle();
    expect(
      router.routeInformationProvider.value.uri.path,
      Routes.setting('mcp'),
    );
  });

  testWidgets('P24b App móvil: dirección, aviso de dirección local y pasos', (
    t,
  ) async {
    expect(MobileAppScreen.isLocal(Uri.parse('http://localhost:3010')), isTrue);
    expect(
      MobileAppScreen.isLocal(Uri.parse('https://work.empresa.com')),
      isFalse,
    );
    final router = await _mount(t, 'MEMBER');
    expect(find.text('App móvil'), findsOneWidget);
    await t.ensureVisible(find.text('App móvil'));
    await t.pumpAndSettle();
    await t.tap(find.text('App móvil'));
    await t.pumpAndSettle();
    expect(router.routeInformationProvider.value.uri.path, Routes.mobileApp);
  });

  // P25-M4 y P28: la pestaña y el título de la pantalla dicen lo mismo.
  testWidgets('cada pestaña se llama como el título de su pantalla', (t) async {
    await _mount(t, 'SUPERADMIN');
    for (final title in [
      'Mi cuenta',
      SettingsSection.mcp.title,
      'App móvil',
      'Configuración',
      SettingsSection.access.title,
      SettingsSection.users.title,
      SettingsSection.clients.title,
      CatalogKind.labels.title,
      CatalogKind.stages.title,
      CatalogKind.statuses.title,
      SettingsSection.storage.title,
      'Integración con Genstock',
      SettingsSection.reminders.title,
      SettingsSection.errors.title,
    ]) {
      expect(find.text(title), findsOneWidget, reason: title);
    }
  });

  // P28L-M1: ninguna pestaña abre cortada; la activa queda centrada.
  testWidgets('la primera pestaña abre completa con 16 dp de margen', (
    t,
  ) async {
    await _mount(t, 'SUPERADMIN');
    expect(t.getTopLeft(find.text('Mi cuenta')).dx, greaterThanOrEqualTo(16));
  });

  for (final (initial, label) in [
    (Routes.setting('errors'), 'Errores'),
    (Routes.catalog('stages'), 'Estados de producción'),
  ]) {
    testWidgets('la pestaña activa ($label) abre entera y centrada', (t) async {
      await _mount(t, 'SUPERADMIN', initial: initial);
      final r = t.getRect(find.text(label));
      expect(r.left, greaterThanOrEqualTo(16));
      expect(r.right, lessThanOrEqualTo(390 - 16));
      if (label != 'Errores') {
        // Hay pestañas a los dos lados: queda en el centro.
        expect((r.center.dx - 195).abs(), lessThan(24));
      }
      // Degradado del lado con más contenido.
      expect(find.byKey(const ValueKey('tabs_fade_start')), findsOneWidget);
    });
  }
}
