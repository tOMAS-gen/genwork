import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/color_contrast.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/shared/widgets/status_chip.dart';
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
      // El ícono de Mi día va en ámbar (`warning`) cuando está marcado, como la web.
      final day = t.widget<Icon>(
        find.descendant(
          of: find.byKey(const ValueKey('task_day_t1')),
          matching: find.byType(Icon),
        ),
      );
      expect(day.color, c.warning);
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
      'task_day_t1',
      'task_swipe_t1',
    ]) {
      expect(find.byKey(ValueKey(k)), findsOneWidget, reason: k);
    }
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
}
