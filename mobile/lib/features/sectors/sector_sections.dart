import '../../core/util/name_order.dart';
import '../../data/models/sector.dart';

enum SectorSort {
  name('Nombre · A–Z'),
  pending('Más pendientes'),
  total('Más tareas'),
  progress('Mayor avance');

  const SectorSort(this.label);
  final String label;
}

String sectorScopeKey(SectorScope scope) => switch (scope.kind) {
  ScopeKind.global => 'scope:global',
  ScopeKind.personal => 'scope:personal',
  ScopeKind.group =>
    scope.groupId == null ? 'scope:global' : 'group:${scope.groupId}',
};

class SectorSection {
  SectorSection(this.scope, this.sectors);
  final SectorScope scope;
  final List<SectorSummary> sectors;
  String get key => sectorScopeKey(scope);
  String get title => scope.label;
  int get pending => sectors.fold(0, (n, s) => n + s.pending);
  int get total => sectors.fold(0, (n, s) => n + s.total);
  int get done => sectors.fold(0, (n, s) => n + s.done);
}

double _ratio(int done, int total) => total == 0 ? 0 : done / total;
int _metric(
  SectorSort sort,
  int aPending,
  int aTotal,
  int aDone,
  int bPending,
  int bTotal,
  int bDone,
) => switch (sort) {
  SectorSort.name => 0,
  SectorSort.pending => bPending.compareTo(aPending),
  SectorSort.total => bTotal.compareTo(aTotal),
  SectorSort.progress => _ratio(bDone, bTotal).compareTo(_ratio(aDone, aTotal)),
};
int _rank(ScopeKind kind) => switch (kind) {
  ScopeKind.global => 0,
  ScopeKind.group => 1,
  ScopeKind.personal => 2,
};
List<SectorSection> sectorSections(
  List<SectorSummary> sectors, {
  String search = '',
  String scopeKey = '',
  SectorSort sort = SectorSort.name,
}) {
  final groups = <String, SectorSection>{};
  for (final sector in sectors) {
    final key = sectorScopeKey(sector.scope);
    if (!sector.name.toLowerCase().contains(search.trim().toLowerCase()) ||
        (scopeKey.isNotEmpty && key != scopeKey)) {
      continue;
    }
    (groups[key] ??= SectorSection(sector.scope, [])).sectors.add(sector);
  }
  for (final group in groups.values) {
    group.sectors.sort((a, b) {
      final result = _metric(
        sort,
        a.pending,
        a.total,
        a.done,
        b.pending,
        b.total,
        b.done,
      );
      return result != 0 ? result : compareNamesEs(a.name, b.name);
    });
  }
  return groups.values.toList()..sort((a, b) {
    final metric = _metric(
      sort,
      a.pending,
      a.total,
      a.done,
      b.pending,
      b.total,
      b.done,
    );
    if (metric != 0) return metric;
    final rank = _rank(a.scope.kind).compareTo(_rank(b.scope.kind));
    if (rank != 0) return rank;
    final name = compareNamesEs(a.title, b.title);
    return name != 0 ? name : a.key.compareTo(b.key);
  });
}
