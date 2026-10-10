import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import 'objectives_providers.dart';
import '../../shared/widgets/error_text.dart';

Future<void> showObjectiveDialog(
  BuildContext context,
  String workId, {
  Objective? objective,
  bool fromTemplate = false,
}) => showDialog<void>(
  context: context,
  barrierDismissible: false,
  builder: (_) => _ObjectiveDialog(
    workId: workId,
    objective: objective,
    fromTemplate: fromTemplate,
  ),
);

class _ObjectiveDialog extends ConsumerStatefulWidget {
  const _ObjectiveDialog({
    required this.workId,
    this.objective,
    required this.fromTemplate,
  });
  final String workId;
  final Objective? objective;
  final bool fromTemplate;
  @override
  ConsumerState<_ObjectiveDialog> createState() => _ObjectiveDialogState();
}

class _ObjectiveDialogState extends ConsumerState<_ObjectiveDialog> {
  late final _title = TextEditingController(
    text: widget.objective?.title ?? '',
  );
  late final _description = TextEditingController(
    text: widget.objective?.description ?? '',
  );
  String? _templateId;
  Object? _error;
  bool _saving = false;
  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving ||
        (widget.fromTemplate
            ? _templateId == null
            : _title.text.trim().isEmpty)) {
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final repo = ref.read(objectivesRepositoryProvider);
      if (widget.fromTemplate) {
        await repo.insert(widget.workId, _templateId!, _title.text.trim());
      } else if (widget.objective != null) {
        await repo.update(
          widget.objective!.id,
          _title.text.trim(),
          _description.text.trim(),
        );
      } else {
        await repo.create(
          widget.workId,
          _title.text.trim(),
          _description.text.trim(),
        );
      }
      if (mounted) {
        refreshResources(ref);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final templates = widget.fromTemplate ? ref.watch(templatesProvider) : null;
    return PopScope(
      canPop: !_saving,
      child: AlertDialog(
        title: Text(
          widget.fromTemplate
              ? 'Insertar plantilla'
              : widget.objective == null
              ? 'Nuevo objetivo'
              : 'Editar objetivo',
        ),
        scrollable: true,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.fromTemplate) ...[
              const Text(
                'Se copiarán las tareas pendientes como un objetivo independiente.',
              ),
              if (templates!.isLoading) const LinearProgressIndicator(),
              if (templates.hasError)
                ErrorView(
                  error: templates.error!,
                  onRetry: () => ref.invalidate(templatesProvider),
                ),
              if (templates.hasValue && templates.value!.isEmpty)
                const Text('No hay plantillas disponibles.'),
              for (final item in templates.value ?? const [])
                ListTile(
                  key: ValueKey('objective_template_${item.id}'),
                  title: Text(item.name),
                  subtitle: Text(
                    '${item.groupName ?? 'Personal'} · ${item.copyableTaskCount} ${item.copyableTaskCount == 1 ? 'tarea para copiar' : 'tareas para copiar'}',
                  ),
                  selected: _templateId == item.id,
                  trailing: _templateId == item.id
                      ? const Icon(Icons.check)
                      : null,
                  onTap: _saving
                      ? null
                      : () => setState(() => _templateId = item.id),
                ),
            ],
            TextField(
              key: const ValueKey('objective_title'),
              controller: _title,
              enabled: !_saving,
              maxLength: 120,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                labelText: widget.fromTemplate ? 'Título (opcional)' : 'Título',
              ),
            ),
            if (!widget.fromTemplate) ...[
              const SizedBox(height: AppSpace.md),
              TextField(
                key: const ValueKey('objective_description'),
                controller: _description,
                enabled: !_saving,
                maxLength: 2000,
                minLines: 2,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Descripción (opcional)',
                ),
              ),
            ],
            if (_error != null) ErrorText(errorMessage(_error!)),
          ],
        ),
        actions: [
          TextButton(
            key: const ValueKey('objective_cancel'),
            onPressed: _saving ? null : () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('objective_save'),
            onPressed:
                _saving ||
                    (widget.fromTemplate
                        ? _templateId == null
                        : _title.text.trim().isEmpty)
                ? null
                : _save,
            child: Text(
              _saving
                  ? 'Guardando…'
                  : widget.fromTemplate
                  ? 'Insertar'
                  : 'Guardar',
            ),
          ),
        ],
      ),
    );
  }
}
