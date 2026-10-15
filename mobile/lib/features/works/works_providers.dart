import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/group.dart';
import '../../data/models/work.dart';
import '../../data/models/work_catalog.dart';

/// Proyectos activos (`false`) o archivados (`true`).
final worksListProvider = FutureProvider.autoDispose
    .family<List<WorkSummary>, bool>(
      (ref, archived) =>
          ref.watch(worksRepositoryProvider).list(archived: archived),
    );

final workDetailProvider = FutureProvider.autoDispose
    .family<WorkDetail, String>(
      (ref, id) => ref.watch(worksRepositoryProvider).detail(id),
    );

final groupsProvider = FutureProvider.autoDispose<List<GroupSummary>>(
  (ref) => ref.watch(groupsRepositoryProvider).list(),
);

final workStagesProvider = FutureProvider.autoDispose
    .family<List<WorkStage>, String?>(
      (ref, groupId) => ref.watch(worksRepositoryProvider).stages(groupId),
    );
final workLabelsProvider = FutureProvider.autoDispose
    .family<List<LabelOption>, String?>(
      (ref, groupId) => ref.watch(worksRepositoryProvider).labels(groupId),
    );
