import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/action_confirmation_dialog.dart';
import 'package:genwork_mobile/shared/widgets/adaptive_modal.dart';
import 'package:genwork_mobile/shared/widgets/app_form_dialog.dart';
import 'package:genwork_mobile/shared/widgets/app_work_dialog.dart';
import 'package:genwork_mobile/shared/widgets/name_color_dialog.dart';
import 'package:genwork_mobile/shared/widgets/picker_dialog.dart';
import 'package:genwork_mobile/shared/widgets/reorder_dialog.dart';

Future<void> _app(
  WidgetTester t,
  void Function(BuildContext) open, {
  bool dark = false,
  double scale = 1,
}) async {
  t.view.physicalSize = const Size(360, 640);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    MaterialApp(
      theme: dark ? AppTheme.dark() : AppTheme.light(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: Scaffold(
        body: Builder(
          builder: (c) =>
              TextButton(onPressed: () => open(c), child: const Text('abrir')),
        ),
      ),
    ),
  );
  await t.tap(find.text('abrir'));
  await t.pumpAndSettle();
}

void main() {
  for (final dark in [false, true]) {
    for (final scale in [1.0, 1.5]) {
      testWidgets('AppWorkDialog sin overflow a 360 dp (dark=$dark, $scale×)', (
        t,
      ) async {
        await _app(
          t,
          (c) => showAppFormDialog<void>(
            c,
            builder: (_) => AppWorkDialog(
              title: 'Un título bastante largo para una ventana de trabajo',
              subtitle: 'Subtítulo',
              actions: [
                TextButton(onPressed: () {}, child: const Text('Cancelar')),
                FilledButton(onPressed: () {}, child: const Text('Guardar')),
              ],
              child: Text('Contenido. ' * 80),
            ),
          ),
          dark: dark,
          scale: scale,
        );
        expect(t.takeException(), isNull);
        expect(find.text('Guardar'), findsOneWidget);
        final c = dark ? GenColors.dark : GenColors.light;
        final footer = t.widget<ColoredBox>(
          find
              .descendant(
                of: find.byType(AppWorkFooter),
                matching: find.byType(ColoredBox),
              )
              .first,
        );
        expect(footer.color, c.field);
        final close = find.byTooltip('Cerrar');
        expect(
          t.getSize(close).shortestSide,
          greaterThanOrEqualTo(kMinInteractiveDimension),
        );
      });
    }
  }

  testWidgets('AppWorkDialog: closeEnabled=false deshabilita el cierre', (
    t,
  ) async {
    await _app(
      t,
      (c) => showAppFormDialog<void>(
        c,
        builder: (_) => const AppWorkDialog(
          title: 'T',
          closeEnabled: false,
          actions: [],
          child: Text('x'),
        ),
      ),
    );
    expect(t.widget<IconButton>(find.byType(IconButton)).onPressed, isNull);
    expect(find.byType(AppWorkFooter), findsNothing);
  });

  testWidgets('showAdaptiveModal y showPickerDialog: título y cierre', (
    t,
  ) async {
    await _app(
      t,
      (c) => showAdaptiveModal<void>(
        context: c,
        title: 'Modal',
        builder: (_) => const Padding(
          padding: EdgeInsets.all(AppSpacing.md),
          child: Text('cuerpo'),
        ),
      ),
    );
    expect(find.text('Modal'), findsOneWidget);
    await t.tap(find.byTooltip('Cerrar'));
    await t.pumpAndSettle();
    expect(find.text('Modal'), findsNothing);
    await t.tap(find.text('abrir'));
    await t.pumpAndSettle();
    expect(find.text('Modal'), findsOneWidget);
  });

  testWidgets('showPickerDialog cierra con el header', (t) async {
    await _app(
      t,
      (c) => showPickerDialog<void>(
        c,
        title: 'Elegí',
        builder: (_) => const ListTile(title: Text('opción')),
      ),
    );
    expect(find.text('Elegí'), findsOneWidget);
    await t.tap(find.byTooltip('Cerrar'));
    await t.pumpAndSettle();
    expect(find.text('opción'), findsNothing);
  });

  testWidgets('confirmAction: cerrar con la cruz cancela (false)', (t) async {
    bool? result;
    await _app(
      t,
      (c) async => result = await confirmAction(
        c,
        title: 'Borrar',
        message: '¿Seguro?',
        confirmLabel: 'Borrar',
        danger: true,
        onConfirm: () async {},
      ),
    );
    expect(find.text('¿Seguro?'), findsOneWidget);
    await t.tap(find.byTooltip('Cerrar'));
    await t.pumpAndSettle();
    expect(result, isFalse);
  });

  testWidgets('confirmAction danger usa el rojo de danger', (t) async {
    await _app(
      t,
      (c) => confirmAction(
        c,
        title: 'Borrar',
        message: '¿Seguro?',
        confirmLabel: 'Borrar',
        danger: true,
        onConfirm: () async {},
      ),
    );
    final style = t
        .widget<FilledButton>(find.byKey(const ValueKey('action_confirm')))
        .style!;
    expect(style.backgroundColor!.resolve({}), GenColors.light.danger);
  });

  testWidgets('showNameColorDialog y showReorderDialog sin overflow a 1.5×', (
    t,
  ) async {
    await _app(
      t,
      (c) => showNameColorDialog(
        c,
        title: 'Nueva etiqueta',
        withColor: true,
        onSave: (_, _) async {},
      ),
      scale: 1.5,
    );
    expect(t.takeException(), isNull);
    expect(find.byKey(const ValueKey('name_color_name')), findsOneWidget);
    await t.tap(find.byTooltip('Cerrar'));
    await t.pumpAndSettle();
    await t.tap(find.text('abrir'));
    await t.pumpAndSettle();
    await t.pumpWidget(const SizedBox()); // desmonta
  });

  testWidgets('showReorderDialog carga, mueve y guarda', (t) async {
    List<String>? saved;
    await _app(
      t,
      (c) => showReorderDialog(
        c,
        title: 'Ordenar',
        load: () async => [(id: 'a', label: 'A'), (id: 'b', label: 'B')],
        save: (ids) async => saved = ids,
      ),
      scale: 1.5,
    );
    expect(t.takeException(), isNull);
    await t.tap(find.byKey(const ValueKey('order_down_a')));
    await t.pump();
    await t.tap(find.byKey(const ValueKey('order_save')));
    await t.pumpAndSettle();
    expect(saved, ['b', 'a']);
  });
}
