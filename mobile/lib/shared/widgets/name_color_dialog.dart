import 'package:flutter/material.dart';
import 'color_palette.dart';
import 'state_views.dart';
import 'error_text.dart';

Future<bool> showNameColorDialog(
  BuildContext context, {
  required String title,
  String name = '',
  String? color,
  bool withColor = false,
  bool requiredColor = false,
  int maxLength = 80,
  required Future<void> Function(String name, String? color) onSave,
}) async =>
    await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _NameColorDialog(
        title: title,
        name: name,
        color: color,
        withColor: withColor,
        requiredColor: requiredColor,
        maxLength: maxLength,
        onSave: onSave,
      ),
    ) ??
    false;

class _NameColorDialog extends StatefulWidget {
  const _NameColorDialog({
    required this.title,
    required this.name,
    required this.color,
    required this.withColor,
    required this.requiredColor,
    required this.maxLength,
    required this.onSave,
  });
  final String title, name;
  final String? color;
  final bool withColor, requiredColor;
  final int maxLength;
  final Future<void> Function(String, String?) onSave;
  @override
  State<_NameColorDialog> createState() => _NameColorDialogState();
}

class _NameColorDialogState extends State<_NameColorDialog> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.name);
  late String? _color = widget.color;
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    if (widget.requiredColor && _color == null) {
      setState(() => _error = 'Elegí un color');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSave(_name.text.trim(), _color);
      if (mounted) Navigator.pop(context, true);
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
      title: Text(widget.title),
      scrollable: true,
      content: SizedBox(
        width: 400,
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                key: const ValueKey('name_color_name'),
                controller: _name,
                enabled: !_busy,
                maxLength: widget.maxLength,
                decoration: const InputDecoration(labelText: 'Nombre'),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Ingresá un nombre' : null,
              ),
              if (widget.withColor)
                ColorPalette(
                  value: _color,
                  onChanged: _busy ? null : (v) => setState(() => _color = v),
                ),
              if (_error != null) ErrorText(_error!),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('name_color_save'),
          onPressed: _busy ? null : _save,
          child: Text(_busy ? 'Guardando…' : 'Guardar'),
        ),
      ],
    ),
  );
}
