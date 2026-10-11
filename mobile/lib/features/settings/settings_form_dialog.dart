import 'package:flutter/material.dart';
import '../../data/models/json.dart';
import '../../shared/widgets/state_views.dart';
import '../../core/theme/app_geometry.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/color_palette.dart';

class SettingsField {
  const SettingsField(
    this.name,
    this.label, {
    this.initial = '',
    this.required = true,
    this.secret = false,
    this.maxLength = 200,
    this.options,
    this.color = false,
    this.validate,
  });
  final String name, label, initial;
  final bool required, secret, color;
  final int maxLength;
  final Map<String, String>? options;
  final String? Function(String)? validate;
}

Future<bool> settingsConfirm(
  BuildContext context,
  String title,
  String message, {
  String action = 'Confirmar',
}) async =>
    await showAppFormDialog<bool>(
      context,
      builder: (context) => AppWorkDialog(
        title: title,
        onClose: () => Navigator.pop(context, false),
        actions: [
          TextButton(
            key: const ValueKey('settings_confirm_cancel'),
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('settings_confirm_accept'),
            onPressed: () => Navigator.pop(context, true),
            child: Text(action),
          ),
        ],
        child: Text(message),
      ),
    ) ??
    false;

Future<bool?> settingsForm(
  BuildContext context, {
  required String title,
  String? description,
  required List<SettingsField> fields,
  required Future<void> Function(Json) save,
}) => showAppFormDialog<bool>(
  context,
  barrierDismissible: false,
  builder: (_) => SettingsFormDialog(
    title: title,
    description: description,
    fields: fields,
    save: save,
  ),
);

class SettingsFormDialog extends StatefulWidget {
  const SettingsFormDialog({
    super.key,
    required this.title,
    this.description,
    required this.fields,
    required this.save,
  });
  final String title;
  final String? description;
  final List<SettingsField> fields;
  final Future<void> Function(Json) save;
  @override
  State<SettingsFormDialog> createState() => _SettingsFormDialogState();
}

class _SettingsFormDialogState extends State<SettingsFormDialog> {
  final _form = GlobalKey<FormState>();
  late final _controllers = {
    for (final f in widget.fields)
      f.name: TextEditingController(text: f.initial),
  };
  bool _busy = false;
  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await widget.save({
        for (final f in widget.fields)
          f.name: f.secret
              ? _controllers[f.name]!.text
              : _controllers[f.name]!.text.trim(),
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AppWorkDialog(
      title: widget.title,
      closeEnabled: !_busy,
      onClose: () => Navigator.pop(context, false),
      actions: [
        TextButton(
          key: const ValueKey('settings_form_cancel'),
          onPressed: _busy ? null : () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('settings_form_save'),
          onPressed: _busy ? null : _save,
          child: Text(_busy ? 'Guardando…' : 'Guardar'),
        ),
      ],
      child: SizedBox(
        width: AppGeometry.dialogNarrow,
        child: SingleChildScrollView(
          child: Form(
            key: _form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.description != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Text(widget.description!),
                  ),
                for (final f in widget.fields)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      vertical: AppSpacing.xs,
                    ),
                    child: f.options != null
                        ? DropdownButtonFormField<String>(
                            key: ValueKey('settings_field_${f.name}'),
                            initialValue: f.initial.isEmpty ? null : f.initial,
                            isExpanded: true,
                            decoration: InputDecoration(labelText: f.label),
                            items: f.options!.entries
                                .map(
                                  (e) => DropdownMenuItem(
                                    value: e.key,
                                    child: Text(
                                      e.value,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: _busy
                                ? null
                                : (v) => _controllers[f.name]!.text = v ?? '',
                            validator: (v) => f.required && (v?.isEmpty ?? true)
                                ? 'Elegí una opción.'
                                : null,
                          )
                        : f.color
                        ? ColorPalette(
                            label: f.label,
                            allowClear: false,
                            value: _controllers[f.name]!.text.isEmpty
                                ? null
                                : _controllers[f.name]!.text,
                            onChanged: _busy
                                ? null
                                : (hex) => setState(
                                    () =>
                                        _controllers[f.name]!.text = hex ?? '',
                                  ),
                          )
                        : TextFormField(
                            key: ValueKey('settings_field_${f.name}'),
                            controller: _controllers[f.name],
                            enabled: !_busy,
                            obscureText: f.secret,
                            autocorrect: !f.secret,
                            enableSuggestions: !f.secret,
                            decoration: InputDecoration(labelText: f.label),
                            maxLength: f.maxLength,
                            validator: (value) {
                              final v = f.secret
                                  ? value ?? ''
                                  : (value ?? '').trim();
                              if (f.required && v.isEmpty) {
                                return 'Completá este campo.';
                              }
                              if (v.length > f.maxLength) {
                                return 'Máximo ${f.maxLength} caracteres.';
                              }
                              return f.validate?.call(v);
                            },
                          ),
                  ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
