import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/color_contrast.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/app_button_styles.dart';
import 'package:genwork_mobile/shared/widgets/app_inline_notice.dart';
import 'package:genwork_mobile/shared/widgets/color_dot.dart';
import 'package:genwork_mobile/shared/widgets/color_palette.dart';
import 'package:genwork_mobile/shared/widgets/error_text.dart';
import 'package:genwork_mobile/shared/widgets/status_chip.dart';

Future<void> _mount(WidgetTester t, Widget child, {bool dark = false}) =>
    t.pumpWidget(
      MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        home: Scaffold(body: SingleChildScrollView(child: child)),
      ),
    );

void main() {
  for (final dark in [false, true]) {
    final name = dark ? 'oscuro' : 'claro';
    testWidgets('StatusChip y ColorPill legibles ($name)', (t) async {
      await _mount(
        t,
        const Column(
          children: [
            ColorPill(label: 'Amarillo', hex: '#eab308'),
            ColorPill(label: 'Rojo', hex: '#ef4444'),
            ColorPill(label: 'Sin color'),
            InfoChip(label: 'Info'),
          ],
        ),
        dark: dark,
      );
      final c = dark ? GenColors.dark : GenColors.light;
      for (final label in ['Amarillo', 'Rojo', 'Sin color', 'Info']) {
        final text = t.widget<Text>(find.text(label));
        final bg =
            (t
                        .widget<Container>(
                          find.ancestor(
                            of: find.text(label),
                            matching: find.byType(Container),
                          ),
                        )
                        .decoration!
                    as BoxDecoration)
                .color!;
        expect(
          appContrastRatio(text.style!.color!, appColorOver(bg, c.surface)),
          greaterThanOrEqualTo(4.5),
          reason: label,
        );
      }
    });

    testWidgets('AppInlineNotice por tono ($name)', (t) async {
      await _mount(
        t,
        const Column(
          children: [
            AppInlineNotice(message: 'info'),
            AppInlineNotice(message: 'ok', tone: AppInlineNoticeTone.success),
            AppInlineNotice.warning(message: 'aviso'),
            AppInlineNotice.error(message: 'error'),
          ],
        ),
        dark: dark,
      );
      expect(find.byType(AppInlineNotice), findsNWidgets(4));
      final c = dark ? GenColors.dark : GenColors.light;
      for (final label in ['info', 'ok', 'aviso', 'error']) {
        final text = t.widget<Text>(find.text(label));
        expect(
          appContrastRatio(text.style!.color!, c.surface),
          greaterThanOrEqualTo(4.5),
          reason: label,
        );
      }
    });
  }

  testWidgets('ErrorText usa danger 12', (t) async {
    await _mount(t, const ErrorText('falló'));
    final style = t.widget<Text>(find.text('falló')).style!;
    expect(style.color, GenColors.light.danger);
    expect(style.fontSize, 12);
  });

  testWidgets('ColorPalette: 16 colores + defecto, keys y selección', (
    t,
  ) async {
    String? picked = 'sin';
    await _mount(
      t,
      ColorPalette(value: '#3b5bfa', onChanged: (v) => picked = v),
    );
    expect(ColorPalette.colors, hasLength(16));
    for (final hex in [...ColorPalette.colors, ColorPalette.defaultColor]) {
      expect(find.byKey(ValueKey('color_$hex')), findsOneWidget, reason: hex);
    }
    // Swatch visual de 32 dentro de un objetivo táctil de 48.
    expect(
      t.getSize(find.byKey(const ValueKey('color_#ef4444'))).shortestSide,
      greaterThanOrEqualTo(48),
    );
    await t.tap(find.byKey(const ValueKey('color_#92400e')));
    expect(picked, '#92400e');
    await t.tap(find.byKey(const ValueKey('color_clear')));
    expect(picked, isNull);
  });

  testWidgets('destructiveFilled usa danger y onError', (t) async {
    late ButtonStyle style;
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Builder(
          builder: (c) {
            style = AppButtonStyles.destructiveFilled(c);
            return const SizedBox();
          },
        ),
      ),
    );
    expect(style.backgroundColor!.resolve({}), GenColors.light.danger);
    expect(style.foregroundColor!.resolve({}), GenColors.light.onBrand);
  });
}
