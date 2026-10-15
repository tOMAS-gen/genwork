import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/brand_name.dart';
import '../../shared/widgets/breadcrumb.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/name_color_dialog.dart';
import '../../shared/widgets/progress_line.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';
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
    final c = context.colors;

    Widget panelTitle(String text) => Semantics(
      header: true,
      child: Text(
        text,
        style: AppTextStyles.dialogTitle.copyWith(color: c.text),
      ),
    );
    Widget muted(String text) =>
        Text(text, style: AppTextStyles.body.copyWith(color: c.muted));

    final menu = canManage
        ? PopupMenuButton<String>(
            key: const ValueKey('group_actions'),
            tooltip: 'Acciones del grupo',
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Text('Editar grupo')),
              // La acción peligrosa va en `danger`, separada de las demás.
              const PopupMenuDivider(),
              PopupMenuItem(
                value: 'delete',
                child: Text(
                  'Eliminar grupo',
                  style: AppTextStyles.body.copyWith(color: c.danger),
                ),
              ),
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
          )
        : null;

    return Scaffold(
      appBar: AppBar(title: const BrandName(size: 16)),
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
              padding: AppSpace.page,
              children: [
                Breadcrumb(
                  rootKey: const ValueKey('group_breadcrumb_root'),
                  rootLabel: 'Grupos',
                  onRoot: () => context.go(Routes.groups),
                  current: group.name,
                ),
                const SizedBox(height: AppSpace.sm),
                Row(
                  children: [
                    ColorDot(hex: group.color, size: AppSpace.dotLarge),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(
                          group.name,
                          style: AppTextStyles.screenTitle.copyWith(
                            color: c.text,
                          ),
                        ),
                      ),
                    ),
                    ?menu,
                  ],
                ),
                const SizedBox(height: AppSpacing.xxs),
                muted(
                  '${countLabel(group.members.length, 'miembro', 'miembros')} · ${countLabel(group.workCount, 'proyecto', 'proyectos')} · ${countLabel(group.pendingCount, 'pendiente', 'pendientes')}',
                ),
                const SizedBox(height: AppSpace.md),
                WorkspacePanel(
                  child: Material(
                    type: MaterialType.transparency,
                    child: ListTile(
                      key: const ValueKey('group_public_read'),
                      leading: Icon(
                        group.publicRead ? AppIcons.view : AppIcons.lock,
                        color: c.muted,
                      ),
                      title: Text(
                        group.publicRead
                            ? 'Lectura para no miembros activada'
                            : 'Lectura solo para miembros',
                      ),
                      subtitle: const Text(
                        'Permite consultar el grupo a otros usuarios del sistema y en el televisor.',
                      ),
                      trailing: canManage ? const Icon(AppIcons.edit) : null,
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
                              if (changed && context.mounted) {
                                refreshGroups(ref);
                              }
                            },
                    ),
                  ),
                ),
                const SizedBox(height: AppSpace.md),
                WorkspacePanel(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      panelTitle('Miembros'),
                      if (canManage)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: OutlinedButton.icon(
                            key: const ValueKey('group_add_member'),
                            icon: const Icon(
                              AppIcons.personAdd,
                              size: AppIconSizes.field,
                            ),
                            label: const Text('Agregar miembro'),
                            onPressed: () => showMemberDialog(context, group),
                          ),
                        ),
                      Material(
                        type: MaterialType.transparency,
                        child: Column(
                          children: [
                            for (final member in group.members) ...[
                              Divider(height: 1, color: c.border),
                              ListTile(
                                key: ValueKey('group_member_${member.id}'),
                                contentPadding: EdgeInsets.zero,
                                title: Text(
                                  member.name.isEmpty
                                      ? member.email
                                      : member.name,
                                ),
                                subtitle: Text(
                                  '${member.email}\n${member.id == group.ownerId ? 'Administrador principal' : member.roleLabel}',
                                ),
                                trailing:
                                    !canManage || member.id == group.ownerId
                                    ? null
                                    : PopupMenuButton<String>(
                                        key: ValueKey(
                                          'member_actions_${member.id}',
                                        ),
                                        tooltip: 'Acciones de ${member.name}',
                                        itemBuilder: (_) => [
                                          const PopupMenuItem(
                                            value: 'role',
                                            child: Text('Cambiar rol'),
                                          ),
                                          const PopupMenuDivider(),
                                          PopupMenuItem(
                                            value: 'remove',
                                            child: Text(
                                              'Quitar miembro',
                                              style: AppTextStyles.body
                                                  .copyWith(color: c.danger),
                                            ),
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
                                              onConfirm: () =>
                                                  repository.removeMember(
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
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (canManage) ...[
                  const SizedBox(height: AppSpace.md),
                  WorkspaceListPanel(
                    children: [
                      ListTile(
                        key: const ValueKey('group_clients'),
                        title: const Text('Clientes del grupo'),
                        subtitle: const Text(
                          'Elegí los proyectos que puede consultar cada cliente',
                        ),
                        trailing: const Icon(AppIcons.chevronRight),
                        onTap: () =>
                            context.push('${Routes.group(groupId)}/clients'),
                      ),
                      ListTile(
                        key: const ValueKey('group_labels'),
                        title: const Text('Etiquetas del grupo'),
                        subtitle: const Text('Nombres, valores y colores'),
                        trailing: const Icon(AppIcons.chevronRight),
                        onTap: () =>
                            context.push('${Routes.group(groupId)}/labels'),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: AppSpace.md),
                AsyncValueView(
                  value: ref.watch(groupWorksProvider(groupId)),
                  onRetry: () => ref.invalidate(groupWorksProvider(groupId)),
                  data: (works) {
                    final active = works.where((w) => !w.isTemplate).toList();
                    return WorkspacePanel(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          panelTitle('Proyectos activos (${active.length})'),
                          if (active.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: AppSpacing.sm,
                              ),
                              child: muted('No hay proyectos activos'),
                            ),
                          Material(
                            type: MaterialType.transparency,
                            child: Column(
                              children: [
                                for (final work in active) ...[
                                  Divider(height: 1, color: c.border),
                                  ListTile(
                                    key: ValueKey('group_work_${work.id}'),
                                    contentPadding: EdgeInsets.zero,
                                    leading: ColorDot(hex: work.color),
                                    title: Text(work.name),
                                    subtitle: Padding(
                                      padding: const EdgeInsets.only(
                                        top: AppSpacing.xxs,
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          if (work.stageName != null)
                                            Text(work.stageName!),
                                          ProgressLine(progress: work.progress),
                                        ],
                                      ),
                                    ),
                                    trailing: const Icon(AppIcons.chevronRight),
                                    onTap: () =>
                                        context.push(Routes.work(work.id)),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: AppSpace.md),
                AsyncValueView(
                  value: ref.watch(sectorsProvider),
                  onRetry: () => ref.invalidate(sectorsProvider),
                  data: (sectors) {
                    final owned = sectors
                        .where((s) => s.scope.groupId == groupId)
                        .toList();
                    return WorkspacePanel(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          panelTitle('Sectores del grupo (${owned.length})'),
                          if (owned.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: AppSpacing.sm,
                              ),
                              child: muted(
                                'No hay sectores visibles del grupo',
                              ),
                            ),
                          Material(
                            type: MaterialType.transparency,
                            child: Column(
                              children: [
                                for (final sector in owned) ...[
                                  Divider(height: 1, color: c.border),
                                  ListTile(
                                    key: ValueKey('group_sector_${sector.id}'),
                                    contentPadding: EdgeInsets.zero,
                                    leading: ColorDot(hex: sector.color),
                                    title: Text(sector.name),
                                    subtitle: Text(
                                      countLabel(
                                        sector.pending,
                                        'pendiente',
                                        'pendientes',
                                      ),
                                    ),
                                    trailing: const Icon(AppIcons.chevronRight),
                                    onTap: () =>
                                        context.push(Routes.sector(sector.id)),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: AppSpace.xl),
              ],
            ),
          );
        },
      ),
    );
  }
}
