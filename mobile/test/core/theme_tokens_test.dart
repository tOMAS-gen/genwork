import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/app_icons.dart';
import 'package:genwork_mobile/core/theme/app_text_styles.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';

void main() {
  test('AppSpacing usa la misma escala que AppSpace', () {
    expect(AppSpacing.xxs, AppSpace.xs);
    expect(AppSpacing.xs, AppSpace.sm);
    expect(AppSpacing.sm, AppSpace.md);
    expect(AppSpacing.md, AppSpace.lg);
    expect(AppSpacing.lg, AppSpace.xl);
    expect(AppSpacing.xl, AppSpace.xxl);
  });

  test('radios de la tabla 2.2', () {
    expect(AppGeometry.checkbox.topLeft.x, 2);
    expect(AppGeometry.chip.topLeft.x, 4);
    expect(AppGeometry.control.topLeft.x, 6);
    expect(AppGeometry.card.topLeft.x, 8);
    expect(AppGeometry.menu.topLeft.x, 10);
    expect(AppGeometry.menuItem.topLeft.x, 7);
    expect(AppGeometry.overlay.topLeft.x, 12);
    expect(kActiveTickWidth, 3);
  });

  test('tipografía de la tabla 2.3', () {
    expect(AppTextStyles.screenTitle.fontSize, 24);
    expect(AppTextStyles.body.fontSize, 13);
    expect(AppTextStyles.body.height, 1.6);
    expect(AppTextStyles.sectionLabel.letterSpacing, 1.2);
    expect(AppTextStyles.technical.fontFamily, 'RobotoMono');
    expect(AppTextStyles.action.fontFamily, 'Montserrat');
  });

  test('íconos y tamaños', () {
    expect(AppIcons.myDay, Icons.wb_sunny_outlined);
    expect(AppIconSizes.drawer, 16);
    expect(AppIconSizes.state, 48);
  });

  testWidgets('sombra flotante según brillo y alto de control con textScaler', (
    tester,
  ) async {
    late List<BoxShadow> light, dark;
    late double h1, h2;
    Widget app(Brightness b, double scale, void Function(BuildContext) f) =>
        MaterialApp(
          theme: ThemeData(brightness: b),
          home: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scale)),
            child: Builder(
              builder: (c) {
                f(c);
                return const SizedBox();
              },
            ),
          ),
        );
    await tester.pumpWidget(
      app(Brightness.light, 1, (c) {
        light = AppShadows.floatingOf(c);
        h1 = WorkspaceMetrics.controlHeight(c);
      }),
    );
    await tester.pumpWidget(
      app(Brightness.dark, 1.5, (c) {
        dark = AppShadows.floatingOf(c);
        h2 = WorkspaceMetrics.controlHeight(c);
      }),
    );
    await tester.pumpAndSettle();
    expect(light, AppShadows.lightFloating);
    expect(dark, AppShadows.darkFloating);
    expect(h1, greaterThanOrEqualTo(40));
    expect(h2, greaterThan(h1));
  });

  testWidgets('LeadingTickBorder pinta sin errores', (tester) async {
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Material(
          shape: const LeadingTickBorder(tickColor: Colors.blue),
          child: const SizedBox(width: 100, height: 40),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
  });
}
