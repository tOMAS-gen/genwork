import '../../core/theme/app_geometry.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/work.dart';
import '../../data/models/work_catalog.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import 'works_providers.dart';
import '../../shared/widgets/error_text.dart';
import '../../core/theme/app_icons.dart';

Future<void> showWorkMetadata(
  BuildContext context,
  WorkDetail work, {
  required bool labels,
}) => showAppFormDialog<void>(
  context,
  barrierDismissible: false,
  builder: (_) => _MetadataDialog(work: work, labels: labels),
);

class _MetadataDialog extends ConsumerStatefulWidget {
  const _MetadataDialog({required this.work, required this.labels});
  final WorkDetail work;
  final bool labels;
  @override
  ConsumerState<_MetadataDialog> createState() => _MetadataDialogState();
}

class _MetadataDialogState extends ConsumerState<_MetadataDialog> {
  bool _busy = false;
  String? _error;
  String _search = '';
  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (!mounted) return;
      refreshResources(ref);
      // Leer lo que persistió el servidor, incluida la anterior principal.
      await ref.read(workDetailProvider(widget.work.id).future);
      if (mounted && !widget.labels) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = ref.watch(workDetailProvider(widget.work.id));
    final work = current.value ?? widget.work;
    final allowed =
        current.hasValue &&
        !current.hasError &&
        work.canOperate &&
        (widget.labels || !work.isArchived);
    final enabled = allowed && !_busy;
    final repository = ref.read(worksRepositoryProvider);
    return PopScope(
      canPop: !_busy,
      child: AppWorkDialog(
        title: widget.labels ? 'Etiquetas del proyecto' : 'Etapa de producción',
        closeEnabled: !_busy,
        actions: [
          TextButton(
            key: const ValueKey('metadata_close'),
            onPressed: _busy ? null : () => Navigator.pop(context),
            child: const Text('Listo'),
          ),
        ],
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (current.hasError)
              ErrorView(
                error: current.error!,
                onRetry: () => ref.invalidate(workDetailProvider(work.id)),
              ),
            if (_error != null) ErrorText(_error!),
            if (_busy) const LinearProgressIndicator(),
            if (!widget.labels)
              AsyncValueView(
                value: ref.watch(workStagesProvider(work.groupId)),
                onRetry: () => ref.invalidate(workStagesProvider(work.groupId)),
                data: (stages) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
                      key: const ValueKey('work_stage_none'),
                      title: const Text('Sin etapa'),
                      trailing: work.stageId == null
                          ? const Icon(AppIcons.check)
                          : null,
                      onTap: enabled
                          ? () => _run(() => repository.setStage(work.id, null))
                          : null,
                    ),
                    for (final stage in stages)
                      ListTile(
                        key: ValueKey('work_stage_${stage.id}'),
                        leading: ColorDot(hex: stage.color),
                        title: Text(stage.name),
                        trailing: work.stageId == stage.id
                            ? const Icon(AppIcons.check)
                            : null,
                        onTap: enabled
                            ? () => _run(
                                () => repository.setStage(work.id, stage.id),
                              )
                            : null,
                      ),
                    if (stages.isEmpty)
                      const Text('No hay etapas configuradas en este ámbito.'),
                  ],
                ),
              ),
            if (widget.labels) ...[
              const Text('Asignadas'),
              if (work.labels.isEmpty) const Text('Sin etiquetas'),
              for (final label in work.labels)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: ColorDot(hex: label.color),
                  title: Text(label.valueName),
                  subtitle: Text(
                    '${label.keyName}${label.isPrimary ? ' · Principal' : ''}',
                  ),
                  trailing: IconButton(
                    key: ValueKey('work_label_remove_${label.valueId}'),
                    tooltip: 'Quitar ${label.valueName}',
                    onPressed:
                        !enabled || label.keyId == null || label.valueId == null
                        ? null
                        : () => _run(
                            () => repository.removeLabel(
                              work.id,
                              keyId: label.keyId!,
                              valueId: label.valueId!,
                            ),
                          ),
                    icon: const Icon(AppIcons.close),
                  ),
                ),
              const Divider(),
              TextField(
                key: const ValueKey('work_label_search'),
                decoration: const InputDecoration(labelText: 'Buscar etiqueta'),
                onChanged: (v) =>
                    setState(() => _search = v.trim().toLowerCase()),
              ),
              AsyncValueView(
                value: ref.watch(workLabelsProvider(work.groupId)),
                onRetry: () => ref.invalidate(workLabelsProvider(work.groupId)),
                data: (labels) {
                  final options = labels
                      .where(
                        (l) => '${l.keyName} ${l.valueName}'
                            .toLowerCase()
                            .contains(_search),
                      )
                      .toList();
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (options.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(AppSpacing.md),
                          child: Text('No hay etiquetas disponibles.'),
                        ),
                      for (final label in options)
                        _labelOption(label, work, enabled),
                    ],
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _labelOption(LabelOption label, WorkDetail work, bool enabled) {
    final assigned = work.labels
        .where((l) => l.valueId == label.valueId)
        .firstOrNull;
    final repository = ref.read(worksRepositoryProvider);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: ColorDot(hex: label.color),
            title: Text(label.valueName),
            subtitle: Text('${label.keyName} · ${label.scopeLabel}'),
          ),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              OutlinedButton(
                key: ValueKey('work_label_primary_${label.valueId}'),
                onPressed: !enabled || assigned?.isPrimary == true
                    ? null
                    : () => _run(
                        () => repository.assignLabel(
                          work.id,
                          label,
                          primary: true,
                        ),
                      ),
                child: Text(
                  assigned?.isPrimary == true
                      ? 'Principal'
                      : 'Usar como principal',
                ),
              ),
              TextButton(
                key: ValueKey('work_label_add_${label.valueId}'),
                onPressed: !enabled || assigned != null
                    ? null
                    : () => _run(() => repository.assignLabel(work.id, label)),
                child: Text(
                  assigned == null ? 'Agregar secundaria' : 'Asignada',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
