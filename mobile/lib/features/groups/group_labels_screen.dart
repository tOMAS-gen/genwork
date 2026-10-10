import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/groups_repository.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/name_color_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import 'group_admin_scaffold.dart';
import 'groups_providers.dart';

class GroupLabelsScreen extends ConsumerWidget {
  const GroupLabelsScreen({super.key, required this.groupId});
  final String groupId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> edit({
      required String title,
      String name = '',
      String? color,
      bool withColor = false,
      required Future<void> Function(String, String?) save,
    }) async {
      final saved = await showNameColorDialog(
        context,
        title: title,
        name: name,
        color: color,
        withColor: withColor,
        requiredColor: withColor,
        onSave: save,
      );
      if (saved && context.mounted) refreshGroups(ref);
    }

    final repository = ref.read(groupsRepositoryProvider);
    Future<void> remove(String id, String name, {bool value = false}) async {
      final deleted = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (_) => _DeleteLabelDialog(
          repository: repository,
          id: id,
          name: name,
          value: value,
        ),
      );
      if (deleted == true && context.mounted) refreshGroups(ref);
    }

    return GroupAdminScaffold(
      groupId: groupId,
      title: 'Etiquetas del grupo',
      builder: (group) => AsyncValueView(
        value: ref.watch(groupLabelsProvider(groupId)),
        onRetry: () => ref.invalidate(groupLabelsProvider(groupId)),
        data: (labels) => RefreshIndicator(
          onRefresh: () => ref.refresh(groupLabelsProvider(groupId).future),
          child: ListView(
            padding: AppSpace.list,
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              Text(group.name, style: Theme.of(context).textTheme.titleMedium),
              const Text(
                'Administrá las etiquetas propias de este grupo. Las globales se gestionan desde Configuración.',
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: FilledButton.icon(
                  key: const ValueKey('group_create_label'),
                  icon: const Icon(Icons.add),
                  label: const Text('Nueva etiqueta'),
                  onPressed: () => edit(
                    title: 'Nueva etiqueta',
                    save: (name, _) => repository.createLabel(groupId, name),
                  ),
                ),
              ),
              if (labels.isEmpty)
                const EmptyView(message: 'No hay etiquetas del grupo'),
              for (final label in labels)
                Card(
                  child: ExpansionTile(
                    key: ValueKey('group_label_${label.id}'),
                    initiallyExpanded: true,
                    title: Text(label.name),
                    children: [
                      Wrap(
                        spacing: 8,
                        children: [
                          TextButton(
                            key: ValueKey('label_rename_${label.id}'),
                            onPressed: () => edit(
                              title: 'Renombrar etiqueta',
                              name: label.name,
                              save: (name, _) =>
                                  repository.renameLabel(label.id, name),
                            ),
                            child: const Text('Renombrar'),
                          ),
                          TextButton(
                            key: ValueKey('label_delete_${label.id}'),
                            onPressed: () => remove(label.id, label.name),
                            child: const Text('Eliminar etiqueta'),
                          ),
                        ],
                      ),
                      for (final value in label.values)
                        ListTile(
                          leading: ColorDot(hex: value.color),
                          title: Text(value.name),
                          trailing: PopupMenuButton<String>(
                            key: ValueKey('label_value_actions_${value.id}'),
                            tooltip: 'Acciones de ${value.name}',
                            itemBuilder: (_) => const [
                              PopupMenuItem(
                                value: 'edit',
                                child: Text('Editar valor'),
                              ),
                              PopupMenuItem(
                                value: 'delete',
                                child: Text('Eliminar valor'),
                              ),
                            ],
                            onSelected: (action) {
                              if (action == 'delete') {
                                remove(value.id, value.name, value: true);
                              } else {
                                edit(
                                  title: 'Editar valor',
                                  name: value.name,
                                  color: value.color,
                                  withColor: true,
                                  save: (name, color) => repository.updateValue(
                                    value.id,
                                    name,
                                    color!,
                                  ),
                                );
                              }
                            },
                          ),
                        ),
                      TextButton.icon(
                        key: ValueKey('label_add_value_${label.id}'),
                        icon: const Icon(Icons.add),
                        label: const Text('Agregar valor'),
                        onPressed: () => edit(
                          title: 'Nuevo valor',
                          color: '#3b5bfa',
                          withColor: true,
                          save: (name, color) =>
                              repository.createValue(label.id, name, color!),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DeleteLabelDialog extends StatefulWidget {
  const _DeleteLabelDialog({
    required this.repository,
    required this.id,
    required this.name,
    required this.value,
  });
  final GroupsRepository repository;
  final String id, name;
  final bool value;
  @override
  State<_DeleteLabelDialog> createState() => _DeleteLabelDialogState();
}

class _DeleteLabelDialogState extends State<_DeleteLabelDialog> {
  bool _busy = false;
  int? _affected;
  String? _error;
  Future<void> _delete() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.repository.deleteLabel(
        widget.id,
        value: widget.value,
        confirm: _affected != null,
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        if (e.status == 409 && e.extra['affectedWorks'] is int) {
          _affected = e.extra['affectedWorks'] as int;
        } else {
          _error = e.message;
        }
      });
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
      title: Text(widget.value ? 'Eliminar valor' : 'Eliminar etiqueta'),
      scrollable: true,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Se eliminará «${widget.name}»${widget.value ? '' : ' y sus valores'}. Las tareas y proyectos perderán estas etiquetas. No se puede deshacer.',
          ),
          if (_affected != null)
            Text(
              'El servidor indica $_affected asignaciones en proyectos. Confirmá si querés eliminarlas igualmente.',
              key: const ValueKey('label_delete_impact'),
            ),
          if (_error != null)
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('label_delete_confirm'),
          style: FilledButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.error,
            foregroundColor: Theme.of(context).colorScheme.onError,
          ),
          onPressed: _busy ? null : _delete,
          child: Text(
            _busy
                ? 'Eliminando…'
                : _affected == null
                ? 'Eliminar'
                : 'Eliminar igualmente',
          ),
        ),
      ],
    ),
  );
}
