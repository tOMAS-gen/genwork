import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/util/format.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/name_order.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/name_color_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../../data/models/app_user.dart';
import '../shell/resource_refresh.dart';
import '../works/works_providers.dart';
import 'groups_providers.dart';

class GroupsListScreen extends ConsumerStatefulWidget {
  const GroupsListScreen({super.key});
  @override
  ConsumerState<GroupsListScreen> createState() => _GroupsListScreenState();
}

class _GroupsListScreenState extends ConsumerState<GroupsListScreen> {
  String _search = '';
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leading: const AppDrawerButton(),
      title: const Text('Grupos'),
    ),
    floatingActionButton:
        [
          GlobalRole.superadmin,
          GlobalRole.member,
        ].contains(ref.watch(currentUserProvider)?.role)
        ? FloatingActionButton(
            key: const ValueKey('create_group'),
            tooltip: 'Nuevo grupo',
            child: const Icon(Icons.add),
            onPressed: () async {
              final repository = ref.read(groupsRepositoryProvider);
              String? id;
              final saved = await showNameColorDialog(
                context,
                title: 'Nuevo grupo',
                withColor: true,
                onSave: (name, color) async {
                  id = await repository.create(name: name, color: color);
                },
              );
              if (saved && context.mounted) {
                refreshGroups(ref);
                context.push(Routes.group(id!));
              }
            },
          )
        : null,
    body: AsyncValueView(
      value: ref.watch(groupsProvider),
      onRetry: () => ref.invalidate(groupsProvider),
      data: (groups) {
        final filtered =
            groups.where((g) => g.name.toLowerCase().contains(_search)).toList()
              ..sort((a, b) => compareNamesEs(a.name, b.name));
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(groupWorksProvider);
            ref.invalidate(groupsProvider);
            await ref.read(groupsProvider.future);
          },
          child: ListView(
            key: const ValueKey('groups_list'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: AppSpace.list,
            children: [
              TextField(
                key: const ValueKey('groups_search'),
                decoration: const InputDecoration(
                  labelText: 'Buscar grupos',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (v) =>
                    setState(() => _search = v.trim().toLowerCase()),
              ),
              const SizedBox(height: AppSpace.md),
              if (filtered.isEmpty)
                const EmptyView(message: 'No hay grupos que coincidan'),
              for (final group in filtered)
                Card(
                  child: ListTile(
                    key: ValueKey('group_${group.id}'),
                    leading: ColorDot(hex: group.color),
                    title: Text(group.name),
                    subtitle: Text(
                      '${countLabel(group.members.length, 'miembro', 'miembros')} · ${countLabel(group.workCount, 'proyecto', 'proyectos')}\n${countLabel(group.pendingCount, 'pendiente', 'pendientes')}${group.publicRead ? ' · Lectura para no miembros' : ''}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push(Routes.group(group.id)),
                  ),
                ),
              const SizedBox(height: AppSpace.bottomClearance),
            ],
          ),
        );
      },
    ),
  );
}
