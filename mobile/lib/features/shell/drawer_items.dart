import '../../core/util/name_order.dart';
import '../../data/models/sector.dart';
import '../../data/models/work.dart';
import '../../data/models/group.dart';

const drawerItemLimit = 10;

class DrawerItem {
  const DrawerItem({
    required this.id,
    required this.name,
    required this.pending,
    this.subtitle,
    this.color,
  });
  final String id;
  final String name;
  final String? subtitle;
  final String? color;
  final int pending;

  factory DrawerItem.work(WorkSummary work) => DrawerItem(
    id: work.id,
    name: work.name,
    subtitle: work.groupName,
    pending: work.pendingCount,
    color: work.color,
  );

  factory DrawerItem.group(GroupSummary group) => DrawerItem(
    id: group.id,
    name: group.name,
    pending: group.pendingCount,
    color: group.color,
  );

  factory DrawerItem.sector(SectorSummary sector) => DrawerItem(
    id: sector.id,
    name: sector.name,
    subtitle: sector.scope.kind == ScopeKind.personal
        ? null
        : sector.scope.label,
    pending: sector.pending,
    color: sector.color,
  );
}

/// Total sobre todos los elementos, aunque el drawer muestre solo los diez
/// primeros. El índice preserva el orden original en empates completos.
({List<DrawerItem> items, int total}) orderDrawerItems(
  Iterable<DrawerItem> items,
) {
  final indexed = items.indexed.toList()
    ..sort((a, b) {
      final pending = b.$2.pending.compareTo(a.$2.pending);
      if (pending != 0) return pending;
      final name = compareNamesEs(a.$2.name, b.$2.name);
      return name != 0 ? name : a.$1.compareTo(b.$1);
    });
  return (
    items: indexed.map((entry) => entry.$2).toList(),
    total: indexed.fold(0, (sum, entry) => sum + entry.$2.pending),
  );
}
