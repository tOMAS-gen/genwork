import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/session_controller.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/features/auth/login_screen.dart';
import 'package:genwork_mobile/features/setup/server_setup_screen.dart';
import 'package:genwork_mobile/shared/widgets/app_inline_notice.dart';
import 'package:genwork_mobile/shared/widgets/brand_name.dart';
import 'package:genwork_mobile/shared/widgets/workspace_panel.dart';

class _SignedOutSession extends SessionController {
  _SignedOutSession({this.failLogin = false, this.failSetServer = false});
  final bool failLogin, failSetServer;
  @override
  Future<SessionState> build() async =>
      SignedOut(Uri.parse('https://work.empresa.com'));
  @override
  Future<void> login() async {
    if (failLogin) throw StateError('x');
  }

  @override
  Future<void> setServer(String input) async {
    if (failSetServer) throw StateError('x');
  }
}

Future<void> _mount(
  WidgetTester t,
  Widget screen, {
  bool dark = false,
  double scale = 1,
  double width = 390,
  SessionController Function()? session,
}) async {
  t.view.physicalSize = Size(width, 844);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    ProviderScope(
      overrides: [
        sessionProvider.overrideWith(session ?? _SignedOutSession.new),
      ],
      child: MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        builder: (context, child) => RepaintBoundary(
          key: const ValueKey('preview'),
          child: MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
        ),
        home: screen,
      ),
    ),
  );
  await t.pumpAndSettle();
}

Future<void> _capture(WidgetTester t, String name) async {
  await t.runAsync(() async {
    final boundary = t.renderObject<RenderRepaintBoundary>(
      find.byKey(const ValueKey('preview')),
    );
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final dir = Directory('../.context/ds-14')..createSync(recursive: true);
    File('${dir.path}/$name.png').writeAsBytesSync(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  setUpAll(() async {
    final loader = FontLoader('Montserrat')
      ..addFont(rootBundle.load('assets/fonts/Montserrat.ttf'));
    await loader.load();
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });

  for (final dark in [false, true]) {
    final tema = dark ? 'oscuro' : 'claro';
    testWidgets('login igual a la web: card, marca 24 y bajada ($tema)', (
      t,
    ) async {
      await _mount(t, const LoginScreen(), dark: dark);
      final c = dark ? GenColors.dark : GenColors.light;
      // Card de la web: surface, borde 1, radio 8, padding 16 en página de 24.
      final panel = find.byType(WorkspacePanel);
      expect(panel, findsOneWidget);
      expect(t.getSize(panel).width, 390 - 24 * 2);
      expect(t.getTopLeft(panel).dx, 24);
      final box = t
          .widgetList<Container>(
            find.descendant(of: panel, matching: find.byType(Container)),
          )
          .first;
      expect((box.decoration! as BoxDecoration).color, c.surface);
      // Marca centrada de 24 px, y la bajada en 13 muted.
      final brand = find.byType(BrandName);
      expect(t.widget<BrandName>(brand).size, 24);
      expect(
        (t.getCenter(brand).dx - 195).abs(),
        lessThan(1),
        reason: 'marca centrada',
      );
      final tagline = t.widget<Text>(
        find.text('Gestión de proyectos por cliente y sector'),
      );
      expect(tagline.style!.fontSize, 13);
      expect(tagline.style!.color, c.muted);
      // Botón primario a todo el ancho, ≥ 47 de alto.
      final button = find.byKey(const ValueKey('login_google'));
      expect(t.getSize(button).width, 390 - 24 * 2 - 16 * 2);
      expect(t.getSize(button).height, greaterThanOrEqualTo(47));
      expect(find.text('Cambiar servidor'), findsOneWidget);
      expect(find.text('work.empresa.com'), findsOneWidget);
      await _capture(t, 'login-${dark ? 'dark' : 'light'}');
    });

    testWidgets('setup con la misma card ($tema)', (t) async {
      await _mount(t, const ServerSetupScreen(), dark: dark);
      expect(find.byType(WorkspacePanel), findsOneWidget);
      expect(find.byType(BrandName), findsOneWidget);
      expect(find.byKey(const ValueKey('setup_url_field')), findsOneWidget);
      expect(find.byKey(const ValueKey('setup_continue')), findsOneWidget);
      await _capture(t, 'setup-${dark ? 'dark' : 'light'}');
    });

    for (final scale in [1.0, 1.5]) {
      testWidgets('sin overflow a 360 dp y $scale× ($tema)', (t) async {
        for (final screen in <Widget>[
          const LoginScreen(),
          const ServerSetupScreen(),
        ]) {
          await _mount(t, screen, dark: dark, scale: scale, width: 360);
          expect(t.takeException(), isNull, reason: '${screen.runtimeType}');
        }
      });
    }
  }

  testWidgets('login: el error se muestra con AppInlineNotice.error', (
    t,
  ) async {
    await _mount(
      t,
      const LoginScreen(),
      session: () => _SignedOutSession(failLogin: true),
    );
    await t.tap(find.byKey(const ValueKey('login_google')));
    await t.pumpAndSettle();
    final notice = t.widget<AppInlineNotice>(find.byType(AppInlineNotice));
    expect(notice.tone, AppInlineNoticeTone.error);
    expect(
      find.text('Ocurrió un error inesperado. Probá de nuevo.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
  });

  testWidgets('setup: el error se muestra con AppInlineNotice.error', (
    t,
  ) async {
    await _mount(
      t,
      const ServerSetupScreen(),
      session: () => _SignedOutSession(failSetServer: true),
    );
    await t.enterText(
      find.byKey(const ValueKey('setup_url_field')),
      'mal.dominio',
    );
    await t.tap(find.byKey(const ValueKey('setup_continue')));
    await t.pumpAndSettle();
    expect(find.byType(AppInlineNotice), findsOneWidget);
  });

  testWidgets('el contenido se acota a 480 de ancho en pantallas anchas', (
    t,
  ) async {
    await _mount(t, const LoginScreen(), width: 900);
    expect(
      t.getSize(find.byType(WorkspacePanel)).width,
      lessThanOrEqualTo(480),
    );
    expect(AppSpacing.lg, 24);
  });
}
