import '../../core/util/name_order.dart';
import '../../data/models/common.dart';
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

enum DueTone { green, orange, red }

/// Urgencia de una fecha límite, como `getDueDateUrgency` de la web: más de 7
/// días, verde; de 1 a 7, naranja; hoy o vencido, rojo. Solo cuenta la fecha.
({String label, DueTone tone}) dueUrgency(DateTime due, DateTime now) {
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
  final tone = days > 7
      ? DueTone.green
      : days >= 1
      ? DueTone.orange
      : DueTone.red;
  return (label: label, tone: tone);
}

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
