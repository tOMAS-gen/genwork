import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/color_contrast.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';

void main() {
  test('valores clave claro y oscuro', () {
    expect(GenColors.light.brand, const Color(0xFF3B5BFA));
    expect(GenColors.dark.brand, const Color(0xFF5B7FFF));
    expect(GenColors.light.page, const Color(0xFFF4F5F8));
    expect(GenColors.dark.page, const Color(0xFF0C0C0C));
    expect(GenColors.dark.onBrand, const Color(0xFF0C0C0C));
    expect(GenColors.dark.brandFill, const Color(0xFF171C2E));
    expect(GenColors.light.outline, const Color(0xFFE3E6EB));
    expect(GenColors.dark.successFill, const Color(0x1A22C55E));
    expect(GenColors.light.tagExecFill, GenColors.light.brandFill);
  });

  test('neutros oscuros acromáticos', () {
    for (final c in [
      GenColors.dark.page,
      GenColors.dark.field,
      GenColors.dark.surface,
      GenColors.dark.floating,
      GenColors.dark.hover,
      GenColors.dark.text,
      GenColors.dark.muted,
      GenColors.dark.border,
      GenColors.dark.outline,
    ]) {
      expect(c.g, c.r);
      expect(c.b, c.r);
    }
  });

  // D10 (auditoría premium): en oscuro los escalones siempre suben.
  test('oscuro con escalones que suben: página < card < campo < flotante', () {
    const d = GenColors.dark;
    final steps = [d.page, d.surface, d.field, d.floating];
    for (var i = 1; i < steps.length; i++) {
      expect(
        steps[i].computeLuminance(),
        greaterThan(steps[i - 1].computeLuminance()),
      );
    }
  });

  // T11: el contorno que identifica un campo o un botón secundario mide ≥3:1
  // contra lo que lo rodea (WCAG 1.4.11).
  test('contorno de control a 3:1 en ambos temas', () {
    for (final c in [GenColors.light, GenColors.dark]) {
      for (final bg in [c.page, c.surface, c.floating]) {
        expect(appContrastRatio(c.control, bg), greaterThanOrEqualTo(3));
      }
    }
  });

  // D10: verde y ámbar desaturados en oscuro, sin perder 4,5:1.
  test('verde y ámbar oscuros legibles y sin vibrar', () {
    const d = GenColors.dark;
    for (final color in [d.ok, d.success, d.warning, d.dueText, d.favorite]) {
      expect(HSLColor.fromColor(color).saturation, lessThanOrEqualTo(.75));
      for (final bg in [d.surface, d.field]) {
        expect(appContrastRatio(color, bg), greaterThanOrEqualTo(4.5));
      }
    }
  });

  test('lerp interpola y copyWith reemplaza', () {
    final mid = GenColors.light.lerp(GenColors.dark, .5);
    expect(mid.page, Color.lerp(GenColors.light.page, GenColors.dark.page, .5));
    expect(
      GenColors.light.lerp(GenColors.dark, 0).brand,
      GenColors.light.brand,
    );
    expect(GenColors.light.lerp(GenColors.dark, 1).brand, GenColors.dark.brand);
    const rojo = Color(0xFFFF0000);
    final copia = GenColors.light.copyWith(brand: rojo);
    expect(copia.brand, rojo);
    expect(copia.page, GenColors.light.page);
  });

  test('helpers de chip y estado mezclan según la regla', () {
    const c = Color(0xFFEF4444);
    final l = GenColors.light;
    expect(
      l.chipFill(c),
      Color.alphaBlend(c.withValues(alpha: .14), l.surface),
    );
    expect(l.chipText(c), Color.lerp(l.text, c, .8));
    expect(
      l.statusFill(c),
      Color.alphaBlend(c.withValues(alpha: .16), l.surface),
    );
    expect(l.statusText(c), Color.lerp(l.text, c, .85));
  });

  test('textOn sigue la regla de contrast.ts', () {
    expect(textOn(const Color(0xFFFFFFFF)), const Color(0xFF111111));
    expect(textOn(const Color(0xFF000000)), const Color(0xFFFFFFFF));
    expect(textOn(const Color(0xFFFACC15)), const Color(0xFF111111));
    expect(textOn(const Color(0xFF3B5BFA)), const Color(0xFFFFFFFF));
  });

  test('readableOn elige el de mayor contraste', () {
    expect(readableOn(GenColors.light.success), const Color(0xFF111111));
    expect(readableOn(GenColors.light.brand), const Color(0xFFFFFFFF));
    expect(readableOn(const Color(0xFF000000)), const Color(0xFFFFFFFF));
  });

  testWidgets('context.colors lee la extensión del tema', (tester) async {
    late GenColors got;
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(extensions: const [GenColors.dark]),
        home: Builder(
          builder: (context) {
            got = context.colors;
            return const SizedBox();
          },
        ),
      ),
    );
    expect(got.brand, GenColors.dark.brand);
  });
}
