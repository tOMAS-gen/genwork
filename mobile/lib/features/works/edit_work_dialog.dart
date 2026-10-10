import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import '../../shared/widgets/error_text.dart';

Future<void> showEditWorkDialog(BuildContext context, WorkDetail work) =>
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _EditWorkDialog(work: work),
    );

class _EditWorkDialog extends ConsumerStatefulWidget {
  const _EditWorkDialog({required this.work});
  final WorkDetail work;
  @override
  ConsumerState<_EditWorkDialog> createState() => _EditWorkDialogState();
}

class _EditWorkDialogState extends ConsumerState<_EditWorkDialog> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.work.name);
  late final _description = TextEditingController(
    text: widget.work.description,
  );
  late DateTime? _date = widget.work.dueDate;
  bool _dateChanged = false, _saving = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(worksRepositoryProvider)
          .update(
            widget.work.id,
            name: _name.text.trim(),
            description: widget.work.isArchived
                ? null
                : _description.text.trim(),
            dueDate: _dateChanged ? _date : null,
            clearDueDate: _dateChanged && _date == null,
          );
      if (!mounted) return;
      refreshResources(ref);
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = errorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_saving,
    child: AlertDialog(
      title: Text(
        widget.work.isArchived
            ? 'Renombrar proyecto'
            : widget.work.isTemplate
            ? 'Editar plantilla'
            : 'Editar proyecto',
      ),
      scrollable: true,
      content: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              key: const ValueKey('edit_work_name'),
              controller: _name,
              enabled: !_saving,
              maxLength: 120,
              decoration: const InputDecoration(labelText: 'Nombre'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Ingresá un nombre' : null,
            ),
            if (!widget.work.isArchived) ...[
              const SizedBox(height: AppSpace.md),
              TextFormField(
                key: const ValueKey('edit_work_description'),
                controller: _description,
                enabled: !_saving,
                maxLength: 2000,
                minLines: 2,
                maxLines: 5,
                decoration: const InputDecoration(labelText: 'Descripción'),
              ),
              const SizedBox(height: AppSpace.md),
              ListTile(
                key: const ValueKey('edit_work_due_date'),
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today_outlined),
                title: Text(
                  _date == null
                      ? 'Sin vencimiento'
                      : 'Vence ${formatDay(_date!)}',
                ),
                onTap: _saving
                    ? null
                    : () async {
                        final initial = _date ?? DateTime.now();
                        final date = await showDatePicker(
                          context: context,
                          initialDate: initial,
                          firstDate: DateTime(
                            initial.year < 2000 ? initial.year : 2000,
                          ),
                          lastDate: DateTime(
                            initial.year > 2100 ? initial.year : 2100,
                            12,
                            31,
                          ),
                        );
                        if (date != null && mounted) {
                          setState(() {
                            _date = date;
                            _dateChanged = true;
                          });
                        }
                      },
                trailing: _date == null
                    ? null
                    : IconButton(
                        key: const ValueKey('edit_work_clear_due'),
                        tooltip: 'Quitar vencimiento',
                        onPressed: _saving
                            ? null
                            : () => setState(() {
                                _date = null;
                                _dateChanged = true;
                              }),
                        icon: const Icon(Icons.close),
                      ),
              ),
            ],
            if (_error != null) ErrorText(_error!),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('edit_work_save'),
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Guardando…' : 'Guardar'),
        ),
      ],
    ),
  );
}
