import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/util/format.dart';
import '../../data/models/json.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../settings/settings_form_dialog.dart';
import 'works_providers.dart';

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
    subtitle: 'Acciones realizadas mediante conexiones MCP.',
    showBack: true,
    icon: AppIcons.info,
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
              ? const EmptyView(
                  message:
                      'Todavía no hay acciones de un asistente en este proyecto.',
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
  Widget build(BuildContext context) => GenPageScaffold(
    title: 'Acceso cliente',
    icon: AppIcons.view,
    showBack: true,
    body: AsyncValueView(
      value: ref.watch(workDetailProvider(widget.id)),
      onRetry: () => ref.invalidate(workDetailProvider(widget.id)),
      data: (work) {
        if (!work.canManageClients) {
          return const EmptyView(
            message:
                'No tenés permiso para administrar los accesos de este proyecto.',
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Los clientes consultan el avance, las tareas y el documento. No pueden modificar el proyecto.',
            ),
            if (work.groupId != null)
              TextButton(
                key: const ValueKey('work_clients_group'),
                onPressed: () =>
                    context.push('${Routes.group(work.groupId!)}/clients'),
                child: const Text('Clientes del grupo'),
              ),
            FilledButton.icon(
              key: const ValueKey('work_clients_add'),
              onPressed: _busy ? null : _add,
              icon: const Icon(AppIcons.personAdd),
              label: const Text('Agregar cliente'),
            ),
            const SizedBox(height: AppSpacing.md),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () =>
                    ref.refresh(workClientsProvider(widget.id).future),
                child: AsyncValueView(
                  value: ref.watch(workClientsProvider(widget.id)),
                  onRetry: () => ref.invalidate(workClientsProvider(widget.id)),
                  data: (clients) => ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: clients.isEmpty ? 1 : clients.length,
                    itemBuilder: (_, i) => clients.isEmpty
                        ? const EmptyView(
                            message: 'Ningún cliente ve este proyecto.',
                          )
                        : Padding(
                            padding: const EdgeInsets.only(
                              bottom: AppSpacing.sm,
                            ),
                            child: WorkspaceListPanel(
                              children: [
                                ListTile(
                                  title: Text(clients[i]['name'] as String),
                                  subtitle: Text(
                                    '${clients[i]['email']}\n${clients[i]['firstLoginAt'] == null ? 'Invitado' : 'Activo'}',
                                  ),
                                  isThreeLine: true,
                                  trailing: IconButton(
                                    key: ValueKey(
                                      'work_clients_revoke_${clients[i]['userId']}',
                                    ),
                                    tooltip:
                                        'Quitar acceso de ${clients[i]['name']}',
                                    onPressed: _busy
                                        ? null
                                        : () => _revoke(clients[i]),
                                    icon: const Icon(AppIcons.personRemove),
                                  ),
                                ),
                              ],
                            ),
                          ),
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
