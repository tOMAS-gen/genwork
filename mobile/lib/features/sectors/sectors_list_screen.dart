import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../data/models/sector.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/card_progress.dart';
import '../../shared/widgets/count_badge.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/list_toolbar.dart';
import '../../shared/widgets/entity_card_title.dart';
import '../../shared/widgets/state_views.dart';
import 'sector_form_dialog.dart';
import 'sector_sections.dart';
import 'sectors_providers.dart';
import '../../shared/widgets/app_dropdown_decoration.dart';

class SectorsListScreen extends ConsumerStatefulWidget {
  const SectorsListScreen({super.key});
  @override
  ConsumerState<SectorsListScreen> createState() => _SectorsListScreenState();
}

class _SectorsListScreenState extends ConsumerState<SectorsListScreen> {
  final _search = TextEditingController();
  String _scope = '';
  SectorSort _sort = SectorSort.name;
  bool _filtersOpen = false;
  final _collapsed = <String>{};
  final _filteredCollapsed = <String>{};
  bool get _filtering => _search.text.trim().isNotEmpty || _scope.isNotEmpty;
  Set<String> get _closed => _filtering ? _filteredCollapsed : _collapsed;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sectors = ref.watch(sectorsProvider);
    final c = context.colors;
    return GenPageScaffold(
      title: 'Sectores',
      subtitle: 'Tareas y proyectos organizados por área de trabajo.',
      actions: [
        if (canCreateSector(ref.watch(currentUserProvider)))
          IconButton.filled(
            key: const ValueKey('create_sector'),
            tooltip: 'Nuevo sector',
            icon: const Icon(AppIcons.add),
            onPressed: () async {
              final id = await showSectorForm(context);
              if (id != null && context.mounted) {
                context.push(Routes.sector(id));
              }
            },
          ),
      ],
      onRefresh: () => ref.refresh(sectorsProvider.future),
      bodyPadding: EdgeInsets.zero,
      body: AsyncValueView(
        value: sectors,
        onRetry: () => ref.invalidate(sectorsProvider),
        data: (list) {
          final scopes = sectorSections(list);
          final sections = sectorSections(
            list,
            search: _search.text,
            scopeKey: _scope,
            sort: _sort,
          );
          final resultCount = sections.fold<int>(
            0,
            (n, s) => n + s.sectors.length,
          );
          final allClosed =
              sections.isNotEmpty &&
              sections.every((s) => _closed.contains(s.key));
          return ListView(
            key: const ValueKey('sectors_list'),
            padding: AppSpace.page,
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              // Sin card contenedora: la lista empieza antes (P11-M3).
              ListToolbar<SectorSort>(
                framed: false,
                keyPrefix: 'sectors',
                searchHint: 'Buscar sectores…',
                searchController: _search,
                onSearch: (_) => setState(_filteredCollapsed.clear),
                filtersExpanded: _filtersOpen,
                onToggleFilters: () =>
                    setState(() => _filtersOpen = !_filtersOpen),
                filtersPanel: ToolbarFilterField(
                  label: 'Grupo o ámbito',
                  child: DropdownButtonFormField<String>(
                    icon: const AppDropdownIcon(),
                    key: ValueKey('sectors_scope_$_scope'),
                    isExpanded: true,
                    initialValue: _scope,
                    style: AppTextStyles.body.copyWith(color: c.text),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: c.surface,
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text('Todos los sectores'),
                      ),
                      if (_scope.isNotEmpty &&
                          !scopes.any((s) => s.key == _scope))
                        DropdownMenuItem(
                          value: _scope,
                          child: const Text('Ámbito no disponible'),
                        ),
                      for (final scope in scopes)
                        DropdownMenuItem(
                          value: scope.key,
                          child: Text(
                            scope.title,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: (value) => setState(() {
                      _scope = value!;
                      _filteredCollapsed.clear();
                    }),
                  ),
                ),
                activeFilters: [
                  if (_scope.isNotEmpty)
                    (
                      label:
                          'Ámbito: ${scopes.where((s) => s.key == _scope).firstOrNull?.title ?? 'Seleccionado'}',
                      remove: () => setState(() {
                        _scope = '';
                        _filteredCollapsed.clear();
                      }),
                    ),
                ],
                clearKey: const ValueKey('sectors_clear'),
                onClear: _filtering
                    ? () => setState(() {
                        _search.clear();
                        _scope = '';
                        _filteredCollapsed.clear();
                      })
                    : null,
                sort: _sort,
                sortOptions: {for (final s in SectorSort.values) s: s.label},
                onSort: (value) => setState(() => _sort = value),
                countKey: const ValueKey('sectors_count'),
                count:
                    '$resultCount ${resultCount == 1 ? 'sector' : 'sectores'}',
                summaryTrailing: sections.isEmpty
                    ? null
                    : TextButton(
                        key: const ValueKey('sectors_toggle_all'),
                        style: TextButton.styleFrom(
                          foregroundColor: c.muted,
                          textStyle: AppTextStyles.supporting,
                        ),
                        onPressed: () => setState(() {
                          if (allClosed) {
                            _closed.clear();
                          } else {
                            _closed.addAll(sections.map((s) => s.key));
                          }
                        }),
                        child: Text(
                          allClosed ? 'Expandir todo' : 'Contraer todo',
                        ),
                      ),
              ),
              const SizedBox(height: AppSpace.md),
              if (sections.isEmpty)
                list.isEmpty
                    ? const EmptyView(
                        title: 'Sin sectores todavía',
                        message:
                            'Creá tu primer sector para agrupar tareas y proyectos por área de trabajo.',
                      )
                    : const EmptyView(
                        message: 'No hay sectores que coincidan con el filtro.',
                      ),
              for (final section in sections) ...[
                _SectionHeader(
                  section: section,
                  closed: _closed.contains(section.key),
                  onTap: () => setState(() {
                    if (!_closed.remove(section.key)) {
                      _closed.add(section.key);
                    }
                  }),
                ),
                const SizedBox(height: AppSpace.sm),
                if (!_closed.contains(section.key))
                  for (final s in section.sectors)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.md),
                      child: _SectorCard(
                        sector: s,
                        onTap: () => context.push(Routes.sector(s.id)),
                      ),
                    ),
              ],
              const SizedBox(height: AppSpace.bottomClearance),
            ],
          );
        },
      ),
    );
  }
}

