// Estadísticas del dashboard como `.stats-bar` de la web móvil (P05, P08).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/shared/widgets/stat_cards.dart';

Future<void> _pump(WidgetTester t, {double width = 366, double scale = 1}) async {
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
      home: const Scaffold(
        body: StatCards(
          items: [
            (label: 'Total', value: 3, pct: 100),
            (label: 'En progreso', value: 3, pct: 100),
            (label: 'Completados', value: 0, pct: 0),
            (label: 'Pendientes', value: 0, pct: 0),
          ],
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('una card por indicador, en 2 × 2, con "rótulo · %"', (t) async {
    await _pump(t);
    expect(find.byType(StatCard), findsNWidgets(4));
    expect(find.text('Total · 100%'), findsOneWidget);
    expect(find.text('Pendientes · 0%'), findsOneWidget);
    final total = t.getRect(find.byType(StatCard).at(0));
    final progress = t.getRect(find.byType(StatCard).at(1));
    final done = t.getRect(find.byType(StatCard).at(2));
    expect(progress.top, total.top, reason: 'misma fila');
    expect(done.top, greaterThan(total.bottom), reason: 'segunda fila');
    expect(progress.left - total.right, 12, reason: 'gap de 12');
  });

  testWidgets('sin overflow a 360 dp y 150 %', (t) async {
    await _pump(t, width: 336, scale: 1.5);
    expect(t.takeException(), isNull);
  });
}
