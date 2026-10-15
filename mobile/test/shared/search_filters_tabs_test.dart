import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/app_dropdown_decoration.dart';
import 'package:genwork_mobile/shared/widgets/field_suffix.dart';
import 'package:genwork_mobile/shared/widgets/gen_filter_chip_bar.dart';
import 'package:genwork_mobile/shared/widgets/gen_tab_bar.dart';
import 'package:genwork_mobile/shared/widgets/workspace_filters_drawer.dart';
import 'package:genwork_mobile/shared/widgets/workspace_input_theme.dart';
import 'package:genwork_mobile/shared/widgets/workspace_search_bar.dart';
import 'package:genwork_mobile/shared/widgets/workspace_selector_bar.dart';

Future<void> _mount(
  WidgetTester t,
  Widget body, {
  bool dark = false,
  double scale = 1,
}) async {
  t.view.physicalSize = const Size(360, 720);
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
      home: Scaffold(body: body),
    ),
  );
}

void main() {
  for (final dark in [false, true]) {
    for (final scale in [1.0, 1.5]) {
      testWidgets('barra de búsqueda, chips y tabs sin overflow '
          '(dark=$dark, $scale×)', (t) async {
        final controller = TextEditingController(text: 'hola');
        addTearDown(controller.dispose);
        await _mount(
          t,
          Column(
            children: [
              WorkspaceSearchBar(
                controller: controller,
                onChanged: (_) {},
                hintText: 'Buscar',
                actions: [
                  IconButton(onPressed: () {}, icon: const Icon(Icons.add)),
                ],
              ),
              WorkspaceSelectorBar(
                chips: const [
                  GenFilterChip(id: 'a', label: 'Todos'),
                  GenFilterChip(id: 'b', label: 'Mis proyectos'),
                  GenFilterChip(id: 'c', label: 'Favoritos'),
                ],
                selectedId: 'a',
                onSelected: (_) {},
                trailing: WorkspaceFilterButton(onPressed: () {}, count: 2),
              ),
              GenTabBar(
                tabs: const [
                  GenTabItem(label: 'Activos'),
                  GenTabItem(label: 'Archivados'),
                  GenTabItem(label: 'Una pestaña con nombre largo'),
                ],
                activeIndex: 0,
                onSelect: (_) {},
                inlineActions: [
                  GenTabAction(icon: Icons.add, onPressed: () {}),
                ],
              ),
            ],
          ),
          dark: dark,
          scale: scale,
        );
        expect(t.takeException(), isNull);
      });
    }
  }

  testWidgets('WorkspaceSearchBar: limpia y notifica', (t) async {
    final controller = TextEditingController(text: 'abc');
    addTearDown(controller.dispose);
    final changes = <String>[];
    await _mount(
      t,
      WorkspaceSearchBar(
        controller: controller,
        onChanged: changes.add,
        hintText: 'Buscar',
      ),
    );
    await t.tap(find.byTooltip('Limpiar búsqueda'));
    await t.pump();
    expect(controller.text, isEmpty);
    expect(changes.last, '');
    expect(find.byTooltip('Limpiar búsqueda'), findsNothing);
    await t.enterText(find.byType(TextField), 'xyz');
    expect(changes.last, 'xyz');
  });

  testWidgets('WorkspaceFilterButton: conteo y estado activo', (t) async {
    await _mount(t, WorkspaceFilterButton(onPressed: () {}, count: 3));
    expect(find.text('Filtros (3)'), findsOneWidget);
    await _mount(t, WorkspaceFilterButton(onPressed: () {}));
    expect(find.text('Filtros'), findsOneWidget);
  });

  testWidgets('GenFilterChipBar: activo en brandFill/brand, selecciona', (
    t,
  ) async {
    String? picked;
    await _mount(
      t,
      GenFilterChipBar(
        chips: const [
          GenFilterChip(id: 'a', label: 'Uno'),
          GenFilterChip(id: 'b', label: 'Dos'),
        ],
        selectedId: 'a',
        onSelected: (id) => picked = id,
      ),
    );
    final c = GenColors.light;
    final active = t.widget<TextButton>(find.widgetWithText(TextButton, 'Uno'));
    expect(active.style!.backgroundColor!.resolve({}), c.brandFill);
    expect(active.style!.foregroundColor!.resolve({}), c.brand);
    final idle = t.widget<TextButton>(find.widgetWithText(TextButton, 'Dos'));
    expect(idle.style!.backgroundColor!.resolve({}), c.field);
    await t.tap(find.text('Dos'));
    expect(picked, 'b');
    expect(find.byType(ChoiceChip), findsNothing);
  });

  testWidgets('GenTabBar: lengüeta de 3 px en la activa, selecciona y cierra', (
    t,
  ) async {
    var selected = -1;
    var closed = 0;
    await _mount(
      t,
      GenTabBar(
        tabs: [
          const GenTabItem(label: 'Uno'),
          GenTabItem(label: 'Dos', onClose: () => closed++),
        ],
        activeIndex: 0,
        onSelect: (i) => selected = i,
      ),
    );
    final c = GenColors.light;
    BoxDecoration deco(String label) =>
        t
                .widget<Container>(
                  find
                      .ancestor(
                        of: find.text(label),
                        matching: find.byType(Container),
                      )
                      .first,
                )
                .decoration!
            as BoxDecoration;
    final active = (deco('Uno').border! as Border).bottom;
    expect(active.width, kActiveTickWidth);
    expect(active.color, c.brand);
    expect((deco('Dos').border! as Border).bottom.color.a, 0);
    await t.tap(find.text('Dos'));
    expect(selected, 1);
    await t.tap(find.byTooltip('Cerrar Dos'));
    expect(closed, 1);
  });

  testWidgets('GenTabBar mantiene a la vista la pestaña activa', (t) async {
    await _mount(
      t,
      GenTabBar(
        tabs: [for (var i = 0; i < 8; i++) GenTabItem(label: 'Pestaña $i')],
        activeIndex: 7,
        onSelect: (_) {},
      ),
    );
    await t.pumpAndSettle();
    final box = t.getRect(find.text('Pestaña 7'));
    expect(box.right, lessThanOrEqualTo(360));
  });

  testWidgets('FieldSuffix y appDropdownDecoration', (t) async {
    final decoration = appDropdownDecoration(
      const InputDecoration(labelText: 'x'),
    );
    expect(
      decoration.contentPadding,
      const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
    );
    expect(
      appDropdownDecoration(
        const InputDecoration(contentPadding: EdgeInsets.zero),
      ).contentPadding,
      EdgeInsets.zero,
    );
    await _mount(
      t,
      WorkspaceInputTheme(
        child: TextField(
          decoration: InputDecoration(
            labelText: 'Campo',
            suffixIconConstraints: FieldSuffix.constraints,
            suffixIcon: FieldSuffix.row([
              FieldSuffixButton(
                icon: Icons.check,
                tooltip: 'ok',
                onPressed: () {},
              ),
            ]),
          ),
        ),
      ),
    );
    expect(t.takeException(), isNull);
    expect(
      t.getSize(find.byTooltip('ok')).width,
      greaterThanOrEqualTo(FieldSuffix.slot),
    );
  });

  testWidgets('showWorkspaceFiltersDrawer: aplicar y limpiar cierran', (
    t,
  ) async {
    var applied = 0;
    var cleared = 0;
    await _mount(
      t,
      Builder(
        builder: (context) => TextButton(
          onPressed: () => showWorkspaceFiltersDrawer(
            context,
            builder: (_) => WorkspaceFiltersPanel(
              onApply: () => applied++,
              onClear: () => cleared++,
              child: const Text('cuerpo'),
            ),
          ),
          child: const Text('abrir'),
        ),
      ),
      scale: 1.5,
    );
    await t.tap(find.text('abrir'));
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
    expect(find.text('Filtros'), findsOneWidget);
    await t.tap(find.text('Aplicar'));
    await t.pumpAndSettle();
    expect(applied, 1);
    expect(find.text('cuerpo'), findsNothing);
    await t.tap(find.text('abrir'));
    await t.pumpAndSettle();
    await t.tap(find.text('Limpiar'));
    await t.pumpAndSettle();
    expect(cleared, 1);
  });
}
