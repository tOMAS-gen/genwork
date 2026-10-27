import 'package:flutter/painting.dart';

import '../../core/theme/gen_colors.dart';
import '../../core/util/name_order.dart';
import '../../data/models/common.dart';
import '../../data/models/task.dart';
import '../../data/models/work.dart';

/// Estado de un proyecto según sus tareas, igual que `getProjectStatus` de la
/// web: sin tareas completadas (o sin tareas) es pendiente; todas completadas,
/// completado; el resto, en progreso.
enum ProjectStatus { pending, inProgress, completed }

ProjectStatus projectStatus(int done, int total) {
  if (done == 0 || total == 0) return ProjectStatus.pending;
  if (done == total) return ProjectStatus.completed;
  return ProjectStatus.inProgress;
}

/// Totales y porcentajes de la barra de estadísticas del dashboard.
class WorksStats {
  const WorksStats({
    required this.total,
    required this.inProgress,
    required this.completed,
    required this.pending,
  });

  factory WorksStats.of(List<WorkSummary> works) {
    var inProgress = 0, completed = 0, pending = 0;
    for (final work in works) {
      switch (projectStatus(work.progress.done, work.progress.total)) {
        case ProjectStatus.completed:
          completed++;
        case ProjectStatus.inProgress:
          inProgress++;
        case ProjectStatus.pending:
          pending++;
      }
    }
    return WorksStats(
      total: works.length,
      inProgress: inProgress,
      completed: completed,
      pending: pending,
    );
  }

  final int total, inProgress, completed, pending;

  int pct(int n) => total > 0 ? (n / total * 100).round() : 0;
}

enum DueTone { neutral, warning, danger }

/// Urgencia de una fecha límite (D5): con más de 3 días, neutro; de hoy a 3
/// días, ámbar; vencido, rojo. Solo cuenta la fecha.
({String label, String short, DueTone tone}) dueUrgency(
  DateTime due,
  DateTime now,
) {
  final days = DateTime(
    due.year,
    due.month,
    due.day,
  ).difference(DateTime(now.year, now.month, now.day)).inDays;
  final label = days < 0
      ? 'Vencido'
      : days == 0
      ? 'Vence hoy'
      : '$days días restantes';
  // Para una línea de meta («29 oct · 3 días», P05-M3).
  final short = days < 0
      ? 'Vencido'
      : days == 0
      ? 'Hoy'
      : days == 1
      ? '1 día'
      : '$days días';
  final tone = days > 3
      ? DueTone.neutral
      : days >= 0
      ? DueTone.warning
      : DueTone.danger;
  return (label: label, short: short, tone: tone);
}

/// Color del texto de urgencia: gris, ámbar o rojo.
Color dueToneColor(GenColors c, DueTone tone) => switch (tone) {
  DueTone.neutral => c.muted,
  DueTone.warning => c.warningText,
  DueTone.danger => c.dangerText,
};

/// Colores de un estado de proyecto, iguales en todas las pantallas (D5):
/// pendiente neutro, en curso azul y terminado verde.
({Color text, Color fill}) projectStatusColors(
  GenColors c,
  ProjectStatus status,
) => switch (status) {
  ProjectStatus.pending => (text: c.muted, fill: c.hover),
  ProjectStatus.inProgress => (text: c.brand, fill: c.brandFill),
  ProjectStatus.completed => (text: c.successText, fill: c.successFill),
};

/// Color del proyecto a partir de sus etiquetas (igual que `WorkSummary.color`):
/// la etiqueta principal o, si no hay, la primera por nombre de clave.
String? projectColor(List<LabelChip> labels) {
  if (labels.isEmpty) return null;
  final primary = labels.where((label) => label.isPrimary).firstOrNull;
  if (primary != null) return primary.color;
  final sorted = [...labels]
    ..sort((a, b) => compareNamesEs(a.keyName, b.keyName));
  return sorted.first.color;
}

/// Avance de un grupo de tareas contando hojas, como la web: una tarea con
/// subtareas aporta sus subtareas, no ella misma.
({int done, int total}) leafProgress(List<Task> tasks) {
  var done = 0, total = 0;
  for (final t in tasks) {
    if (t.subtaskCount > 0) {
      done += t.subtaskDone;
      total += t.subtaskCount;
    } else {
      total += 1;
      if (t.isDone) done += 1;
    }
  }
  return (done: done, total: total);
}
