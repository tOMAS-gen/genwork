// Compositor de tareas (spec 066, tarea 19, P07-M1, P12-M5, T8): una sola
// barra de 56 dp con el destino como chip y la ayuda como "?" dentro del
// campo, y el alto máximo calculado sobre lo que deja el teclado.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/shared/widgets/task_composer.dart';

Future<void> _mount(
  WidgetTester t, {
  Size size = const Size(390, 844),
  double keyboard = 0,
}) async {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        theme: AppTheme.light(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(viewInsets: EdgeInsets.only(bottom: keyboard)),
          child: child!,
        ),
        home: Scaffold(
          resizeToAvoidBottomInset: false,
          body: Column(
            children: [
              Expanded(
                child: ListView(
                  key: const ValueKey('lista'),
                  children: [for (var i = 0; i < 30; i++) Text('Fila $i')],
                ),
              ),
              TaskComposer(
                key: const ValueKey('composer'),
                sectorId: 's',
                hint: 'Nueva tarea en Impresión…',
                destination: const SizedBox(
                  key: ValueKey('destino'),
                  width: 80,
                  height: 28,
                ),
                onSubmit: (_) async => true,
              ),
            ],
          ),
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
}

void main() {
  setUpAll(() async {
    await (FontLoader(
      'Montserrat',
    )..addFont(rootBundle.load('assets/fonts/Montserrat.ttf'))).load();
  });

  testWidgets('sin foco, el compositor ocupa ≤56 dp (P07-M1)', (t) async {
    await _mount(t);
    expect(
      t.getSize(find.byKey(const ValueKey('composer'))).height,
      lessThanOrEqualTo(56),
    );
  });

  testWidgets('destino y ayuda van dentro del campo', (t) async {
    await _mount(t);
    final field = t.getRect(find.byKey(const ValueKey('task_composer_field')));
    for (final key in ['destino', 'task_composer_details']) {
      final r = t.getRect(find.byKey(ValueKey(key)));
      expect(field.contains(r.center), isTrue, reason: key);
    }
    // La ayuda abre la descripción, como antes.
    await t.tap(find.byKey(const ValueKey('task_composer_details')));
    await t.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('task_composer_description')),
      findsOneWidget,
    );
  });

  testWidgets(
    'con el teclado en horizontal no tapa la lista ni desborda (T8)',
    (t) async {
      await _mount(t, size: const Size(800, 360), keyboard: 200);
      await t.tap(find.byKey(const ValueKey('task_composer_details')));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      final composer = t.getSize(find.byKey(const ValueKey('composer'))).height;
      // Como mucho el 42 % de lo que deja el teclado.
      expect(composer, lessThanOrEqualTo((360 - 200) * .42 + 1));
    },
  );
}
