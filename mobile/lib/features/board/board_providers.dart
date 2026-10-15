import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/board.dart';

final boardProvider = FutureProvider.autoDispose<List<BoardColumn>>(
  (ref) => ref.watch(boardRepositoryProvider).list(),
);
