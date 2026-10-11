import 'catalogs_providers.dart';
import 'package:flutter/material.dart';
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

class CatalogSettingsScreen extends ConsumerStatefulWidget {
  const CatalogSettingsScreen({super.key, required this.kind});
  final CatalogKind kind;
  @override
  ConsumerState<CatalogSettingsScreen> createState() =>
      _CatalogSettingsScreenState();
}

class _CatalogSettingsScreenState extends ConsumerState<CatalogSettingsScreen> {
  String scope = 'personal';
  bool busy = false;
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
    return GenPageScaffold(
      title: widget.kind.title,
      icon: AppIcons.settings,
      showBack: true,
      bodyPadding: EdgeInsets.zero,
      onRefresh: () async {
        ref.invalidate(catalogDataProvider(query));
        await ref.read(catalogDataProvider(query).future);
      },
      body: ListView(
        key: const ValueKey('catalog_list'),
        padding: const EdgeInsets.all(AppSpacing.md),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          DropdownButtonFormField<String>(
            key: const ValueKey('catalog_scope'),
            initialValue: scope,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Ámbito'),
            items: choices.entries
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
            onChanged: busy
                ? null
                : (v) => setState(() => scope = v ?? 'personal'),
          ),
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
              const Text(
                'Solo lectura: no tenés permiso para administrar este ámbito.',
              ),
            if (canWrite)
              FilledButton.icon(
                key: const ValueKey('catalog_add'),
                onPressed: busy ? null : () => edit(null),
                icon: const Icon(AppIcons.add, size: AppIconSizes.field),
                label: const Text('Agregar'),
              ),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.all(AppSpacing.lg),
                child: Text('No hay elementos en este ámbito.'),
              ),
            for (var i = 0; i < items.length; i++)
              if (scope != 'global' ||
                  widget.kind != CatalogKind.labels ||
                  items[i]['scope'] == 'global')
                card(
                  items[i],
                  i,
                  items,
                  widget.kind == CatalogKind.labels
                      ? (items[i]['scope'] == 'global'
                            ? user?.isSuperAdmin == true
                            : canWrite)
                      : canWrite,
                ),
          ],
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  Widget card(Json item, int index, List<Json> items, bool writable) => Padding(
    padding: const EdgeInsets.only(top: AppSpacing.sm),
    child: WorkspacePanel(
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(item['name']),
            subtitle: Text(
              widget.kind == CatalogKind.labels
                  ? item['scope'] == 'global'
                        ? 'Global'
                        : item['scope'] == 'group'
                        ? 'Grupo'
                        : 'Personal'
                  : widget.kind == CatalogKind.statuses
                  ? (item['type'] == 'FINAL' ? 'Final' : 'En curso')
                  : 'Etapa ${index + 1}',
            ),
            leading: widget.kind == CatalogKind.labels
                ? const Icon(AppIcons.label)
                : ColorDot(hex: item['color'] as String?),
          ),
          if (writable)
            Wrap(
              spacing: AppSpacing.xs,
              children: [
                IconButton(
                  key: ValueKey('catalog_edit_${item['id']}'),
                  tooltip: 'Editar ${item['name']}',
                  onPressed: busy ? null : () => edit(item),
                  icon: const Icon(AppIcons.edit),
                ),
                IconButton(
                  key: ValueKey('catalog_delete_${item['id']}'),
                  tooltip: 'Eliminar ${item['name']}',
                  onPressed: busy ? null : () => remove(item),
                  icon: const Icon(AppIcons.delete),
                ),
                if (widget.kind != CatalogKind.labels) ...[
                  IconButton(
                    key: ValueKey('catalog_up_${item['id']}'),
                    tooltip: 'Subir',
                    onPressed: busy || index == 0
                        ? null
                        : () => move(items, index, -1),
                    icon: const Icon(AppIcons.sortAsc),
                  ),
                  IconButton(
                    key: ValueKey('catalog_down_${item['id']}'),
                    tooltip: 'Bajar',
                    onPressed: busy || index == items.length - 1
                        ? null
                        : () => move(items, index, 1),
                    icon: const Icon(AppIcons.sortDesc),
                  ),
                ],
              ],
            ),
          if (widget.kind == CatalogKind.labels) ...[
            for (final value in parseList(item['values'], (v) => v))
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: ColorDot(hex: value['color'] as String?),
                title: Text(value['name']),
                onTap: writable && !busy
                    ? () => edit(value, value: true)
                    : null,
                trailing: writable
                    ? IconButton(
                        key: ValueKey('catalog_delete_value_${value['id']}'),
                        tooltip: 'Eliminar valor ${value['name']}',
                        onPressed: busy
                            ? null
                            : () => remove(value, value: true),
                        icon: const Icon(AppIcons.delete),
                      )
                    : null,
              ),
            if (writable)
              TextButton.icon(
                key: ValueKey('catalog_add_value_${item['id']}'),
                onPressed: busy
                    ? null
                    : () => edit(null, keyId: item['id'], value: true),
                icon: const Icon(AppIcons.add),
                label: const Text('Agregar valor'),
              ),
          ],
        ],
      ),
    ),
  );
}
