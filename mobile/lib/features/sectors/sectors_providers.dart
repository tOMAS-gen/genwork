import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/sector.dart';

final sectorsProvider = FutureProvider.autoDispose<List<SectorSummary>>(
  (ref) => ref.watch(sectorsRepositoryProvider).list(),
);

/// Tablero de sector. `done`: null = todas, false = pendientes, true = hechas.
typedef SectorBoardQuery = ({String id, bool? done});

final sectorBoardProvider = FutureProvider.autoDispose
    .family<SectorBoard, SectorBoardQuery>(
      (ref, q) =>
          ref.watch(sectorsRepositoryProvider).board(q.id, done: q.done),
    );
