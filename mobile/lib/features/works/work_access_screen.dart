import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/util/format.dart';
import '../../data/models/json.dart';
import '../../shared/widgets/row_actions_menu.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../settings/settings_form_dialog.dart';
import 'works_providers.dart';
import '../../shared/widgets/status_chip.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'project_breadcrumb.dart';
import '../../shared/widgets/settings_rows.dart';
import '../../shared/widgets/initials_avatar.dart';

final workActivityProvider = FutureProvider.autoDispose.family<Json, String>(
  (ref, id) => ref.watch(worksRepositoryProvider).activity(id),
);
final workClientsProvider = FutureProvider.autoDispose
    .family<List<Json>, String>(
      (ref, id) => ref.watch(worksRepositoryProvider).clientGrants(id),
    );

class WorkActivityScreen extends ConsumerWidget {
  const WorkActivityScreen({super.key, required this.id});
  final String id;
  @override
  Widget build(BuildContext context, WidgetRef ref) => GenPageScaffold(
    title: 'Actividad',
    breadcrumb: ProjectBreadcrumb(workId: id, current: 'Actividad'),
    showBack: true,
    onRefresh: () => ref.refresh(workActivityProvider(id).future),
    body: AsyncValueView(
      value: ref.watch(workActivityProvider(id)),
      onRetry: () => ref.invalidate(workActivityProvider(id)),
      data: (page) {
        final entries = parseList(page['entries'], (v) => v);
        return ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: entries.isEmpty ? 1 : entries.length,
          itemBuilder: (_, i) => entries.isEmpty
              // El mismo vacío que Archivos (P19-M1).
              ? const EmptyView(
                  icon: AppIcons.schedule,
                  title: 'Sin actividad todavía',
                  message:
                      'Todavía no hay acciones de un asistente de IA en este proyecto.',
                )
              : ListTile(
                  title: Text(entries[i]['summary'] as String? ?? ''),
                  subtitle: Text(
                    formatDateTime(
                      DateTime.parse(entries[i]['createdAt'] as String),
                    ),
                  ),
                ),
        );
      },
    ),
  );
}

class WorkClientsScreen extends ConsumerStatefulWidget {
  const WorkClientsScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<WorkClientsScreen> createState() => _WorkClientsScreenState();
}

class _WorkClientsScreenState extends ConsumerState<WorkClientsScreen> {
  bool _busy = false;
  Future<void> _add() async {
    final result = await settingsForm(
      context,
      title: 'Agregar cliente al proyecto',
      fields: const [
        SettingsField('email', 'Correo'),
        SettingsField('name', 'Nombre', maxLength: 120),
      ],
      save: (values) => ref
          .read(worksRepositoryProvider)
          .grantClient(
            widget.id,
            email: (values['email'] as String).trim(),
            name: (values['name'] as String).trim(),
          ),
    );
    if (result == true && mounted) {
      ref.invalidate(workClientsProvider(widget.id));
    }
  }

  Future<void> _revoke(Json client) async {
    if (_busy ||
        !await settingsConfirm(
          context,
          '¿Quitar el acceso?',
          '${client['name']} dejará de ver este proyecto en el portal.',
          action: 'Quitar acceso',
        ) ||
        !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(worksRepositoryProvider)
          .revokeClient(widget.id, client['userId'] as String);
      ref.invalidate(workClientsProvider(widget.id));
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final work = ref.watch(workDetailProvider(widget.id));
    final canManage = work.value?.canManageClients == true;
    return GenPageScaffold(
      title: 'Acceso cliente',
      breadcrumb: ProjectBreadcrumb(workId: widget.id),
      showBack: true,
      // La acción de la pantalla va en el renglón del título (P19-M1).
      actions: [
        if (canManage)
          FilledButton.icon(
            key: const ValueKey('work_clients_add'),
            onPressed: _busy ? null : _add,
            icon: const Icon(AppIcons.personAdd),
            label: const Text('Agregar cliente'),
          ),
      ],
      body: AsyncValueView(
        value: work,
        onRetry: () => ref.invalidate(workDetailProvider(widget.id)),
        data: (work) {
          if (!work.canManageClients) {
            return const EmptyView(
              message:
                  'No tenés permiso para administrar los accesos de este proyecto.',
            );
          }
          final c = context.colors;
          final muted = AppTextStyles.body.copyWith(color: c.muted);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Dos líneas, con «Clientes del grupo» como enlace al final
              // (P19-M2, P19-M3).
              Text('Proyecto y tareas en modo lectura.', style: muted),
              if (work.groupId != null)
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text('Para varios proyectos: ', style: muted),
                    TextButton(
                      key: const ValueKey('work_clients_group'),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, kMinInteractiveDimension),
                        tapTargetSize: MaterialTapTargetSize.padded,
                        textStyle: AppTextStyles.action,
                      ),
                      onPressed: () => context.push(
                        '${Routes.group(work.groupId!)}/clients',
                      ),
                      child: const Text('Clientes del grupo'),
                    ),
                  ],
                ),
              const SizedBox(height: AppSpacing.sm),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(workClientsProvider(widget.id).future),
                  child: AsyncValueView(
                    value: ref.watch(workClientsProvider(widget.id)),
                    onRetry: () =>
                        ref.invalidate(workClientsProvider(widget.id)),
                    data: (clients) => ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        if (clients.isEmpty)
                          const EmptyView(
                            icon: AppIcons.view,
                            title: 'Ningún cliente ve este proyecto',
                            message:
                                'Agregá uno con su correo para que pueda seguir el avance.',
                          )
                        else
                          // Una card con filas de 56 dp separadas por
                          // divisores (P19-M3).
                          WorkspaceListPanel(
                            children: [
                              for (final client in clients) _row(client),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _row(Json client) {
    final c = context.colors;
    final name = client['name'] as String? ?? '';
    return SettingsRow(
      key: ValueKey('work_client_${client['userId']}'),
      leading: InitialsAvatar(name: name.isEmpty ? '${client['email']}' : name),
      title: name,
      subtitle: '${client['email']}',
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Estado como insignia, como la web.
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * .25,
            ),
            child: StatusChip(
              label: client['firstLoginAt'] == null ? 'Invitado' : 'Activo',
              color: c.muted,
              fill: c.hover,
            ),
          ),
          // Quitar acceso, adentro del "⋯" (P19-M4).
          RowActionsMenu(
            key: ValueKey('work_clients_menu_${client['userId']}'),
            tooltip: 'Acciones de $name',
            enabled: !_busy,
            actions: [
              RowAction(
                key: 'work_clients_revoke_${client['userId']}',
                label: 'Quitar acceso',
                destructive: true,
                onSelected: () => _revoke(client),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
