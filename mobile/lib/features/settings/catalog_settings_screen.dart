import 'catalogs_providers.dart';
import 'package:flutter/material.dart';
import '../../shared/widgets/status_chip.dart';
import '../../shared/widgets/settings_rows.dart';
import '../../shared/widgets/row_actions_menu.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/network/api_exception.dart';
import '../../data/models/json.dart';
import '../../data/repositories/catalogs_repository.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../works/works_providers.dart';
import '../sectors/sectors_providers.dart';
import 'settings_form_dialog.dart';
import 'settings_providers.dart';
import 'settings_tabs.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_dropdown_decoration.dart';
import '../../core/util/format.dart';

class CatalogSettingsScreen extends ConsumerStatefulWidget {
  const CatalogSettingsScreen({
    super.key,
    required this.kind,
    this.initialScope = 'personal',
  });
  final CatalogKind kind;
  final String initialScope;
  @override
  ConsumerState<CatalogSettingsScreen> createState() =>
      _CatalogSettingsScreenState();
}

class _CatalogSettingsScreenState extends ConsumerState<CatalogSettingsScreen> {
  late String scope = widget.initialScope;
  bool busy = false;
  @override
  void didUpdateWidget(covariant CatalogSettingsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialScope != widget.initialScope) {
      scope = widget.initialScope;
    }
  }

  CatalogQuery get query => (
    kind: widget.kind,
    scope: scope,
    ownerId: ref.read(currentUserProvider)?.id,
  );
  CatalogsRepository get repo => ref.read(catalogsRepositoryProvider);
  void refresh() {
    ref.invalidate(catalogDataProvider);
    refreshCatalogs(ref);
  }

  Future<void> mutation(Future<void> Function() action) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await action();
      if (mounted) refresh();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> edit(Json? item, {String? keyId, bool value = false}) async {
    final target = query;
    final done = await settingsForm(
      context,
      title: item == null
          ? (value
                ? 'Agregar valor'
                : 'Agregar ${widget.kind == CatalogKind.labels
                      ? 'etiqueta'
                      : widget.kind == CatalogKind.stages
                      ? 'etapa'
                      : 'estado'}')
          : 'Editar ${item['name']}',
      fields: [
        SettingsField(
          'name',
          'Nombre',
          initial: item?['name'] ?? '',
          maxLength: 80,
        ),
        if (value || widget.kind != CatalogKind.labels)
          SettingsField(
            'color',
            'Color',
            initial: item?['color'] ?? '#3b5bfa',
            color: true,
          ),
        if (widget.kind == CatalogKind.statuses)
          SettingsField(
            'type',
            'Tipo',
            initial:
                item?['type'] ??
                ((asJson(
                                      ref
                                          .read(catalogDataProvider(target))
                                          .value,
                                    )?['statuses']
                                    as List?)
                                ?.isEmpty ==
                            true &&
                        !target.scope.startsWith('sector:')
                    ? 'FINAL'
                    : 'IN_PROGRESS'),
            options: const {'IN_PROGRESS': 'En curso', 'FINAL': 'Final'},
          ),
      ],
      save: (input) async {
        if (value) {
          if (item == null) {
            await repo.createValue(keyId!, input);
          } else {
            await repo.updateValue(item['id'], input);
          }
        } else if (item == null) {
          await repo.create(target, input);
        } else {
          await repo.update(target, item['id'], input);
        }
      },
    );
    if (done == true && mounted) refresh();
  }

  Future<void> remove(Json item, {bool value = false}) async {
    final target = query;
    if (!await settingsConfirm(
          context,
          '¿Eliminar ${item['name']}?',
          widget.kind == CatalogKind.stages
              ? 'Los proyectos que usan esta etapa quedarán sin etapa.'
              : 'Se eliminará del catálogo. Si está en uso, se informará el impacto antes de confirmar.',
          action: 'Eliminar',
        ) ||
        !mounted) {
      return;
    }
    await mutation(() async {
      Future<void> perform(bool confirm) => value
          ? repo.deleteValue(item['id'], confirm: confirm)
          : repo.delete(target, item['id'], confirm: confirm);
      try {
        await perform(false);
      } on ApiException catch (e) {
        final details = asJson(e.extra['details']) ?? e.extra;
        final count = details['affectedWorks'] ?? details['affectedTasks'];
        if (e.status != 409 ||
            count == null ||
            details['reason'] == 'HAS_TASKS') {
          rethrow;
        }
        if (!mounted) return;
        if (await settingsConfirm(
          context,
          'Elemento en uso',
          e.message,
          action: 'Eliminar de todas formas',
        )) {
          await perform(true);
        }
      }
    });
  }

  Future<void> move(List<Json> items, int index, int delta) async {
    final target = query;
    final list = [...items];
    final other = index + delta;
    if (other < 0 || other >= list.length) return;
    await mutation(() async {
      if (widget.kind == CatalogKind.stages) {
        final current = list.removeAt(index);
        list.insert(other, current);
        await repo.reorderStages(list.map((e) => e['id'] as String).toList());
      } else {
        // El servidor resuelve los IDs heredados dentro de asSectorId.
        await repo.update(target, items[index]['id'], {
          'sortOrder': items[other]['sortOrder'],
        });
        try {
          await repo.update(target, items[other]['id'], {
            'sortOrder': items[index]['sortOrder'],
          });
        } finally {
          if (mounted) refresh();
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final groups = ref.watch(groupsProvider);
    final sectors = widget.kind == CatalogKind.statuses
        ? ref.watch(sectorsProvider)
        : null;
    final choices = {
      'personal': 'Personal',
      if (widget.kind != CatalogKind.stages) 'global': 'Global',
      for (final g in groups.value ?? []) 'group:${g.id}': 'Grupo: ${g.name}',
      for (final s in sectors?.value ?? [])
        'sector:${s.id}': 'Sector: ${s.name}',
    };
    if (!choices.containsKey(scope)) choices[scope] = 'Ámbito seleccionado';
    final response = ref.watch(catalogDataProvider(query));
    final json = asJson(response.value);
    final items = parseList(
      widget.kind == CatalogKind.statuses
          ? (json?['statuses'])
          : response.value,
      (v) => v,
    );
    final canManage =
        scope == 'personal' ||
        (scope == 'global'
            ? user?.isSuperAdmin == true
            : (groups.value ?? []).any(
                (g) => scope == 'group:${g.id}' && g.canManage(user),
              ));
    final canWrite = widget.kind == CatalogKind.statuses
        ? (json?['canWrite'] == true)
        : canManage;
    final inherited = json?['inherited'] == true;
    final c = context.colors;
    return GenPageScaffold(
      title: widget.kind.title,
      // Una línea en las tres, para que el campo empiece a la misma altura
      // (P28L-M4, P29-M1).
      subtitle: switch (widget.kind) {
        CatalogKind.stages => 'Pasos por los que avanza un proyecto.',
        CatalogKind.labels => 'Clasifican proyectos y tareas.',
        CatalogKind.statuses =>
          'Un estado final por ámbito; los sectores pueden tener el suyo.',
      },
      top: SettingsTabs(current: widget.kind.name),
      showBack: true,
      bodyPadding: EdgeInsets.zero,
      onRefresh: () async {
        ref.invalidate(catalogDataProvider(query));
        await ref.read(catalogDataProvider(query).future);
      },
      body: ListView(
        key: const ValueKey('catalog_list'),
        padding: AppSpace.page,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          // Rótulo «ÁMBITO» y, en una sola fila, el desplegable y «Agregar»
          // compacto (P28E-M1, P28E-M2).
          Text(
            'ÁMBITO',
            style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
          ),
          const SizedBox(height: AppSpacing.xxs + AppSpacing.hairline),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  icon: const AppDropdownIcon(),
                  key: const ValueKey('catalog_scope'),
                  initialValue: scope,
                  isExpanded: true,
                  style: AppTextStyles.body.copyWith(color: c.text),
                  decoration: const InputDecoration(),
                  items: choices.entries
                      .map(
                        (e) => DropdownMenuItem(
                          value: e.key,
                          child: Text(
                            e.value,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: busy
                      ? null
                      : (v) => setState(() => scope = v ?? 'personal'),
                ),
              ),
              if (response.hasValue && canWrite) ...[
                const SizedBox(width: AppSpacing.xs),
                FilledButton.icon(
                  key: const ValueKey('catalog_add'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                    ),
                  ),
                  onPressed: busy ? null : () => edit(null),
                  icon: const Icon(AppIcons.add, size: AppIconSizes.field),
                  label: const Text('Agregar'),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (groups.hasError)
            ErrorView(
              error: groups.error!,
              onRetry: () => ref.invalidate(groupsProvider),
            ),
          if (sectors?.hasError == true)
            ErrorView(
              error: sectors!.error!,
              onRetry: () => ref.invalidate(sectorsProvider),
            ),
          if (busy) const LinearProgressIndicator(),
          if (response.hasError)
            ErrorView(
              error: response.error!,
              onRetry: () => ref.invalidate(catalogDataProvider(query)),
            ),
          if (response.isLoading && !response.hasValue) const LoadingView(),
          if (inherited)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Text(
                'Este sector hereda sus estados. Al editar se crea un conjunto propio sin cambiar los demás.',
              ),
            ),
          if (response.hasValue) ...[
            if (!canWrite)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: Text(
                  'Solo lectura: no tenés permiso para administrar este ámbito.',
                  style: AppTextStyles.body.copyWith(color: c.muted),
                ),
              ),
            if (items.isEmpty)
              EmptyView(
                icon: widget.kind == CatalogKind.labels
                    ? AppIcons.label
                    : AppIcons.list,
                message: 'No hay elementos en este ámbito.',
              )
            else if (widget.kind == CatalogKind.labels)
              for (final item in items)
                if (scope != 'global' || item['scope'] == 'global')
                  labelCard(
                    item,
                    item['scope'] == 'global'
                        ? user?.isSuperAdmin == true
                        : canWrite,
                  )
                else
                  const SizedBox.shrink()
            else if (widget.kind == CatalogKind.statuses) ...[
              // Las dos secciones explican la regla (P29-M1, P29-M2).
              for (final finalType in [false, true])
                if (items.any((e) => (e['type'] == 'FINAL') == finalType)) ...[
                  Padding(
                    padding: const EdgeInsets.only(
                      top: AppSpacing.xs,
                      bottom: AppSpacing.xs,
                    ),
                    child: Text(
                      finalType
                          ? 'FINAL · ${items.where((e) => e['type'] == 'FINAL').length}'
                          : 'EN CURSO',
                      style: AppTextStyles.sectionLabel.copyWith(
                        color: c.muted,
                      ),
                    ),
                  ),
                  WorkspaceListPanel(
                    children: [
                      for (var i = 0; i < items.length; i++)
                        if ((items[i]['type'] == 'FINAL') == finalType)
                          row(items[i], i, items, canWrite),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
            ] else
              WorkspaceListPanel(
                children: [
                  for (var i = 0; i < items.length; i++)
                    row(items[i], i, items, canWrite),
                ],
              ),
          ],
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  /// Fila de 56 dp de etapa o estado: punto de color, nombre y su posición;
  /// editar, subir, bajar y eliminar en el «⋯» (P28E-M5).
  Widget row(Json item, int index, List<Json> items, bool writable) {
    final c = context.colors;
    final isFinal = item['type'] == 'FINAL';
    return SettingsRow(
      key: ValueKey('catalog_item_${item['id']}'),
      leading: Center(
        widthFactor: 1,
        child: ColorDot(hex: item['color'] as String?, size: _dot),
      ),
      title: item['name'],
      subtitle: widget.kind == CatalogKind.stages ? 'Etapa ${index + 1}' : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isFinal)
            Icon(
              AppIcons.success,
              size: AppIconSizes.action,
              color: c.muted,
              semanticLabel: 'Estado final',
            ),
          if (writable)
            RowActionsMenu(
              key: ValueKey('catalog_menu_${item['id']}'),
              tooltip: 'Acciones de ${item['name']}',
              enabled: !busy,
              actions: [
                RowAction(
                  key: 'catalog_edit_${item['id']}',
                  label: 'Editar',
                  onSelected: () => edit(item),
                ),
                if (index > 0)
                  RowAction(
                    key: 'catalog_up_${item['id']}',
                    label: 'Subir',
                    onSelected: () => move(items, index, -1),
                  ),
                if (index < items.length - 1)
                  RowAction(
                    key: 'catalog_down_${item['id']}',
                    label: 'Bajar',
                    onSelected: () => move(items, index, 1),
                  ),
                RowAction(
                  key: 'catalog_delete_${item['id']}',
                  label: 'Eliminar',
                  destructive: true,
                  onSelected: () => remove(item),
                ),
              ],
            )
          else
            const SizedBox(width: kMinInteractiveDimension),
        ],
      ),
    );
  }

  /// Etiqueta: el nombre como encabezado y sus valores como chips con su
  /// color; tocar un chip abre editar o eliminar (P28L-M3).
  Widget labelCard(Json item, bool writable) {
    final c = context.colors;
    final values = parseList(item['values'], (v) => v);
    return Padding(
      key: ValueKey('catalog_item_${item['id']}'),
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: WorkspacePanel(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.xxs,
          AppSpacing.xxs,
          AppSpacing.md,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      text: item['name'],
                      children: [
                        if (item['scope'] != 'personal')
                          TextSpan(
                            text: item['scope'] == 'global'
                                ? '  Global'
                                : '  Grupo',
                            style: AppTextStyles.supporting.copyWith(
                              color: c.muted,
                            ),
                          ),
                      ],
                    ),
                    style: AppTextStyles.cardTitle.copyWith(color: c.text),
                  ),
                ),
                if (writable)
                  RowActionsMenu(
                    key: ValueKey('catalog_menu_${item['id']}'),
                    tooltip: 'Acciones de ${item['name']}',
                    enabled: !busy,
                    actions: [
                      RowAction(
                        key: 'catalog_edit_${item['id']}',
                        label: 'Editar',
                        onSelected: () => edit(item),
                      ),
                      RowAction(
                        key: 'catalog_delete_${item['id']}',
                        label: 'Eliminar',
                        destructive: true,
                        onSelected: () => remove(item),
                      ),
                    ],
                  )
                else
                  const SizedBox(height: kMinInteractiveDimension),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.sm),
              child: Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  for (final value in values)
                    writable
                        ? PopupMenuButton<String>(
                            key: ValueKey('catalog_value_${value['id']}'),
                            tooltip: 'Valor ${value['name']}',
                            enabled: !busy,
                            onSelected: (a) => a == 'edit'
                                ? edit(value, value: true)
                                : remove(value, value: true),
                            itemBuilder: (_) => [
                              PopupMenuItem(
                                key: ValueKey(
                                  'catalog_edit_value_${value['id']}',
                                ),
                                value: 'edit',
                                child: const Text('Editar'),
                              ),
                              PopupMenuItem(
                                key: ValueKey(
                                  'catalog_delete_value_${value['id']}',
                                ),
                                value: 'delete',
                                child: Text(
                                  'Eliminar',
                                  style: TextStyle(color: c.danger),
                                ),
                              ),
                            ],
                            child: _valueChip(value),
                          )
                        : _valueChip(value),
                  if (writable)
                    ActionChip(
                      key: ValueKey('catalog_add_value_${item['id']}'),
                      onPressed: busy
                          ? null
                          : () => edit(null, keyId: item['id'], value: true),
                      label: const Text('+ valor'),
                      labelStyle: AppTextStyles.chip.copyWith(color: c.muted),
                      side: BorderSide(color: c.outline),
                      shape: const RoundedRectangleBorder(
                        borderRadius: AppGeometry.chip,
                      ),
                      backgroundColor: c.surface,
                      materialTapTargetSize: MaterialTapTargetSize.padded,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _valueChip(Json value) => Padding(
    // Área táctil de 48 dp alrededor del chip.
    padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
    child: StatusChip(
      label: value['name'],
      color: colorFromHex(value['color'] as String?),
      fill: colorFromHex(value['color'] as String?).withValues(alpha: .12),
    ),
  );
}

/// Punto de color de las filas de catálogo (P28E-M5).
const double _dot = 10;
