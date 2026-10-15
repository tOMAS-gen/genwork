import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/group.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import '../works/works_providers.dart';
import 'groups_providers.dart';

/// También protege el acceso directo por ruta antes de consultar datos de administración.
class GroupAdminScaffold extends ConsumerWidget {
  const GroupAdminScaffold({
    super.key,
    required this.groupId,
    required this.title,
    required this.builder,
  });
  final String groupId, title;
  final Widget Function(GroupSummary group) builder;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(groupProvider(groupId));
    final user = ref.watch(currentUserProvider);
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: value.hasError
          ? ErrorView(
              error: value.error!,
              onRetry: () => ref.invalidate(groupsProvider),
            )
          : AsyncValueView(
              value: value,
              onRetry: () => ref.invalidate(groupsProvider),
              data: (group) => group?.canManage(user) == true
                  ? builder(group!)
                  : const EmptyView(
                      message: 'No tenés permiso para administrar este grupo.',
                    ),
            ),
    );
  }
}