/// Encabezado de ámbito como rótulo, sin card (P11-M4): chevron de 20 dp, el
/// nombre en 11/700 y, a la derecha, «1 sector · 2 pendientes» en 12 gris.
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.section,
    required this.closed,
    required this.onTap,
  });

  final SectorSection section;
  final bool closed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final count = section.sectors.length;
    final summary = [
      '$count ${count == 1 ? 'sector' : 'sectores'}',
      if (section.pending > 0)
        '${section.pending} ${section.pending == 1 ? 'pendiente' : 'pendientes'}',
    ].join(' · ');
    return Semantics(
      expanded: !closed,
      button: true,
      child: InkWell(
        key: ValueKey('sectors_section_${section.key}'),
        onTap: onTap,
        borderRadius: AppGeometry.control,
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            minHeight: kMinInteractiveDimension,
          ),
          child: Row(
            children: [
              Icon(
                closed ? AppIcons.chevronRight : AppIcons.expandMore,
                size: AppIconSizes.action,
                color: c.muted,
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  section.title.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.sectionLabel.copyWith(color: c.text),
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              // Con texto grande se trunca antes que el nombre.
              Flexible(
                child: Text(
                  summary,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Card de sector, como la de la web: píldora con el nombre del color del
/// sector, pendientes/total y la barra de avance.
class _SectorCard extends StatelessWidget {
  const _SectorCard({required this.sector, required this.onTap});

  final SectorSummary sector;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = sector.color == null ? null : colorFromHex(sector.color);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('sector_${sector.id}'),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: EntityCardTitle(name: sector.name, color: color),
                    ),
                  ),
                  CountBadge(count: sector.pending),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              CardProgress(done: sector.done, total: sector.total),
            ],
          ),
        ),
      ),
    );
  }
}
