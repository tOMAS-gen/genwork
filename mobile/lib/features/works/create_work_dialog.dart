import '../objectives/objectives_providers.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/group.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/state_views.dart';
import 'works_providers.dart';

/// Diálogo de alta de proyecto (nombre, descripción, grupo). Devuelve el id creado.
Future<String?> showCreateWorkDialog(
  BuildContext context, {
  bool isTemplate = false,
  String? templateId,
}) => showAppFormDialog<String>(
  context,
  barrierDismissible: false,
  builder: (_) =>
      _CreateWorkDialog(isTemplate: isTemplate, templateId: templateId),
);

class _CreateWorkDialog extends ConsumerStatefulWidget {
  const _CreateWorkDialog({required this.isTemplate, this.templateId});
  final bool isTemplate;
  final String? templateId;

  @override
  ConsumerState<_CreateWorkDialog> createState() => _CreateWorkDialogState();
}

class _CreateWorkDialogState extends ConsumerState<_CreateWorkDialog> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  String? _groupId;
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || _name.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final id = await ref
          .read(worksRepositoryProvider)
          .create(
            name: _name.text.trim(),
            isTemplate: widget.isTemplate,
            templateId: widget.templateId,
            description: _description.text.trim(),
            groupId: _groupId,
          );
      ref.invalidate(worksListProvider);
      ref.invalidate(templatesProvider);
      if (mounted) Navigator.of(context).pop(id);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        showErrorSnack(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final groups = ref.watch(groupsProvider);
    final user = ref.watch(currentUserProvider);
    return PopScope(
      canPop: !_saving,
      child: AppWorkDialog(
        title: widget.isTemplate
            ? 'Nueva plantilla'
            : widget.templateId != null
            ? 'Proyecto desde plantilla'
            : 'Nuevo proyecto',
        closeEnabled: !_saving,
        actions: [
          TextButton(
            key: const ValueKey('create_work_cancel'),
            onPressed: _saving ? null : () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('create_work_save'),
            onPressed: _saving ? null : _save,
            child: Text(
              _saving
                  ? 'Creando…'
                  : widget.isTemplate
                  ? 'Crear plantilla'
                  : 'Crear proyecto',
            ),
          ),
        ],
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              key: const ValueKey('create_work_name'),
              controller: _name,
              enabled: !_saving,
              maxLength: 120,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Nombre'),
            ),
            const SizedBox(height: AppSpace.lg),
            TextField(
              key: const ValueKey('create_work_description'),
              controller: _description,
              enabled: !_saving,
              maxLength: 2000,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
              ),
            ),
            const SizedBox(height: AppSpace.md),
            DropdownButtonFormField<String?>(
              key: const ValueKey('create_work_group'),
              isExpanded: true,
              initialValue: _groupId,
              decoration: const InputDecoration(labelText: 'Grupo'),
              items: [
                const DropdownMenuItem(value: null, child: Text('Personal')),
                for (final g in groups.value ?? const <GroupSummary>[])
                  if (g.canOperate(user))
                    DropdownMenuItem(value: g.id, child: Text(g.name)),
              ],
              onChanged: _saving
                  ? null
                  : (value) => setState(() => _groupId = value),
            ),
          ],
        ),
      ),
    );
  }
}
