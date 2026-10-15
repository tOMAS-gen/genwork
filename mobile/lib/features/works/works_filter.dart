import '../../data/models/work.dart';
import '../../core/util/name_order.dart';
import 'works_dashboard.dart';

enum WorksSort { recent, name, progress }

enum WorksView {
  all('Todos los proyectos'),
  mine('Mis proyectos'),
  favorites('Favoritos'),
  archived('Archivados');

  const WorksView(this.label);
  final String label;

  Map<String, String> get queryParameters => switch (this) {
    WorksView.all => const {},
    WorksView.mine => const {'filter': 'mine'},
    WorksView.favorites => const {'filter': 'favorites'},
    WorksView.archived => const {'status': 'ARCHIVED'},
  };

  static WorksView fromUri(Uri uri) {
    if (uri.queryParameters['status'] == 'ARCHIVED') return archived;
    return switch (uri.queryParameters['filter']) {
      'mine' => mine,
      'favorites' => favorites,
      _ => all,
    };
  }
}

/// Vacío = ámbito sin grupo; null = no filtrar. Nunca se usa el nombre como ID.
List<WorkSummary> filterWorks(
  List<WorkSummary> works, {
  required WorksView view,
  String? userId,
  String query = '',
  String? groupId,
  Set<String> groupIds = const {},
  String? sectorId,
  String? labelValueId,
  ProjectStatus? status,
  WorksSort sort = WorksSort.recent,
}) {
  final search = query.trim().toLowerCase();
  return works.where((work) {
    if (work.isTemplate || work.isArchived != (view == WorksView.archived)) {
      return false;
    }
    if (view == WorksView.mine &&
        (userId == null || work.createdById != userId)) {
      return false;
    }
    if (view == WorksView.favorites && !work.isFavorite) return false;
    if (groupId != null && (work.groupId ?? '') != groupId) return false;
    if (groupIds.isNotEmpty && !groupIds.contains(work.groupId ?? '')) {
      return false;
    }
    if (sectorId != null && !work.sectorIds.contains(sectorId)) return false;
    if (labelValueId != null &&
        !work.labels.any((l) => l.valueId == labelValueId)) {
      return false;
    }
    if (status != null &&
        projectStatus(work.progress.done, work.progress.total) != status) {
      return false;
    }
    return search.isEmpty ||
        '${work.name} ${work.description ?? ''} ${work.groupName ?? ''}'
            .toLowerCase()
            .contains(search);
  }).toList()..sort((a, b) {
    if (sort == WorksSort.name) return compareNamesEs(a.name, b.name);
    if (sort == WorksSort.progress) {
      final progress = b.progress.ratio.compareTo(a.progress.ratio);
      return progress == 0 ? compareNamesEs(a.name, b.name) : progress;
    }
    if (a.isFavorite != b.isFavorite) return a.isFavorite ? -1 : 1;
    return b.createdAt.compareTo(a.createdAt);
  });
}
