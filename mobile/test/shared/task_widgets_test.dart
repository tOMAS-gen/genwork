import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/color_contrast.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/shared/widgets/status_chip.dart';
import 'package:genwork_mobile/shared/widgets/task_board.dart';
import 'package:genwork_mobile/shared/widgets/task_composer.dart';
import 'package:genwork_mobile/shared/widgets/task_text_field.dart';
import 'package:genwork_mobile/shared/widgets/task_tile.dart';

Task _task({
  bool done = false,
  bool inDay = false,
  String? due,
  List<Map<String, Object?>> labels = const [],
}) => Task.fromJson({
  'id': 't1',
  'displayText': 'Preparar originales',
  'status': {
    'id': done ? 'done' : 'open',
    'name': done ? 'Hecha' : 'En curso',
    'type': done ? 'FINAL' : 'IN_PROGRESS',
    'color': '#3b5bfa',
  },
  'labels': labels,
  'dueDate': due,
  'myDayAt': inDay ? '2026-10-10T00:00:00Z' : null,
  'canToggle': true,
  'canManageMyDay': true,
});

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
    ProviderScope(
      child: MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: Scaffold(body: SingleChildScrollView(child: body)),
      ),
    ),
  );
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));
  for (final dark in [false, true]) {
    testWidgets('TaskTile: card plana, título 13/400 y chips (dark=$dark)', (
      t,
    ) async {
      await _mount(
        t,
        TaskTile(
          task: _task(due: '2026-10-12', inDay: true),
          referenceIds: const {'t1'},
          onTap: () {},
          onToggleDone: () {},
          onToggleMyDay: () {},
        ),
        dark: dark,
        scale: 1.5,
      );
      expect(t.takeException(), isNull);
      final c = dark ? GenColors.dark : GenColors.light;
      final title = t.widget<Text>(find.text('Preparar originales')).style!;
      expect(title.fontSize, 13);
      expect(title.fontWeight, FontWeight.w400);
      expect(title.color, c.text);
      expect(title.decoration, isNot(TextDecoration.lineThrough));
      expect(find.text('Te mencionan'), findsOneWidget);
      expect(find.byType(Chip), findsNothing);
      final due = find.textContaining('Vence');
      expect(due, findsOneWidget);
      expect(t.widget<Text>(due).style!.fontFamily, 'RobotoMono');
      // Mención + fecha: sin pill de estado con solo dos estados (como la web).
      expect(find.byType(StatusChip), findsNWidgets(2));
      // P04-M5: el sol de una tarea en Mi día va en azul de marca y es lo
      // único visible a la derecha, además del "⋯".
      final day = t.widget<Icon>(find.byKey(const ValueKey('task_in_day_t1')));
      expect(day.color, c.brand);
      expect(find.byKey(const ValueKey('task_more_t1')), findsOneWidget);
      // Card plana: borde `border`, sin sombra.
      final card = t.widget<Card>(find.byType(Card));
      expect(card.clipBehavior, Clip.antiAlias);
    });
  }

  testWidgets('TaskTile: completa tachada y muted', (t) async {
    await _mount(
      t,
      TaskTile(task: _task(done: true), onTap: () {}, onToggleDone: () {}),
    );
    final style = t.widget<Text>(find.text('Preparar originales')).style!;
    expect(style.decoration, TextDecoration.lineThrough);
    expect(style.color, GenColors.light.muted);
  });

  testWidgets('TaskTile: keys intactas y fondos de swipe', (t) async {
    await _mount(
      t,
      TaskTile(
        task: _task(),
        onTap: () {},
        onToggleDone: () {},
        onToggleMyDay: () {},
      ),
    );
    for (final k in [
      'task_t1',
      'task_toggle_t1',
      'task_more_t1',
      'task_swipe_t1',
    ]) {
      expect(find.byKey(ValueKey(k)), findsOneWidget, reason: k);
    }
    // Fuera de Mi día no hay sol a la vista; Mi día va en el "⋯".
    expect(find.byKey(const ValueKey('task_in_day_t1')), findsNothing);
    await t.tap(find.byKey(const ValueKey('task_more_t1')));
    await t.pumpAndSettle();
    expect(find.byKey(const ValueKey('task_day_t1')), findsOneWidget);
    await t.tapAt(Offset.zero);
    await t.pumpAndSettle();
    final c = GenColors.light;
    final tile = find.byKey(const ValueKey('task_swipe_t1'));
    await t.drag(tile, const Offset(120, 0));
    await t.pump();
    final complete = t
        .widgetList<Container>(find.byType(Container))
        .map((w) => w.decoration)
        .whereType<BoxDecoration>()
        .where((d) => d.color == c.success);
    expect(complete, isNotEmpty);
    expect(appContrastRatio(readableOn(c.success), c.success), greaterThan(7));
    await t.pumpAndSettle();
    await t.drag(tile, const Offset(-120, 0));
    await t.pump();
    final day = t
        .widgetList<Container>(find.byType(Container))
        .map((w) => w.decoration)
        .whereType<BoxDecoration>()
        .where((d) => d.color == c.brandFill);
    expect(day, isNotEmpty);
    await t.pumpAndSettle();
  });

  testWidgets('TaskTextController: color por símbolo y w600', (t) async {
    final controller = TaskTextController(
      text: '/Proyecto #Sector @Ref \$Etiqueta 10/10/2026 libre',
    );
    addTearDown(controller.dispose);
    await _mount(t, TextField(controller: controller));
    final span = controller.buildTextSpan(
      context: t.element(find.byType(TextField)),
      withComposing: false,
    );
    final c = GenColors.light;
    final parts = span.children!
        .whereType<TextSpan>()
        .where((s) => s.style?.fontWeight == FontWeight.w600)
        .map((s) => (s.text, s.style!.color))
        .toList();
    expect(parts, [
      ('/Proyecto', c.tagWorkText),
      ('#Sector', c.tagExecText),
      ('@Ref', c.tagRefText),
      (r'$Etiqueta', c.tagLabelText),
      ('10/10/2026', c.dueText),
    ]);
  });

  testWidgets(
    'TaskComposer: enviar es IconButton.filled y el spinner usa brand',
    (t) async {
      final sending = Future<bool>.delayed(
        const Duration(seconds: 1),
        () => true,
      );
      await _mount(
        t,
        TaskComposer(onSubmit: (_) => sending, hint: 'Nueva tarea…'),
      );
      final send = find.byKey(const ValueKey('task_composer_send'));
      expect(t.getSize(send).shortestSide, greaterThanOrEqualTo(40));
      expect(find.byType(CircularProgressIndicator), findsNothing);
      await t.enterText(
        find.byKey(const ValueKey('task_composer_field')),
        'Hacer algo',
      );
      await t.tap(send);
      await t.pump();
      final spinner = t.widget<CircularProgressIndicator>(
        find.byType(CircularProgressIndicator),
      );
      expect(spinner.color, GenColors.light.brand);
      expect(spinner.strokeWidth, 2);
      expect(t.getSize(find.byType(CircularProgressIndicator)).width, 18);
      await t.pump(const Duration(seconds: 2));
      await t.pumpAndSettle();
      expect(find.byType(CircularProgressIndicator), findsNothing);
    },
  );

  Task parent() => Task.fromJson({
    'id': 'p',
    'displayText': 'Preparar los originales',
    'status': {'id': 'open', 'name': 'En curso', 'type': 'IN_PROGRESS'},
    'canToggle': true,
    'canManageMyDay': true,
    'subtaskCount': 2,
    'subtaskDone': 1,
    'subtasks': [
      {
        'id': 's1',
        'displayText': 'Revisar medidas',
        'status': {'id': 'done', 'name': 'Hecha', 'type': 'FINAL'},
        'canToggle': true,
      },
      {
        'id': 's2',
        'displayText': 'Confirmar colores',
        'status': {'id': 'open', 'name': 'En curso', 'type': 'IN_PROGRESS'},
        'canToggle': true,
      },
    ],
  });

  testWidgets('TaskTile: flecha, "1/2" debajo y acciones en el "⋯" (P04, T3)', (
    t,
  ) async {
    var added = 0, deleted = 0;
    await _mount(
      t,
      TaskTile(
        task: parent(),
        onTap: () {},
        onToggleDone: () {},
        onToggleMyDay: () {},
        onAddSubtask: () => added++,
        onDelete: () => deleted++,
        onSubtaskToggle: (_) {},
      ),
    );
    // Una tarea con subtareas no lleva casilla: su estado sale de las hijas.
    expect(find.byKey(const ValueKey('task_toggle_p')), findsNothing);
    expect(find.byKey(const ValueKey('task_expand_p')), findsOneWidget);
    // El contador va en 12 gris debajo del título, no como insignia.
    final count = t.widget<Text>(find.text('1/2'));
    expect(count.style!.fontSize, 12);
    expect(count.style!.color, GenColors.light.muted);
    expect(
      t.getTopLeft(find.text('1/2')).dy,
      greaterThan(t.getBottomLeft(find.text('Preparar los originales')).dy - 1),
    );
    expect(find.text('1/2 subtareas'), findsNothing);
    // Agregar subtarea y eliminar, dentro del "⋯" (mismas claves).
    expect(find.byKey(const ValueKey('task_add_subtask_p')), findsNothing);
    await t.tap(find.byKey(const ValueKey('task_more_p')));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('task_add_subtask_p')));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('task_more_p')));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('task_delete_p')));
    await t.pumpAndSettle();
    expect((added, deleted), (1, 1));
    // La flecha pliega y despliega las subtareas.
    expect(find.text('Confirmar colores'), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('task_expand_p')));
    await t.pumpAndSettle();
    expect(find.text('Confirmar colores'), findsNothing);
    await t.tap(find.byKey(const ValueKey('task_expand_p')));
    await t.pumpAndSettle();
    expect(find.text('Confirmar colores'), findsOneWidget);
    // Las subtareas no tienen "+" (no hay subtareas de subtareas).
    expect(find.byKey(const ValueKey('task_add_subtask_s2')), findsNothing);
  });

  // T3: a 360 dp, con todas las acciones y en Mi día, el texto conserva
  // ≥160 dp de ancho.
  testWidgets('TaskTile a 360 dp deja ≥160 dp para el texto (T3)', (t) async {
    await _mount(
      t,
      TaskTile(
        task: _task(inDay: true),
        onTap: () {},
        onToggleDone: () {},
        onToggleMyDay: () {},
        onAddSubtask: () {},
        onDelete: () {},
      ),
    );
    final text = find.text('Preparar originales');
    final column = find.ancestor(of: text, matching: find.byType(Expanded));
    expect(t.getSize(column.first).width, greaterThanOrEqualTo(160));
    await expectLater(t, meetsGuideline(androidTapTargetGuideline));
  });

  // El tablero vive dentro del `ExpansionTile` de un objetivo, que guarda su
  // estado (bool) en PageStorage con su clave. Sin clave propia, el scroll del
  // tablero leía ese bool como offset y fallaba al volver a expandir.
  testWidgets(
    'TaskBoard dentro de un objetivo plegable no choca en PageStorage',
    (t) async {
      await t.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: ExpansionTile(
                key: const PageStorageKey('work_section_o1'),
                initiallyExpanded: true,
                title: const Text('Objetivo'),
                children: [
                  TaskBoard(
                    tasks: [_task()],
                    itemBuilder: (task) => Text(task.displayText),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await t.tap(find.text('Objetivo'));
      await t.pumpAndSettle();
      await t.tap(find.text('Objetivo'));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      expect(find.byType(TaskBoard), findsOneWidget);
    },
  );
}
