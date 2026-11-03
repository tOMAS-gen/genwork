// Cabeceras de la dirección premium (spec 066, tarea 10): miga de 12/500 con
// área táctil de 48 dp, encabezado de entidad común (proyecto, sector, grupo)
// y subpantallas del proyecto que dicen de qué proyecto son.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_text_styles.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/features/works/project_breadcrumb.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';
import 'package:genwork_mobile/shared/widgets/breadcrumb.dart';
import 'package:genwork_mobile/shared/widgets/color_dot.dart';
import 'package:genwork_mobile/shared/widgets/entity_header.dart';
import 'package:genwork_mobile/shared/widgets/gen_section_header.dart';

Future<void> _mount(WidgetTester t, Widget child, {List overrides = const []}) {
  t.view.physicalSize = const Size(360, 720);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  return t.pumpWidget(
    ProviderScope(
      overrides: [...overrides],
      child: MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(body: child),
      ),
    ),
  );
}

void main() {
  testWidgets('Breadcrumb: 12/500 gris, solo el padre y 48 dp táctiles', (
    t,
  ) async {
    var taps = 0;
    await _mount(
      t,
      Breadcrumb(
        rootKey: const ValueKey('root'),
        rootLabel: 'Todos los proyectos',
        onRoot: () => taps++,
      ),
    );
    final style = t.widget<Text>(find.text('Todos los proyectos')).style!;
    expect(style.fontSize, 12);
    expect(style.fontWeight, FontWeight.w500);
    expect(style.color, GenColors.light.muted);
    expect(
      t.getSize(find.byKey(const ValueKey('root'))).height,
      greaterThanOrEqualTo(kMinInteractiveDimension),
    );
    await t.tap(find.byKey(const ValueKey('root')));
    expect(taps, 1);
    await expectLater(t, meetsGuideline(androidTapTargetGuideline));
  });

  testWidgets('Breadcrumb con el nivel actual: «Mis notas › Nota»', (t) async {
    await _mount(
      t,
      Breadcrumb(rootLabel: 'Mis notas', onRoot: () {}, current: 'Nota'),
    );
    expect(find.text('Nota'), findsOneWidget);
    expect(find.text('›'), findsOneWidget);
  });

  testWidgets('EntityHeader: título 20/700, punto de 8 dp, metadatos y menú', (
    t,
  ) async {
    await _mount(
      t,
      const EntityHeader(
        title: 'Impresión',
        colorHex: '#3b5bfa',
        meta: Text('Espacio personal'),
        trailing: Icon(Icons.more_horiz, key: ValueKey('menu')),
      ),
    );
    final title = t.widget<Text>(find.text('Impresión'));
    expect(title.style!.fontSize, AppTextStyles.screenTitle.fontSize);
    expect(title.style!.fontWeight, FontWeight.w700);
    expect(t.getSize(find.byType(ColorDot)), const Size.square(8));
    expect(find.text('Espacio personal'), findsOneWidget);
    expect(find.byKey(const ValueKey('menu')), findsOneWidget);
    expect(
      find.ancestor(
        of: find.text('Impresión'),
        matching: find.byWidgetPredicate(
          (w) => w is Semantics && w.properties.header == true,
        ),
      ),
      findsOneWidget,
    );
  });

  testWidgets('GenSectionHeader: la miga va arriba del título', (t) async {
    await _mount(
      t,
      GenSectionHeader(
        title: 'Archivos',
        breadcrumb: Breadcrumb(rootLabel: 'Cartelería', onRoot: () {}),
      ),
    );
    expect(
      t.getTopLeft(find.text('Cartelería')).dy,
      lessThan(t.getTopLeft(find.text('Archivos')).dy),
    );
  });

  testWidgets('ProjectBreadcrumb: muestra el nombre del proyecto', (t) async {
    final work = WorkDetail.fromJson({
      'id': 'w',
      'name': 'Cartelería del local',
      'code': 'C1',
      'status': 'ACTIVE',
      'access': 'operate',
    });
    await _mount(
      t,
      const ProjectBreadcrumb(workId: 'w'),
      overrides: [workDetailProvider('w').overrideWith((ref) async => work)],
    );
    await t.pump();
    expect(find.text('Cartelería del local'), findsOneWidget);
  });
}
