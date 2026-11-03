// Resumen del proyecto como `.work-overview` de la web (P07).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/features/works/work_summary.dart';
import 'package:intl/date_symbol_data_local.dart';

WorkDetail _work() => WorkDetail.fromJson({
  'id': 'w',
  'name': 'Cartelería del local',
  'code': 'CARTELERIA_001',
  'status': 'ACTIVE',
  'access': 'operate',
  'dueDate': '2026-10-29T00:00:00.000Z',
  'groupName': 'QA produccion',
});

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('fecha límite debajo del avance, con urgencia, ✕ y etiquetas', (
    t,
  ) async {
    t.view.physicalSize = const Size(390, 1200);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    var picked = 0, cleared = 0, labels = 0;
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: SingleChildScrollView(
            child: WorkSummaryPanel(
              work: _work(),
              now: DateTime(2026, 10, 26),
              onPickDue: () => picked++,
              onClearDue: () => cleared++,
              onEditLabels: () => labels++,
            ),
          ),
        ),
      ),
    );
    expect(
      t.getTopLeft(find.text('FECHA LÍMITE')).dy,
      greaterThan(t.getTopLeft(find.text('AVANCE')).dy),
      reason: 'como la web, la fecha va debajo del avance',
    );
    expect(find.text('29/10/2026'), findsOneWidget);
    final urgency = t.widget<Text>(find.text('3 días restantes'));
    expect(urgency.style?.color, GenColors.light.warningText);
    await t.tap(find.byKey(const ValueKey('work_due_pick')));
    await t.tap(find.byKey(const ValueKey('work_due_clear')));
    await t.tap(find.byKey(const ValueKey('work_labels_edit')));
    expect((picked, cleared, labels), (1, 1, 1));
    // P07-M2: una sola card blanca, secciones separadas por divisores y sin
    // bloques de relleno de campo.
    final panel = find.byType(WorkSummaryPanel);
    expect(
      find.descendant(of: panel, matching: find.byType(Divider)),
      findsNWidgets(4),
    );
    final c = GenColors.light;
    expect(
      t
          .widgetList<Container>(
            find.descendant(of: panel, matching: find.byType(Container)),
          )
          .where(
            (box) =>
                box.color == c.field ||
                (box.decoration as BoxDecoration?)?.color == c.field,
          ),
      isEmpty,
    );
    // Copiar el código es un ícono, no un botón con borde.
    expect(
      find.descendant(of: panel, matching: find.byType(OutlinedButton)),
      findsNothing,
    );
  });
}
