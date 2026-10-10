import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/app_icons.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/gen_skeleton.dart';
import 'package:genwork_mobile/shared/widgets/state_views.dart';

Future<void> _mount(
  WidgetTester t,
  Widget body, {
  bool dark = false,
  bool noAnim = false,
  double scale = 1,
}) => t.pumpWidget(
  MaterialApp(
    theme: dark ? AppTheme.dark() : AppTheme.light(),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context).copyWith(
        disableAnimations: noAnim,
        textScaler: TextScaler.linear(scale),
      ),
      child: child!,
    ),
    home: Scaffold(body: body),
  ),
);

Color _fill(WidgetTester t, Finder f) =>
    ((t.widget<Container>(f).decoration) as BoxDecoration).color!;

void main() {
  testWidgets('GenSkeleton anima entre hover y border', (t) async {
    await _mount(t, const GenSkeleton.text(width: 100));
    final box = find.descendant(
      of: find.byType(GenSkeleton),
      matching: find.byType(Container),
    );
    expect(_fill(t, box), GenColors.light.hover);
    await t.pump(GenSkeleton.period * .5);
    expect(_fill(t, box), GenColors.light.border);
    await t.pump(GenSkeleton.period * .5);
    expect(_fill(t, box), GenColors.light.hover);
  });

  testWidgets('GenSkeleton queda estático con disableAnimations', (t) async {
    await _mount(t, const GenSkeleton.card(), noAnim: true);
    await t.pumpAndSettle(); // no se cuelga: no hay ticker
    final box = find.descendant(
      of: find.byType(GenSkeleton),
      matching: find.byType(Container),
    );
    expect(_fill(t, box), GenColors.light.hover);
  });

  testWidgets('GenSkeleton.circle es un círculo', (t) async {
    await _mount(t, const GenSkeleton.circle(size: 40), noAnim: true);
    expect(t.getSize(find.byType(GenSkeleton)), const Size.square(40));
  });

  for (final dark in [false, true]) {
    testWidgets('LoadingView sin overflow a 360 dp y 1.5× (dark=$dark)', (
      t,
    ) async {
      t.view.physicalSize = const Size(360, 640);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await _mount(t, const LoadingView(), dark: dark, scale: 1.5);
      await t.pump(const Duration(milliseconds: 700));
      expect(t.takeException(), isNull);
      expect(find.byType(GenSkeleton), findsNWidgets(6));
      expect(
        t.getSemantics(find.byType(LoadingView)),
        matchesSemantics(label: 'Cargando contenido', isLiveRegion: true),
      );
    });
  }

  testWidgets('ErrorView: mensaje, key error_retry y reintento', (t) async {
    var retried = 0;
    await _mount(t, ErrorView(error: Exception('x'), onRetry: () => retried++));
    expect(find.text(errorMessage(Exception('x'))), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('error_retry')));
    expect(retried, 1);
    expect(
      t.getSize(find.byType(ErrorView)).height,
      greaterThanOrEqualTo(AppBlockHeights.errorState),
    );
  });

  testWidgets('ErrorView sin onRetry no muestra botón', (t) async {
    await _mount(t, ErrorView(error: Exception('x')));
    expect(find.byKey(const ValueKey('error_retry')), findsNothing);
  });

  testWidgets('EmptyView: ícono 48 muted, texto acotado a 360', (t) async {
    t.view.physicalSize = const Size(800, 1200);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await _mount(t, EmptyView(message: 'Nada por acá. ' * 30));
    final icon = t.widget<Icon>(find.byType(Icon));
    expect(icon.icon, AppIcons.inbox);
    expect(icon.size, 48);
    expect(icon.color, GenColors.light.muted);
    final text = find.textContaining('Nada por acá.');
    expect(t.getSize(text).width, lessThanOrEqualTo(360));
    expect(
      t.getSize(find.byType(EmptyView)).height,
      greaterThanOrEqualTo(AppBlockHeights.state),
    );
  });

  testWidgets('showErrorSnack muestra ícono y mensaje', (t) async {
    await _mount(
      t,
      Builder(
        builder: (context) => TextButton(
          onPressed: () => showErrorSnack(context, Exception('x')),
          child: const Text('go'),
        ),
      ),
    );
    await t.tap(find.text('go'));
    await t.pump();
    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text(errorMessage(Exception('x'))), findsOneWidget);
    expect(find.byIcon(AppIcons.error), findsOneWidget);
  });
}
