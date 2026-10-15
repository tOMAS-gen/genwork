import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/common.dart';
import 'package:genwork_mobile/shared/widgets/count_badge.dart';
import 'package:genwork_mobile/shared/widgets/progress_line.dart';

Future<void> _mount(WidgetTester t, Widget body, {bool dark = false}) =>
    t.pumpWidget(
      MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        home: Scaffold(body: Center(child: body)),
      ),
    );

void main() {
  testWidgets('CountBadge: oculto en 0, tope 999+ y estilo pill', (t) async {
    await _mount(t, const CountBadge(count: 0));
    expect(find.byType(Container), findsNothing);
    await _mount(t, const CountBadge(count: 7));
    expect(find.text('7'), findsOneWidget);
    final deco =
        t
                .widget<Container>(
                  find.descendant(
                    of: find.byType(CountBadge),
                    matching: find.byType(Container),
                  ),
                )
                .decoration!
            as BoxDecoration;
    expect(deco.color, GenColors.light.hover);
    expect((deco.border! as Border).top.color, GenColors.light.border);
    expect(deco.borderRadius!.resolve(TextDirection.ltr).topLeft.x, 999);
    await _mount(t, const CountBadge(count: 1000));
    expect(find.text('999+'), findsOneWidget);
    await _mount(t, const CountBadge(count: 999));
    expect(find.text('999'), findsOneWidget);
  });

  testWidgets('CountBadge: una sola frase para el lector de pantalla', (
    t,
  ) async {
    final handle = t.ensureSemantics();
    await _mount(
      t,
      const CountBadge(
        count: 2,
        singular: 'aviso pendiente',
        plural: 'avisos pendientes',
      ),
    );
    expect(find.bySemanticsLabel('2 avisos pendientes'), findsOneWidget);
    handle.dispose();
  });

  for (final dark in [false, true]) {
    testWidgets('ProgressLine: track outline, relleno ok o brand '
        '(dark=$dark)', (t) async {
      final c = dark ? GenColors.dark : GenColors.light;
      await _mount(
        t,
        const SizedBox(
          width: 300,
          child: ProgressLine(progress: Progress(done: 3, total: 5)),
        ),
        dark: dark,
      );
      var bar = t.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(bar.value, .6);
      expect(bar.minHeight, 4);
      expect(bar.color, c.ok);
      expect(bar.backgroundColor, c.outline);
      expect(find.text('3/5'), findsOneWidget);
      final label = t.widget<Text>(find.text('3/5')).style!;
      expect(label.fontFamily, 'RobotoMono');
      expect(label.fontSize, 12);
      expect(label.color, c.muted);
      await _mount(
        t,
        const SizedBox(
          width: 300,
          child: ProgressLine(
            progress: Progress(done: 0, total: 0),
            emphasis: true,
          ),
        ),
        dark: dark,
      );
      bar = t.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(bar.color, c.brand);
      expect(bar.value, 0);
    });
  }

  testWidgets('ProgressLine: semántica "3 de 5 tareas completadas"', (t) async {
    final handle = t.ensureSemantics();
    await _mount(
      t,
      const SizedBox(
        width: 300,
        child: ProgressLine(progress: Progress(done: 3, total: 5)),
      ),
    );
    expect(find.bySemanticsLabel('3 de 5 tareas completadas'), findsOneWidget);
    handle.dispose();
  });
}
