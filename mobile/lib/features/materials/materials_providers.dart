import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/material.dart';

final workMaterialsProvider = FutureProvider.autoDispose
    .family<List<WorkMaterial>, String>(
      (ref, workId) => ref.watch(materialsRepositoryProvider).forWork(workId),
    );

final materialTotalsProvider = FutureProvider.autoDispose<List<MaterialTotal>>(
  (ref) => ref.watch(materialsRepositoryProvider).totals(),
);
