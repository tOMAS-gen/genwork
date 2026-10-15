import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/group.dart';
import '../../data/models/work.dart';
import '../works/works_providers.dart';

final groupProvider = Provider.autoDispose
    .family<AsyncValue<GroupSummary?>, String>(
      (ref, id) => ref
          .watch(groupsProvider)
          .whenData((groups) => groups.where((g) => g.id == id).firstOrNull),
    );
final groupWorksProvider = FutureProvider.autoDispose
    .family<List<WorkSummary>, String>(
      (ref, id) => ref.watch(worksRepositoryProvider).list(groupId: id),
    );
final groupClientsProvider = FutureProvider.autoDispose
    .family<GroupClients, String>(
      (ref, id) => ref.watch(groupsRepositoryProvider).clients(id),
    );
final groupLabelsProvider = FutureProvider.autoDispose
    .family<List<GroupLabel>, String>(
      (ref, id) => ref.watch(groupsRepositoryProvider).labels(id),
    );
final memberSearchProvider = FutureProvider.autoDispose
    .family<List<GroupMember>, ({String id, String query})>((ref, q) async {
      if (q.query.trim().length < 2) return [];
      return ref
          .watch(groupsRepositoryProvider)
          .searchMembers(q.id, q.query.trim());
    });
