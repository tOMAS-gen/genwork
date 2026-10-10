import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/features/works/work_card.dart';
import 'package:genwork_mobile/features/works/works_dashboard.dart';
import 'package:intl/date_symbol_data_local.dart';

WorkSummary _work(
  String id, {
  int done = 0,
  int total = 0,
  String? due,
  bool favorite = false,
  String? group,
  List<Map<String, Object?>> labels = const [],
}) => WorkSummary.fromJson({
  'id': id,
  'name': 'Proyecto $id',
  'groupName': group,
  'groupId': group == null ? null : 'g',
  'isFavorite': favorite,
  'dueDate': due,
  'taskCounts': {'done': done, 'total': total},
  'labels': labels,
});

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  test('projectStatus replica getProjectStatus de la web', () {
    expect(projectStatus(0, 0), ProjectStatus.pending);
    expect(projectStatus(0, 5), ProjectStatus.pending);
    expect(projectStatus(5, 5), ProjectStatus.completed);
    expect(projectStatus(2, 5), ProjectStatus.inProgress);
  });

  test('WorksStats cuenta por estado y redondea los porcentajes', () {
    final stats = WorksStats.of([
      _work('a'),
      _work('b', done: 3, total: 3),
      _work('c', done: 1, total: 6),
    ]);
    expect(
      (stats.total, stats.pending, stats.completed, stats.inProgress),
      (3, 1, 1, 1),
    );
    expect(stats.pct(stats.completed), 33);
    expect(WorksStats.of([]).pct(0), 0);
  });

  test('dueUrgency: >7 verde, 1–7 naranja, hoy/vencido rojo', () {
    final now = DateTime(2026, 10, 10, 18);
    expect(dueUrgency(DateTime(2026, 10, 25), now).tone, DueTone.green);
    expect(dueUrgency(DateTime(2026, 10, 25), now).label, '15 días restantes');
    expect(
      dueUrgency(DateTime(2026, 10, 18), now).tone,
      DueTone.green,
    ); // 8 días
    expect(dueUrgency(DateTime(2026, 10, 17), now).tone, DueTone.orange); // 7
    expect(dueUrgency(DateTime(2026, 10, 11), now).tone, DueTone.orange);
    expect(dueUrgency(DateTime(2026, 10, 10), now).tone, DueTone.red);
    expect(dueUrgency(DateTime(2026, 10, 10), now).label, 'Vence hoy');
    expect(dueUrgency(DateTime(2026, 10, 9), now).label, 'Vencido');
  });

  for (final dark in [false, true]) {
    testWidgets('WorkCard: píldora, grupo, avance y conteo (dark=$dark)', (
      t,
    ) async {
      t.view.physicalSize = const Size(360, 800);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      var tapped = 0, fav = 0;
      Widget card(WorkSummary w) => MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child!,
        ),
        home: Scaffold(
          body: SingleChildScrollView(
            child: WorkCard(
              work: w,
              now: DateTime(2026, 10, 10),
              onTap: () => tapped++,
              onFavorite: () => fav++,
            ),
          ),
        ),
      );
      await t.pumpWidget(
        card(_work('a', done: 3, total: 4, group: 'Diseño', due: '2026-10-12')),
      );
      expect(t.takeException(), isNull);
      final c = dark ? GenColors.dark : GenColors.light;
      expect(find.text('PROYECTO A'), findsOneWidget);
      expect(find.text('Grupo Diseño'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      expect(find.text('3/4 tareas'), findsOneWidget);
      expect(find.textContaining('Entrega:'), findsOneWidget);
      final remaining = t.widget<Text>(find.text('2 días restantes'));
      expect(remaining.style!.color, c.warning);
      expect(remaining.style!.fontStyle, FontStyle.italic);
      final bar = t.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(
        (bar.minHeight, bar.color, bar.backgroundColor),
        (8, c.ok, c.border),
      );
      await t.tap(find.byKey(const ValueKey('work_a')));
      await t.tap(find.byKey(const ValueKey('work_favorite_a')));
      expect((tapped, fav), (1, 1));
    });
  }

  testWidgets('WorkCard: sin tareas y personal', (t) async {
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: WorkCard(work: _work('b'), onTap: () {}, onFavorite: () {}),
        ),
      ),
    );
    expect(find.text('Personal'), findsOneWidget);
    expect(find.text('Sin tareas todavía'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
  });
}
