// Franja de KPI (spec 066, tarea 17, P05-M1, P08-M1, P35-M4): una sola card de
// ~72 dp con divisores verticales, la cifra en 20/700 mono y el rótulo en
// 11/600, sin "· %".
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/stat_cards.dart';

const _items = <StatItem>[
  (label: 'Total', value: '3'),
  (label: 'En progreso', value: '3'),
  (label: 'Completados', value: '0'),
  (label: 'Pendientes', value: '0'),
];

Future<void> _pump(
  WidgetTester t, {
  double width = 390,
  double scale = 1,
  List<StatItem> items = _items,
}) async {
  t.view.physicalSize = Size(width, 800);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: Scaffold(
        body: Align(
          alignment: Alignment.topCenter,
          child: StatCards(items: items),
        ),
      ),
    ),
  );
}

void main() {
  // Con las fuentes reales: la de test es más ancha y parte los rótulos.
  setUpAll(() async {
    for (final (family, file) in [
      ('Montserrat', 'Montserrat'),
      ('RobotoMono', 'RobotoMono'),
    ]) {
      await (FontLoader(
        family,
      )..addFont(rootBundle.load('assets/fonts/$file.ttf'))).load();
    }
  });

  testWidgets('una sola card con los cuatro valores en una fila', (t) async {
    await _pump(t);
    expect(find.byKey(const ValueKey('stat_strip')), findsOneWidget);
    final total = t.getRect(find.text('3').first);
    final pending = t.getRect(find.text('Pendientes'));
    expect(pending.top, greaterThan(total.top), reason: 'rótulo debajo');
    final values = [
      for (final e in find.byKey(const ValueKey('stat_value')).evaluate())
        (e.renderObject! as RenderBox).localToGlobal(Offset.zero).dy,
    ];
    expect(values.toSet().length, 1, reason: 'misma fila');
    // Tres divisores verticales de 1 px entre cuatro valores.
    expect(find.byType(VerticalDivider), findsNWidgets(3));
    final h = t.getSize(find.byKey(const ValueKey('stat_strip'))).height;
    expect(h, inInclusiveRange(64, 80));
    expect(find.textContaining('%'), findsNothing);
  });

  testWidgets('cifra 20/700 mono y rótulo 11/600 gris', (t) async {
    await _pump(t);
    final value = t.widget<Text>(find.text('3').first).style!;
    expect(value.fontSize, 20);
    expect(value.fontWeight, FontWeight.w700);
    expect(value.fontFamily, 'RobotoMono');
    final label = t.widget<Text>(find.text('Total')).style!;
    expect(label.fontSize, 11);
    expect(label.fontWeight, FontWeight.w600);
    expect(label.color, GenColors.light.muted);
  });

  testWidgets('en una columna angosta, todos los rótulos se achican igual', (
    t,
  ) async {
    await _pump(t, width: 300);
    final sizes = {
      for (final l in ['Total', 'En progreso', 'Completados', 'Pendientes'])
        t.widget<Text>(find.text(l)).style!.fontSize,
    };
    expect(sizes, hasLength(1));
    expect(sizes.single, lessThan(11));
    expect(t.takeException(), isNull);
  });

  testWidgets('franja de 3 valores (TV)', (t) async {
    await _pump(
      t,
      items: const [
        (label: 'Pendientes', value: '4'),
        (label: 'Sectores', value: '2'),
        (label: 'Finalizadas', value: '2/6'),
      ],
    );
    expect(find.byType(VerticalDivider), findsNWidgets(2));
    expect(find.text('2/6'), findsOneWidget);
  });

  testWidgets('sin overflow a 336 dp y 150 %', (t) async {
    await _pump(t, width: 336, scale: 1.5);
    expect(t.takeException(), isNull);
  });
}
