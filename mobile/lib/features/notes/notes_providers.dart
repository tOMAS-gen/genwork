import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/note.dart';

final notesProvider = FutureProvider.autoDispose<List<Note>>((ref) => ref.watch(notesRepositoryProvider).list());

final noteProvider = FutureProvider.autoDispose.family<Note, String>(
  (ref, id) => ref.watch(notesRepositoryProvider).get(id),
);
