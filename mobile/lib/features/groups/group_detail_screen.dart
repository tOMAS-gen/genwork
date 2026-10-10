import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/util/format.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/name_color_dialog.dart';
import '../../shared/widgets/progress_line.dart';
import '../../shared/widgets/state_views.dart';
import '../sectors/sectors_providers.dart';
import '../shell/resource_refresh.dart';
import '../works/works_providers.dart';
import 'groups_providers.dart';
import 'member_dialog.dart';

class GroupDetailScreen extends ConsumerWidget {
  const GroupDetailScreen({super.key, required this.groupId});
  final String groupId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(groupProvider(groupId));
    final user = ref.watch(currentUserProvider);
    final group = value.value;
    final canManage = group?.canManage(user) == true && !value.hasError;
    final repository = ref.read(groupsRepositoryProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(group?.name ?? 'Grupo'),
        actions: [
          if (canManage)
            PopupMenuButton<String>(
              key: const ValueKey('group_actions'),
              tooltip: 'Acciones del grupo',
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'edit', child: Text('Editar grupo')),
                PopupMenuItem(value: 'delete', child: Text('Eliminar grupo')),
              ],
              onSelected: (action) async {
                if (action == 'edit') {
                  final saved = await showNameColorDialog(
                    context,
                    title: 'Editar grupo',
                    name: group!.name,
                    color: group.color,
                    withColor: true,
                    onSave: (name, color) => repository.update(
                      groupId,
                      name: name,
                      color: color,
                      updateColor: true,
                    ),
                  );
                  if (saved && context.mounted) refreshGroups(ref);
                } else {
                  final deleted = await confirmAction(
                    context,
                    title: 'Eliminar grupo',
                    message:
                        'Se eliminará «${group!.name}» junto con sus proyectos, sectores y datos asociados, incluidas tareas y etiquetas. No se puede deshacer.',
                    exactName: group.name,
                    danger: true,
                    confirmLabel: 'Eliminar grupo',
                    onConfirm: () => repository.delete(groupId),
                  );
                  if (deleted && context.mounted) {
                    refreshGroups(ref);
                    context.go(Routes.groups);
                  }
                }
              },
            ),
        ],
      ),
      body: AsyncValueView(
        value: value,
        onRetry: () => ref.invalidate(groupsProvider),
        data: (group) {
          if (group == null) {
            return const EmptyView(
              message: 'El grupo ya no está disponible o no tenés acceso.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              refreshGroups(ref);
              await ref.read(groupsProvider.future);
            },
            child: ListView(
              key: const ValueKey('group_detail_list'),
              physics: const AlwaysScrollableScrollPhysics(),
              padding: AppSpace.list,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: ColorDot(hex: group.color, size: AppSpace.dotLarge),
                  title: Text(group.name),
                  subtitle: Text(
                    '${countLabel(group.members.length, 'miembro', 'miembros')} · ${countLabel(group.workCount, 'proyecto', 'proyectos')} · ${countLabel(group.pendingCount, 'pendiente', 'pendientes')}',
                  ),
                ),
                ListTile(
                  key: const ValueKey('group_public_read'),
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    group.publicRead
                        ? Icons.visibility_outlined
                        : Icons.lock_outline,
                  ),
                  title: Text(
                    group.publicRead
                        ? 'Lectura para no miembros activada'
                        : 'Lectura solo para miembros',
                  ),
                  subtitle: const Text(
                    'Permite consultar el grupo a otros usuarios del sistema y en el televisor.',
                  ),
                  trailing: canManage ? const Icon(Icons.edit_outlined) : null,
                  onTap: !canManage
                      ? null
                      : () async {
                          final changed = await confirmAction(
                            context,
                            title: group.publicRead
                                ? 'Restringir lectura'
                                : 'Permitir lectura a no miembros',
                            message: group.publicRead
                                ? 'Solo los miembros y los usuarios con acceso autorizado podrán consultar el grupo.'
                                : 'Los usuarios del sistema que no son miembros podrán consultar el grupo, también desde la vista de TV. No podrán modificarlo.',
                            confirmLabel: group.publicRead
                                ? 'Restringir'
                                : 'Permitir lectura',
                            onConfirm: () => repository.update(
                              groupId,
                              publicRead: !group.publicRead,
                            ),
                          );
                          if (changed && context.mounted) refreshGroups(ref);
                        },
                ),
                const Divider(),
                Semantics(
                  header: true,
                  child: Text(
                    'Miembros',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (canManage)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      key: const ValueKey('group_add_member'),
                      icon: const Icon(Icons.person_add_outlined),
                      label: const Text('Agregar miembro'),
                      onPressed: () => showMemberDialog(context, group),
                    ),
                  ),
                for (final member in group.members)
                  ListTile(
                    key: ValueKey('group_member_${member.id}'),
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      member.name.isEmpty ? member.email : member.name,
                    ),
                    subtitle: Text(
                      '${member.email}\n${member.id == group.ownerId ? 'Administrador principal' : member.roleLabel}',
                    ),
                    trailing: !canManage || member.id == group.ownerId
                        ? null
                        : PopupMenuButton<String>(
                            key: ValueKey('member_actions_${member.id}'),
                            tooltip: 'Acciones de ${member.name}',
                            itemBuilder: (_) => const [
                              PopupMenuItem(
                                value: 'role',
                                child: Text('Cambiar rol'),
                              ),
                              PopupMenuItem(
                                value: 'remove',
                                child: Text('Quitar miembro'),
                              ),
                            ],
                            onSelected: (action) async {
                              if (action == 'role') {
                                await showMemberDialog(
                                  context,
                                  group,
                                  member: member,
                                );
                              } else {
                                final removed = await confirmAction(
                                  context,
                                  title: 'Quitar miembro',
                                  message:
                                      '«${member.name}» dejará de pertenecer a este grupo.',
                                  confirmLabel: 'Quitar miembro',
                                  danger: true,
                                  onConfirm: () => repository.removeMember(
                                    groupId,
                                    member.id,
                                  ),
                                );
                                if (removed && context.mounted) {
                                  refreshGroups(ref);
                                }
                              }
                            },
                          ),
                  ),
                if (canManage) ...[
                  const Divider(),
                  ListTile(
                    key: const ValueKey('group_clients'),
                    title: const Text('Clientes del grupo'),
                    subtitle: const Text(
                      'Elegí los proyectos que puede consultar cada cliente',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () =>
                        context.push('${Routes.group(groupId)}/clients'),
                  ),
                  ListTile(
                    key: const ValueKey('group_labels'),
                    title: const Text('Etiquetas del grupo'),
                    subtitle: const Text('Nombres, valores y colores'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () =>
                        context.push('${Routes.group(groupId)}/labels'),
                  ),
                ],
                const Divider(),
                Semantics(
                  header: true,
                  child: Text(
                    'Proyectos activos',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                AsyncValueView(
                  value: ref.watch(groupWorksProvider(groupId)),
                  onRetry: () => ref.invalidate(groupWorksProvider(groupId)),
                  data: (works) => Column(
                    children: [
                      if (works.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('No hay proyectos activos'),
                        ),
                      for (final work in works.where((w) => !w.isTemplate))
                        Card(
                          child: Column(
                            children: [
                              ListTile(
                                key: ValueKey('group_work_${work.id}'),
                                leading: ColorDot(hex: work.color),
                                title: Text(work.name),
                                subtitle: work.stageName == null
                                    ? null
                                    : Text(work.stageName!),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => context.push(Routes.work(work.id)),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: ProgressLine(progress: work.progress),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Semantics(
                  header: true,
                  child: Text(
                    'Sectores del grupo',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                AsyncValueView(
                  value: ref.watch(sectorsProvider),
                  onRetry: () => ref.invalidate(sectorsProvider),
                  data: (sectors) {
                    final owned = sectors
                        .where((s) => s.scope.groupId == groupId)
                        .toList();
                    return Column(
                      children: [
                        if (owned.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('No hay sectores visibles del grupo'),
                          ),
                        for (final sector in owned)
                          ListTile(
                            key: ValueKey('group_sector_${sector.id}'),
                            leading: ColorDot(hex: sector.color),
                            title: Text(sector.name),
                            subtitle: Text(
                              countLabel(
                                sector.pending,
                                'pendiente',
                                'pendientes',
                              ),
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => context.push(Routes.sector(sector.id)),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
