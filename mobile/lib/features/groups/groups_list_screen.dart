import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../core/util/name_order.dart';
import '../../data/models/app_user.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/name_color_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import '../works/works_providers.dart';
import 'groups_providers.dart';
import '../../shared/widgets/status_chip.dart';
import '../../shared/widgets/settings_rows.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../../shared/widgets/color_dot.dart';

class GroupsListScreen extends ConsumerStatefulWidget {
  const GroupsListScreen({super.key});
  @override
  ConsumerState<GroupsListScreen> createState() => _GroupsListScreenState();
}

class _GroupsListScreenState extends ConsumerState<GroupsListScreen> {
  String _search = '';
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final canCreate = [
      GlobalRole.superadmin,
      GlobalRole.member,
    ].contains(ref.watch(currentUserProvider)?.role);
    return GenPageScaffold(
      title: 'Grupos',
      subtitle: 'Equipos, miembros y proyectos compartidos.',
      actions: [
        if (canCreate)
          IconButton.filled(
            key: const ValueKey('create_group'),
            tooltip: 'Nuevo grupo',
            icon: const Icon(AppIcons.add),
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
          ),
      ],
      onRefresh: () async {
        ref.invalidate(groupWorksProvider);
        ref.invalidate(groupsProvider);
        await ref.read(groupsProvider.future);
      },
      bodyPadding: EdgeInsets.zero,
      body: AsyncValueView(
        value: ref.watch(groupsProvider),
        onRetry: () => ref.invalidate(groupsProvider),
        data: (groups) {
          final filtered =
              groups
                  .where((g) => g.name.toLowerCase().contains(_search))
                  .toList()
                ..sort((a, b) => compareNamesEs(a.name, b.name));
          return ListView(
            key: const ValueKey('groups_list'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: AppSpace.page,
            children: [
              TextField(
                key: const ValueKey('groups_search'),
                decoration: const InputDecoration(
                  hintText: 'Buscar grupos…',
                  prefixIcon: Icon(AppIcons.search),
                ),
                onChanged: (v) =>
                    setState(() => _search = v.trim().toLowerCase()),
              ),
              const SizedBox(height: AppSpace.md),
              if (groups.isEmpty)
                const EmptyView(
                  icon: AppIcons.groups,
                  title: 'Sin grupos todavía',
                  message:
                      'Lo que crees fuera de un grupo es personal: solo lo ves vos. Creá un grupo para compartir proyectos con tu equipo.',
                )
              else if (filtered.isEmpty)
                const EmptyView(message: 'No hay grupos que coincidan'),
              // Una card con filas de 56–64 dp en lugar de una card por
              // grupo (P13-M3).
              if (filtered.isNotEmpty)
                WorkspaceListPanel(
                  children: [
                    for (final group in filtered)
                      SettingsRow(
                        key: ValueKey('group_${group.id}'),
                        leading: Center(
                          widthFactor: 1,
                          child: ColorDot(
                            hex: group.color,
                            size: AppSpacing.xs,
                          ),
                        ),
                        title: group.name,
                        subtitle:
                            '${countLabel(group.members.length, 'miembro', 'miembros')} · ${countLabel(group.workCount, 'proyecto', 'proyectos')}',
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Visibilidad, no plazo: chip neutro (P13-M2).
                            if (group.publicRead) ...[
                              StatusChip(
                                label: 'Pública',
                                color: c.muted,
                                fill: c.hover,
                              ),
                              const SizedBox(width: AppSpacing.xs),
                            ],
                            Icon(
                              AppIcons.chevronRight,
                              size: AppIconSizes.action,
                              color: c.muted,
                            ),
                          ],
                        ),
                        onTap: () => context.push(Routes.group(group.id)),
                      ),
                  ],
                ),
              const SizedBox(height: AppSpace.bottomClearance),
            ],
          );
        },
      ),
    );
  }
}
