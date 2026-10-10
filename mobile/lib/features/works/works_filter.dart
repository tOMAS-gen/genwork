import '../../data/models/work.dart';

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
    return search.isEmpty ||
        '${work.name} ${work.description ?? ''} ${work.groupName ?? ''}'
            .toLowerCase()
            .contains(search);
  }).toList()..sort((a, b) {
    if (a.isFavorite != b.isFavorite) return a.isFavorite ? -1 : 1;
    return b.createdAt.compareTo(a.createdAt);
  });
}
