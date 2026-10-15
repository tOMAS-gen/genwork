import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/repositories/files_repository.dart';

final filesRepositoryProvider = Provider(
  (ref) => FilesRepository(ref.watch(apiClientProvider)),
);
final workFilesProvider = FutureProvider.autoDispose.family(
  (ref, ({String id, String path}) key) =>
      ref.watch(filesRepositoryProvider).list(key.id, key.path),
);
final fileSharesProvider = FutureProvider.autoDispose.family(
  (ref, ({String id, String path}) key) =>
      ref.watch(filesRepositoryProvider).shares(key.id, key.path),
);
