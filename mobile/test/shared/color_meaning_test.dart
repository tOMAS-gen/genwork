// Color con significado (spec 066, tarea 15, D5 y PS7): el progreso es azul
// de 4 dp y verde solo al 100 %, los estados de proyecto usan el mismo color
// en todas las pantallas y el verde no marca "recordatorio individual".
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/reminder.dart';
import 'package:genwork_mobile/features/reminders/reminder_scope_color.dart';
import 'package:genwork_mobile/features/works/works_dashboard.dart';
import 'package:genwork_mobile/shared/widgets/card_progress.dart';
import 'package:genwork_mobile/shared/widgets/progress_bar.dart';

void main() {
  testWidgets('CardProgress: barra de 4 dp azul; verde solo al 100 %', (
    t,
  ) async {
    final c = GenColors.light;
    for (final (done, color) in [(1, c.brand), (4, c.ok)]) {
      await t.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Scaffold(body: CardProgress(done: done, total: 4)),
        ),
      );
      final bar = t.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(
        (bar.minHeight, bar.color, bar.backgroundColor),
        (4, color, c.outline),
      );
    }
  });

  test('progressColor: azul hasta el 100 %, verde al completar', () {
    for (final c in [GenColors.light, GenColors.dark]) {
      expect(progressColor(c, 0), c.brand);
      expect(progressColor(c, .99), c.brand);
      expect(progressColor(c, 1), c.ok);
    }
  });

  test('las barras de avance usan ProgressBar en todas las pantallas', () {
    final raw = <String>[];
    for (final f in Directory('lib').listSync(recursive: true)) {
      if (f is! File || !f.path.endsWith('.dart')) continue;
      if (f.path.endsWith('progress_bar.dart')) continue;
      final src = f.readAsStringSync();
      // Barras con valor (no las de carga indeterminada ni de subida).
      for (final m in RegExp(
        r'LinearProgressIndicator\(\s*value:[^,]*(done|ratio|pct)',
      ).allMatches(src)) {
        raw.add('${f.path}: ${m.group(0)}');
      }
    }
    expect(raw, isEmpty);
  });

  test(
    'estado de proyecto: pendiente neutro, en curso azul, terminado verde',
    () {
      for (final c in [GenColors.light, GenColors.dark]) {
        expect(projectStatusColors(c, ProjectStatus.pending).text, c.muted);
        expect(projectStatusColors(c, ProjectStatus.inProgress).text, c.brand);
        expect(
          projectStatusColors(c, ProjectStatus.inProgress).fill,
          c.brandFill,
        );
        expect(
          projectStatusColors(c, ProjectStatus.completed).text,
          c.successText,
        );
      }
    },
  );

  testWidgets('el verde no marca el recordatorio individual (P21-M2)', (
    t,
  ) async {
    late Color individual;
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Builder(
          builder: (context) {
            individual = reminderScopeColor(context, ReminderScope.individual);
            return const SizedBox();
          },
        ),
      ),
    );
    final c = GenColors.light;
    expect(individual, isNot(anyOf(c.success, c.ok, c.successText)));
  });
}
