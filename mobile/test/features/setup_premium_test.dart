// Acceso (spec 066, tarea 21, P01): visor cuadrado de 240 dp con esquinas de
// encuadre, título 20/700, "Escribir dirección a mano" tonal (relleno si la
// cámara falla) y pasos numerados en círculos.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:genwork_mobile/features/setup/server_setup_screen.dart';

Widget _scanner(BuildContext context, ValueChanged<String> onCode) => Builder(
  builder: (context) => TextButton(
    key: const ValueKey('camera_fails'),
    onPressed: () => const QrCameraUnavailable().dispatch(context),
    child: const Text('fallar'),
  ),
);

Future<void> _mount(WidgetTester t) async {
  t.view.physicalSize = const Size(390, 1200);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    ProviderScope(
      overrides: [qrScannerBuilderProvider.overrideWithValue(_scanner)],
      child: MaterialApp(
        theme: AppTheme.light(),
        home: const ServerSetupScreen(),
      ),
    ),
  );
  await t.pumpAndSettle();
}

Color? _bg(WidgetTester t, String key) => t
    .widget<ButtonStyleButton>(find.byKey(ValueKey(key)))
    .style
    ?.backgroundColor
    ?.resolve({});

void main() {
  testWidgets('título 20/700 y "Escribir dirección a mano" tonal a lo ancho', (
    t,
  ) async {
    await _mount(t);
    final title = t.widget<Text>(find.text('Escaneá el QR de tu sistema'));
    expect(title.style!.fontSize, 20);
    expect(title.style!.fontWeight, FontWeight.w700);
    final toggle = find.byKey(const ValueKey('setup_manual_toggle'));
    expect(t.getSize(toggle).height, greaterThanOrEqualTo(44));
    expect(_bg(t, 'setup_manual_toggle'), GenColors.light.brandFill);
  });

  testWidgets('si la cámara falla, escribir a mano pasa a botón relleno', (
    t,
  ) async {
    await _mount(t);
    await t.tap(find.byKey(const ValueKey('camera_fails')));
    await t.pumpAndSettle();
    expect(_bg(t, 'setup_manual_toggle'), GenColors.light.brand);
  });

  testWidgets('pasos numerados en círculos bajo un rótulo', (t) async {
    await _mount(t);
    expect(find.text('CÓMO CONSEGUIR EL CÓDIGO'), findsOneWidget);
    for (var i = 1; i <= 3; i++) {
      final circle = find.byKey(ValueKey('setup_step_$i'));
      expect(t.getSize(circle), const Size.square(AppSpacing.ml));
      expect(
        find.descendant(of: circle, matching: find.text('$i')),
        findsOneWidget,
      );
    }
  });

  testWidgets('QrViewfinder: 240 dp, fondo de campo y cuatro esquinas', (
    t,
  ) async {
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(
          body: Center(child: QrViewfinder(child: SizedBox.expand())),
        ),
      ),
    );
    expect(t.getSize(find.byType(QrViewfinder)), const Size.square(240));
    final box = t.widget<Container>(
      find.byKey(const ValueKey('qr_viewfinder_box')),
    );
    expect((box.decoration! as BoxDecoration).color, GenColors.light.field);
    expect(find.byKey(const ValueKey('qr_corners')), findsOneWidget);
  });
}
