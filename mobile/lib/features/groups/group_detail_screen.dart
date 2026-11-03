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
import '../../shared/widgets/status_chip.dart';
import '../../shared/widgets/entity_header.dart';
import '../../shared/widgets/settings_rows.dart';
import '../../shared/widgets/row_actions_menu.dart';
import '../../shared/widgets/initials_avatar.dart';
import '../../shared/widgets/app_button_styles.dart';

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

    // Rótulo de sección 11/700 con la cantidad y, a la derecha, la acción
    // (P14-M4).
    Widget sectionLabel(String text, int count, {Widget? action}) => Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text.rich(
                TextSpan(
                  text: text.toUpperCase(),
                  style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
                  children: [
                    TextSpan(
                      text: '  $count',
                      style: AppTextStyles.technical.copyWith(
                        fontSize: 11,
                        color: c.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          ?action,
        ],
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
              icon: AppIcons.groups,
              title: 'Grupo no disponible',
              message: 'No existe o no tenés acceso a este grupo.',
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
                ),
                const SizedBox(height: AppSpace.sm),
                // El mismo encabezado de entidad que sector y proyecto: en una
                // card (P14-M1).
                WorkspacePanel(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: EntityHeader(
                    title: group.name,
                    colorHex: group.color,
                    trailing: menu,
                    meta: Text(
                      '${countLabel(group.members.length, 'miembro', 'miembros')} · ${countLabel(group.workCount, 'proyecto', 'proyectos')} · ${countLabel(group.pendingCount, 'pendiente', 'pendientes')}',
                    ),
                  ),
                ),
                const SizedBox(height: AppSpace.md),
                WorkspaceListPanel(
                  children: [
                    SettingsRow(
                      key: const ValueKey('group_public_read'),
                      icon: group.publicRead ? AppIcons.view : AppIcons.lock,
                      title: group.publicRead
                          ? 'Lectura para no miembros activada'
                          : 'Lectura solo para miembros',
                      subtitle:
                          'Permite consultar el grupo a otros usuarios del sistema y en el televisor.',
                      trailing: canManage
                          ? Icon(
                              AppIcons.edit,
                              size: AppIconSizes.action,
                              color: c.muted,
                            )
                          : null,
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
                    if (canManage) ...[
                      // Filas de 56–64 dp con una línea de descripción
                      // (P14-M2).
                      SettingsRow(
                        key: const ValueKey('group_clients'),
                        icon: AppIcons.view,
                        title: 'Clientes del grupo',
                        subtitle:
                            'Elegí los proyectos que puede consultar cada cliente',
                        onTap: () =>
                            context.push('${Routes.group(groupId)}/clients'),
                      ),
                      SettingsRow(
                        key: const ValueKey('group_labels'),
                        icon: AppIcons.label,
                        title: 'Etiquetas del grupo',
                        subtitle: 'Nombres, valores y colores',
                        onTap: () =>
                            context.push('${Routes.group(groupId)}/labels'),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpace.lg),
                sectionLabel(
                  'Miembros',
                  group.members.length,
                  action: canManage
                      ? FilledButton.tonalIcon(
                          key: const ValueKey('group_add_member'),
                          style: AppButtonStyles.tonal(context).copyWith(
                            minimumSize: const WidgetStatePropertyAll(
                              Size(0, AppSpacing.xl),
                            ),
                          ),
                          icon: const Icon(
                            AppIcons.personAdd,
                            size: AppIconSizes.field,
                          ),
                          label: const Text('Agregar'),
                          onPressed: () => showMemberDialog(context, group),
                        )
                      : null,
                ),
                WorkspaceListPanel(
                  children: [
                    for (final member in group.members)
                      SettingsRow(
                        key: ValueKey('group_member_${member.id}'),
                        leading: InitialsAvatar(
                          name: member.name.isEmpty
                              ? member.email
                              : member.name,
                        ),
                        title: member.name.isEmpty ? member.email : member.name,
                        subtitle: member.email,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Rol como chip neutro; el admin principal con
                            // estrella, sin color propio (P14-M3).
                            if (member.id == group.ownerId ||
                                member.role == 'ADMIN')
                              // Acotado: con texto grande, el nombre conserva
                              // el ancho y el chip se trunca.
                              ConstrainedBox(
                                constraints: BoxConstraints(
                                  maxWidth:
                                      MediaQuery.sizeOf(context).width * .28,
                                ),
                                child: StatusChip(
                                  label: member.id == group.ownerId
                                      ? '★ admin principal'
                                      : 'admin',
                                  color: c.muted,
                                  fill: c.hover,
                                ),
                              ),
                            // La columna del "⋯" se reserva en todas las
                            // filas.
                            if (!canManage || member.id == group.ownerId)
                              const SizedBox(width: kMinInteractiveDimension)
                            else
                              RowActionsMenu(
                                key: ValueKey('member_actions_${member.id}'),
                                tooltip: 'Acciones de ${member.name}',
                                actions: [
                                  RowAction(
                                    key: 'member_role_${member.id}',
                                    label: 'Cambiar rol',
                                    onSelected: () => showMemberDialog(
                                      context,
                                      group,
                                      member: member,
                                    ),
                                  ),
                                  RowAction(
                                    key: 'member_remove_${member.id}',
                                    label: 'Quitar miembro',
                                    destructive: true,
                                    onSelected: () async {
                                      final removed = await confirmAction(
                                        context,
                                        title: 'Quitar miembro',
                                        message:
                                            '«${member.name}» dejará de pertenecer a este grupo.',
                                        confirmLabel: 'Quitar miembro',
                                        danger: true,
                                        onConfirm: () => repository
                                            .removeMember(groupId, member.id),
                                      );
                                      if (removed && context.mounted) {
                                        refreshGroups(ref);
                                      }
                                    },
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpace.lg),
                AsyncValueView(
                  value: ref.watch(groupWorksProvider(groupId)),
                  onRetry: () => ref.invalidate(groupWorksProvider(groupId)),
                  data: (works) {
                    final active = works.where((w) => !w.isTemplate).toList();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        sectionLabel('Proyectos activos', active.length),
                        if (active.isEmpty)
                          muted('No hay proyectos activos')
                        else
                          WorkspaceListPanel(
                            children: [
                              for (final work in active)
                                ListTile(
                                  key: ValueKey('group_work_${work.id}'),
                                  leading: ColorDot(hex: work.color),
                                  minLeadingWidth: AppSpacing.lg,
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
                                  trailing: Icon(
                                    AppIcons.chevronRight,
                                    size: AppIconSizes.action,
                                    color: c.muted,
                                  ),
                                  onTap: () =>
                                      context.push(Routes.work(work.id)),
                                ),
                            ],
                          ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: AppSpace.lg),
                AsyncValueView(
                  value: ref.watch(sectorsProvider),
                  onRetry: () => ref.invalidate(sectorsProvider),
                  data: (sectors) {
                    final owned = sectors
                        .where((s) => s.scope.groupId == groupId)
                        .toList();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        sectionLabel('Sectores del grupo', owned.length),
                        if (owned.isEmpty)
                          muted('No hay sectores visibles del grupo')
                        else
                          WorkspaceListPanel(
                            children: [
                              for (final sector in owned)
                                SettingsRow(
                                  key: ValueKey('group_sector_${sector.id}'),
                                  leading: Center(
                                    widthFactor: 1,
                                    child: ColorDot(
                                      hex: sector.color,
                                      size: AppSpacing.xs,
                                    ),
                                  ),
                                  title: sector.name,
                                  subtitle: countLabel(
                                    sector.pending,
                                    'pendiente',
                                    'pendientes',
                                  ),
                                  onTap: () =>
                                      context.push(Routes.sector(sector.id)),
                                ),
                            ],
                          ),
                      ],
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
