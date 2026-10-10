import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/util/format.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/group.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import 'group_admin_scaffold.dart';
import 'groups_providers.dart';
import '../../shared/widgets/error_text.dart';

class GroupClientsScreen extends ConsumerWidget {
  const GroupClientsScreen({super.key, required this.groupId});
  final String groupId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => GroupAdminScaffold(
    groupId: groupId,
    title: 'Clientes del grupo',
    builder: (group) => AsyncValueView(
      value: ref.watch(groupClientsProvider(groupId)),
      onRetry: () => ref.invalidate(groupClientsProvider(groupId)),
      data: (data) => RefreshIndicator(
        onRefresh: () => ref.refresh(groupClientsProvider(groupId).future),
        child: ListView(
          padding: AppSpace.list,
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Text(group.name, style: Theme.of(context).textTheme.titleMedium),
            const Text(
              'Cada cliente puede consultar únicamente los proyectos que le asignes.',
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                key: const ValueKey('group_add_client'),
                icon: const Icon(Icons.person_add_outlined),
                label: const Text('Agregar cliente'),
                onPressed: data.works.isEmpty
                    ? null
                    : () => _edit(context, groupId, data),
              ),
            ),
            if (data.works.isEmpty)
              const Text('Este grupo no tiene proyectos activos disponibles.'),
            if (data.clients.isEmpty)
              const EmptyView(message: 'No hay clientes con acceso al grupo'),
            for (final client in data.clients)
              Card(
                child: Column(
                  children: [
                    ListTile(
                      title: Text(client.name),
                      subtitle: Text(
                        '${client.email}\n${client.hasLoggedIn ? 'Ya ingresó' : 'Todavía no ingresó'}',
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        countLabel(client.workIds.length, 'proyecto asignado', 'proyectos asignados'),
                      ),
                    ),
                    Wrap(
                      spacing: 8,
                      children: [
                        TextButton(
                          key: ValueKey('client_edit_${client.id}'),
                          onPressed: () =>
                              _edit(context, groupId, data, client: client),
                          child: const Text('Editar acceso'),
                        ),
                        TextButton(
                          key: ValueKey('client_remove_${client.id}'),
                          onPressed: () async {
                            final repository = ref.read(
                              groupsRepositoryProvider,
                            );
                            final removed = await confirmAction(
                              context,
                              title: 'Quitar acceso al grupo',
                              message:
                                  '${client.name} dejará de ver todos los proyectos de este grupo. Su cuenta y los accesos en otros grupos se conservan.',
                              confirmLabel: 'Quitar acceso',
                              danger: true,
                              onConfirm: () =>
                                  repository.removeClient(groupId, client.id),
                            );
                            if (removed && context.mounted) refreshGroups(ref);
                          },
                          child: const Text('Quitar acceso'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    ),
  );
  Future<void> _edit(
    BuildContext context,
    String groupId,
    GroupClients data, {
    GroupClient? client,
  }) => showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _ClientDialog(groupId: groupId, data: data, client: client),
  );
}

class _ClientDialog extends ConsumerStatefulWidget {
  const _ClientDialog({required this.groupId, required this.data, this.client});
  final String groupId;
  final GroupClients data;
  final GroupClient? client;
  @override
  ConsumerState<_ClientDialog> createState() => _ClientDialogState();
}

class _ClientDialogState extends ConsumerState<_ClientDialog> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.client?.name);
  late final _email = TextEditingController(text: widget.client?.email);
  // La API solo acepta activos. Los archivados no visibles se informan antes de sincronizar.
  late final _selected =
      widget.client?.workIds
          .where((id) => widget.data.works.any((w) => w.id == id))
          .toSet() ??
      <String>{};
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    if (widget.client == null && _selected.isEmpty) {
      setState(() => _error = 'Elegí al menos un proyecto');
      return;
    }
    if (widget.client != null &&
        (_selected.isEmpty ||
            widget.client!.workIds.any(
              (id) => !widget.data.works.any((w) => w.id == id),
            ))) {
      final accepted = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Actualizar accesos'),
          content: const Text(
            'Se conservarán solo los proyectos seleccionados. Los accesos a proyectos archivados o no disponibles de este grupo también se quitarán.',
          ),
          actions: [
            TextButton(
              key: const ValueKey('client_access_cancel'),
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              key: const ValueKey('client_access_confirm'),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Continuar'),
            ),
          ],
        ),
      );
      if (accepted != true || !mounted) return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repository = ref.read(groupsRepositoryProvider);
      if (widget.client == null) {
        await repository.addClient(
          widget.groupId,
          name: _name.text.trim(),
          email: _email.text.trim(),
          workIds: _selected,
        );
      } else {
        await repository.setClientWorks(
          widget.groupId,
          widget.client!.id,
          _selected,
        );
      }
      if (!mounted) return;
      refreshGroups(ref);
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = errorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: Text(widget.client == null ? 'Agregar cliente' : 'Editar acceso'),
      scrollable: true,
      content: SizedBox(
        width: 420,
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.client == null) ...[
                TextFormField(
                  key: const ValueKey('client_name'),
                  controller: _name,
                  maxLength: 120,
                  enabled: !_busy,
                  decoration: const InputDecoration(labelText: 'Nombre'),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Ingresá un nombre'
                      : null,
                ),
                TextFormField(
                  key: const ValueKey('client_email'),
                  controller: _email,
                  enabled: !_busy,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Correo'),
                  validator: (v) =>
                      v == null ||
                          !RegExp(
                            r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                          ).hasMatch(v.trim())
                      ? 'Ingresá un correo válido'
                      : null,
                ),
              ] else
                Text('${widget.client!.name}\n${widget.client!.email}'),
              const SizedBox(height: 16),
              const Text('Proyectos que podrá consultar'),
              for (final work in widget.data.works)
                CheckboxListTile(
                  key: ValueKey('client_work_${work.id}'),
                  title: Text(work.name),
                  value: _selected.contains(work.id),
                  onChanged: _busy
                      ? null
                      : (checked) => setState(() {
                          if (checked == true) {
                            _selected.add(work.id);
                          } else {
                            _selected.remove(work.id);
                          }
                        }),
                ),
              if (_error != null) ErrorText(_error!),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('client_save'),
          onPressed: _busy ? null : _save,
          child: Text(_busy ? 'Guardando…' : 'Guardar'),
        ),
      ],
    ),
  );
}
