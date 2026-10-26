// Barra de listado como `.toolbar` de la web (P05, P08, P11).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/features/works/work_table.dart';
import 'package:genwork_mobile/shared/widgets/list_toolbar.dart';
import 'package:intl/date_symbol_data_local.dart';

Future<void> _pump(
  WidgetTester t,
  Widget child, {
  double width = 390,
  double scale = 1,
  bool dark = false,
}) async {
  t.view.physicalSize = Size(width, 844);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    MaterialApp(
      theme: dark ? AppTheme.dark() : AppTheme.light(),
      builder: (context, c) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(scale)),
        child: c!,
      ),
      home: Scaffold(body: SingleChildScrollView(child: child)),
    ),
  );
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('filtros, orden, vista, chips y limpiar', (t) async {
    var expanded = false, grid = true, cleared = 0, removed = 0;
    var sort = 'recent';
    late StateSetter rebuild;
    await _pump(
      t,
      StatefulBuilder(
        builder: (context, setState) {
          rebuild = setState;
          return ListToolbar<String>(
            keyPrefix: 'x',
            searchHint: 'Buscar proyectos…',
            onSearch: (_) {},
            filtersExpanded: expanded,
            onToggleFilters: () => setState(() => expanded = !expanded),
            filtersPanel: const Text('panel'),
            activeFilters: [
              (label: 'Grupo: Diseño', remove: () => removed++),
            ],
            onClear: () => cleared++,
            sort: sort,
            sortOptions: const {
              'recent': 'Más recientes',
              'name': 'Nombre · A–Z',
            },
            onSort: (v) => setState(() => sort = v),
            grid: grid,
            onGrid: (v) => setState(() => grid = v),
            count: '3 proyectos',
          );
        },
      ),
    );
    expect(find.text('Buscar proyectos…'), findsOneWidget);
    expect(find.text('Más recientes'), findsOneWidget);
    expect(find.text('3 proyectos'), findsOneWidget);
    expect(find.text('panel'), findsNothing);
    // El contador del botón muestra cuántos filtros hay activos.
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('x_filters_toggle')),
        matching: find.text('1'),
      ),
      findsOneWidget,
    );
    await t.tap(find.byKey(const ValueKey('x_filters_toggle')));
    await t.pumpAndSettle();
    expect(find.text('panel'), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('x_view_list')));
    await t.pumpAndSettle();
    expect(grid, isFalse);
    await t.tap(find.text('Grupo: Diseño'));
    await t.tap(find.byKey(const ValueKey('x_filters_clear')));
    expect((removed, cleared), (1, 1));
    await t.tap(find.byKey(const ValueKey('x_sort')));
    await t.pumpAndSettle();
    await t.tap(find.text('Nombre · A–Z').last);
    await t.pumpAndSettle();
    expect(sort, 'name');
    rebuild(() {});
  });

  for (final dark in [false, true]) {
    testWidgets('sin overflow a 360 dp y 150 % (dark=$dark)', (t) async {
      await _pump(
        t,
        ListToolbar<int>(
          keyPrefix: 'x',
          searchHint: 'Buscar proyectos…',
          onSearch: (_) {},
          filtersExpanded: true,
          onToggleFilters: () {},
          filtersPanel: const Text('panel'),
          activeFilters: [(label: 'Sector: Impresión', remove: () {})],
          onClear: () {},
          sort: 0,
          sortOptions: const {0: 'Más recientes'},
          onSort: (_) {},
          grid: true,
          onGrid: (_) {},
          count: '3 proyectos',
        ),
        width: 336,
        scale: 1.5,
        dark: dark,
      );
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('WorkTable: columnas de la web y fila que abre el proyecto', (
    t,
  ) async {
    WorkSummary? opened;
    await _pump(
      t,
      WorkTable(
        works: [
          WorkSummary.fromJson({
            'id': 'w',
            'name': 'Cartelería del local',
            'groupName': 'QA produccion',
            'dueDate': '2026-10-29T00:00:00.000Z',
            'taskCounts': {'done': 1, 'total': 3},
          }),
        ],
        now: DateTime(2026, 10, 26),
        onOpen: (w) => opened = w,
        onArchive: (_) {},
      ),
    );
    for (final header in ['PROYECTO', 'GRUPO', 'ETIQUETAS', 'PROGRESO']) {
      expect(find.text(header), findsOneWidget);
    }
    expect(find.text('Entrega: 29/10'), findsOneWidget);
    expect(find.text('QA produccion'), findsOneWidget);
    expect(find.text('33%'), findsOneWidget);
    await t.tap(find.text('Cartelería del local'));
    expect(opened?.id, 'w');
  });
}
