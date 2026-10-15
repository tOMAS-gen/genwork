import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/repositories/catalogs_repository.dart';

final catalogsRepositoryProvider = Provider(
  (ref) => CatalogsRepository(ref.watch(apiClientProvider)),
);
final catalogDataProvider = FutureProvider.autoDispose
    .family<Object?, CatalogQuery>(
      (ref, query) => ref.watch(catalogsRepositoryProvider).read(query),
    );
