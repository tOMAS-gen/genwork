import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/json.dart';
import '../../data/models/portal.dart';
import '../../data/repositories/portal_repository.dart';

final portalRepositoryProvider = Provider(
  (ref) => PortalRepository(ref.watch(apiClientProvider)),
);
final portalWorksProvider = FutureProvider.autoDispose<List<PortalWork>>(
  (ref) => ref.watch(portalRepositoryProvider).list(),
);
final portalWorkProvider = FutureProvider.autoDispose
    .family<PortalWork, String>(
      (ref, id) => ref.watch(portalRepositoryProvider).detail(id),
    );
typedef PortalActivityQuery = ({String id, String? cursor});
final portalActivityProvider = FutureProvider.autoDispose
    .family<Json, PortalActivityQuery>(
      (ref, q) =>
          ref.watch(portalRepositoryProvider).activity(q.id, cursor: q.cursor),
    );
