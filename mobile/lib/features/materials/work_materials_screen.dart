import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/material.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/error_text.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/labeled_field.dart';
import '../../shared/widgets/state_views.dart';
import '../works/works_providers.dart';
import 'materials_providers.dart';
import '../works/project_breadcrumb.dart';

/// Pestaña Materiales del proyecto, como `MaterialsPanel` de la web: buscar
/// en Genstock ("Solo insumos"), agregar con cantidad y notas, y la lista con
/// cantidad, notas, editar y quitar. Quien solo lee ve la lista.
class WorkMaterialsScreen extends ConsumerStatefulWidget {
  const WorkMaterialsScreen({super.key, required this.workId});

  final String workId;

  @override
  ConsumerState<WorkMaterialsScreen> createState() =>
      _WorkMaterialsScreenState();
}

class _WorkMaterialsScreenState extends ConsumerState<WorkMaterialsScreen> {
  final _query = TextEditingController();
  final _searchFocus = FocusNode();
  final _quantity = TextEditingController(text: '1');
  final _notes = TextEditingController();
  Timer? _debounce;
  bool _supplyOnly = true;
  bool _searching = false;
  bool _saving = false;
  GenstockSearch? _results;
  GenstockProduct? _selected;
  String? _error;

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    _searchFocus.dispose();
    _quantity.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _search() {
    _debounce?.cancel();
    final q = _query.text.trim();
    setState(() {
      _selected = null;
      _error = null;
      if (q.length < 2) {
        _results = null;
        _searching = false;
      } else {
        _searching = true;
      }
    });
    if (q.length < 2) return;
    // Como la web: espera 250 ms después de la última tecla.
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final results = await ref
            .read(materialsRepositoryProvider)
            .search(q, supplyOnly: _supplyOnly);
        if (mounted && _query.text.trim() == q) {
          setState(() => _results = results);
        }
      } catch (e) {
        if (mounted) setState(() => _error = errorMessage(e));
      } finally {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await action();
      ref.invalidate(workMaterialsProvider(widget.workId));
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _add() => _run(() async {
    await ref
        .read(materialsRepositoryProvider)
        .add(
          widget.workId,
          productId: _selected!.id,
          quantityRequired: _quantity.text.trim().replaceAll(',', '.'),
          notes: _notes.text,
        );
    _query.clear();
    _quantity.text = '1';
    _notes.clear();
    setState(() {
      _selected = null;
      _results = null;
    });
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final work = ref.watch(workDetailProvider(widget.workId)).value;
    final editable =
        (work?.canOperate ?? false) &&
        !(work?.isArchived ?? false) &&
        ref.watch(currentUserProvider)?.isWriter == true;
    final materials = ref.watch(workMaterialsProvider(widget.workId));
    final assigned = <String>{
      for (final m in materials.value ?? const <WorkMaterial>[]) m.productId,
    };

    return GenPageScaffold(
      title: 'Materiales',
      breadcrumb: ProjectBreadcrumb(workId: widget.workId),
      showBack: true,
      onRefresh: () => ref.refresh(workMaterialsProvider(widget.workId).future),
      body: ListView(
        key: const ValueKey('materials_list'),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          if (editable) ...[
            // Buscador a lo ancho y "Solo insumos" en su propia fila
            // (P07M-M2).
            TextField(
              key: const ValueKey('materials_search'),
              controller: _query,
              focusNode: _searchFocus,
              onChanged: (_) => _search(),
              decoration: const InputDecoration(
                hintText: 'Buscar producto en Genstock',
                prefixIcon: Icon(AppIcons.search, size: AppIconSizes.action),
              ),
            ),
            // El interruptor se anuncia como "Solo insumos" (T1).
            MergeSemantics(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Solo insumos',
                      style: AppTextStyles.body.copyWith(color: c.text),
                    ),
                  ),
                  Switch(
                    key: const ValueKey('materials_supply_only'),
                    value: _supplyOnly,
                    onChanged: (v) {
                      setState(() => _supplyOnly = v);
                      _search();
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (_query.text.trim().length >= 2 && _selected == null)
              _Results(
                searching: _searching,
                results: _results,
                assigned: assigned,
                onSelect: (p) => setState(() => _selected = p),
              ),
            if (_selected != null)
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: c.surface,
                  border: Border.all(color: c.border),
                  borderRadius: AppGeometry.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _selected!.name,
                      style: AppTextStyles.itemTitle.copyWith(color: c.text),
                    ),
                    Text(
                      _selected!.code,
                      style: AppTextStyles.supporting.copyWith(color: c.muted),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    LabeledField(
                      label: 'Cantidad necesaria',
                      child: TextField(
                        key: const ValueKey('materials_quantity'),
                        controller: _quantity,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    LabeledField(
                      label: 'Notas',
                      child: TextField(
                        key: const ValueKey('materials_notes'),
                        controller: _notes,
                        maxLength: 280,
                        buildCounter: noCharCounter,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.icon(
                        key: const ValueKey('materials_add'),
                        onPressed: _saving ? null : _add,
                        icon: const Icon(AppIcons.check),
                        label: const Text('Agregar'),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: AppSpacing.md),
          ],
          if (_error != null) ...[
            ErrorText(_error!),
            const SizedBox(height: AppSpacing.sm),
          ],
          AsyncValueView(
            value: materials,
            onRetry: () => ref.invalidate(workMaterialsProvider(widget.workId)),
            data: (list) => list.isEmpty
                // El vacío ofrece empezar el alta: buscar el producto
                // (P07M-M3).
                ? EmptyView(
                    icon: AppIcons.materials,
                    title: 'Sin materiales asignados',
                    message:
                        'Agregá productos de Genstock para calcular lo necesario en este proyecto.',
                    actionKey: const ValueKey('materials_empty_add'),
                    actionLabel: editable ? 'Agregar material' : null,
                    onAction: editable ? _searchFocus.requestFocus : null,
                  )
                : Column(
                    children: [
                      for (final m in list)
                        _MaterialCard(
                          material: m,
                          editable: editable && !_saving,
                          onEdit: () => _edit(m),
                          onRemove: () => _run(
                            () => ref
                                .read(materialsRepositoryProvider)
                                .remove(widget.workId, m.id),
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _edit(WorkMaterial m) async {
    final quantity = TextEditingController(text: m.quantityRequired);
    final notes = TextEditingController(text: m.notes ?? '');
    final saved = await showAppFormDialog<bool>(
      context,
      builder: (context) => AppWorkDialog(
        title: m.productName,
        subtitle: m.code,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('materials_edit_save'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Guardar'),
          ),
        ],
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LabeledField(
              label: 'Cantidad necesaria',
              child: TextField(
                key: const ValueKey('materials_edit_quantity'),
                controller: quantity,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            LabeledField(
              label: 'Notas',
              child: TextField(
                key: const ValueKey('materials_edit_notes'),
                controller: notes,
                maxLength: 280,
                buildCounter: noCharCounter,
              ),
            ),
          ],
        ),
      ),
    );
    if (saved == true) {
      await _run(
        () => ref
            .read(materialsRepositoryProvider)
            .update(
              widget.workId,
              m.id,
              quantityRequired: quantity.text.trim().replaceAll(',', '.'),
              notes: notes.text.trim(),
            ),
      );
    }
    quantity.dispose();
    notes.dispose();
  }
}

class _Results extends StatelessWidget {
  const _Results({
    required this.searching,
    required this.results,
    required this.assigned,
    required this.onSelect,
  });

  final bool searching;
  final GenstockSearch? results;
  final Set<String> assigned;
  final ValueChanged<GenstockProduct> onSelect;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final muted = AppTextStyles.body.copyWith(color: c.muted);
    if (searching) return Text('Buscando productos...', style: muted);
    final items = results?.items ?? const <GenstockProduct>[];
    if (items.isEmpty) {
      return Text('Sin productos para esta búsqueda.', style: muted);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (results!.fallback)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
            child: Text(
              'Ningún insumo coincide: se muestran productos de todo el catálogo.',
              style: muted,
            ),
          ),
        for (final p in items)
          ListTile(
            key: ValueKey('materials_result_${p.id}'),
            contentPadding: EdgeInsets.zero,
            title: Text(p.name),
            subtitle: Text(p.code),
            trailing: assigned.contains(p.id)
                ? Text('Ya asignado', style: muted)
                : null,
            enabled: !assigned.contains(p.id),
            onTap: () => onSelect(p),
          ),
      ],
    );
  }
}

class _MaterialCard extends StatelessWidget {
  const _MaterialCard({
    required this.material,
    required this.editable,
    required this.onEdit,
    required this.onRemove,
  });

  final WorkMaterial material;
  final bool editable;
  final VoidCallback onEdit, onRemove;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Card(
        key: ValueKey('material_${material.id}'),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      material.productName,
                      style: AppTextStyles.itemTitle.copyWith(
                        fontWeight: FontWeight.w700,
                        color: c.text,
                      ),
                    ),
                    Text(
                      material.code,
                      style: AppTextStyles.supporting.copyWith(color: c.muted),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      material.quantityLabel,
                      style: AppTextStyles.body.copyWith(color: c.text),
                    ),
                    Text(
                      material.notes?.isNotEmpty == true
                          ? material.notes!
                          : 'Sin notas',
                      style: AppTextStyles.body.copyWith(color: c.muted),
                    ),
                  ],
                ),
              ),
              if (editable) ...[
                IconButton(
                  key: ValueKey('material_edit_${material.id}'),
                  tooltip: 'Editar ${material.productName}',
                  onPressed: onEdit,
                  icon: Icon(
                    AppIcons.edit,
                    size: AppIconSizes.action,
                    color: c.muted,
                  ),
                ),
                IconButton(
                  key: ValueKey('material_remove_${material.id}'),
                  tooltip: 'Quitar ${material.productName}',
                  onPressed: onRemove,
                  icon: Icon(
                    AppIcons.delete,
                    size: AppIconSizes.action,
                    color: c.muted,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
