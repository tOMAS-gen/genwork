import '../objectives/objectives_providers.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/group.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/labeled_field.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/state_views.dart';
import 'works_providers.dart';
import '../../shared/widgets/app_dropdown_decoration.dart';

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
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LabeledField(
              label: 'Ámbito',
              child: DropdownButtonFormField<String?>(
                icon: const AppDropdownIcon(),
                key: const ValueKey('create_work_group'),
                isExpanded: true,
                initialValue: _groupId,
                style: AppTextStyles.body.copyWith(color: context.colors.text),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('Para mí (personal)'),
                  ),
                  for (final g in groups.value ?? const <GroupSummary>[])
                    if (g.canOperate(user))
                      DropdownMenuItem(value: g.id, child: Text(g.name)),
                ],
                onChanged: _saving
                    ? null
                    : (value) => setState(() => _groupId = value),
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            LabeledField(
              label: widget.isTemplate ? 'Título del objetivo' : 'Nombre',
              child: TextField(
                key: const ValueKey('create_work_name'),
                controller: _name,
                enabled: !_saving,
                maxLength: 120,
                buildCounter: noCharCounter,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: widget.isTemplate
                      ? 'Ej.: Instalación eléctrica'
                      : 'Ej.: Tina – Remodelación de paneles',
                ),
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            LabeledField(
              label: widget.isTemplate
                  ? 'Descripción'
                  : 'Descripción (opcional)',
              child: TextField(
                key: const ValueKey('create_work_description'),
                controller: _description,
                enabled: !_saving,
                maxLength: 2000,
                minLines: 2,
                maxLines: 5,
                buildCounter: webCharCounter,
                decoration: InputDecoration(
                  hintText: widget.isTemplate
                      ? 'Opcional: se copia al objetivo al insertarla'
                      : 'De qué se trata el proyecto',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
