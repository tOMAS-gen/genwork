import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../data/models/sector.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/list_toolbar.dart';
import '../../shared/widgets/stat_cards.dart';
import '../../shared/widgets/state_views.dart';
import 'create_work_dialog.dart';
import 'work_card.dart';
import 'works_dashboard.dart';
import 'works_filter.dart';
import 'works_providers.dart';
import 'works_filters_panel.dart';
import 'work_table.dart';
import '../sectors/sectors_providers.dart';
import '../shell/resource_refresh.dart';
import '../../shared/widgets/content_width.dart';

/// Listado de proyectos: búsqueda local, activos/archivados, favoritos primero.
class WorksListScreen extends ConsumerStatefulWidget {
  const WorksListScreen({super.key, this.view = WorksView.all});

  final WorksView view;

  @override
  ConsumerState<WorksListScreen> createState() => _WorksListScreenState();
}

class _WorksListScreenState extends ConsumerState<WorksListScreen> {
  late WorksView _view = widget.view;
  bool get _archived => _view == WorksView.archived;
  String _query = '';
  final _search = TextEditingController();
  WorkFilters _filters = emptyWorkFilters;
  bool _filtersOpen = false;

  /// Grilla de cards (`true`) o tabla, como el cambio de vista de la web.
  bool _grid = true;
  int get _activeFilters =>
      _filters.groups.length +
      (_filters.sector == null ? 0 : 1) +
      (_filters.label == null ? 0 : 1) +
      (_filters.status == null ? 0 : 1);

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final id = await showCreateWorkDialog(context);
    if (id != null && mounted) context.push(Routes.work(id, view: _view));
  }

  void _clearFilters() => setState(() {
    _search.clear();
    _query = '';
    _filters = (
      groups: <String>{},
      sector: null,
      label: null,
      status: null,
      sort: _filters.sort,
    );
  });

  /// Filtros activos con su texto, como `.toolbar-chips` de la web.
  List<ActiveFilter> _activeFilterChips(List<WorkSummary> works) {
    final sectors = {
      for (final s in ref.read(sectorsProvider).value ?? <SectorSummary>[])
        s.id: s.name,
    };
    final labels = worksLabels(works);
    final groups = worksGroups(works);
    WorkFilters without({
      Set<String>? groups,
      bool sector = false,
      bool label = false,
      bool status = false,
    }) => (
      groups: groups ?? _filters.groups,
      sector: sector ? null : _filters.sector,
      label: label ? null : _filters.label,
      status: status ? null : _filters.status,
      sort: _filters.sort,
    );
    return [
      if (_filters.sector != null)
        (
          label: 'Sector: ${sectors[_filters.sector] ?? 'Seleccionado'}',
          remove: () => setState(() => _filters = without(sector: true)),
        ),
      if (_filters.label != null)
        (
          label: labels[_filters.label] ?? 'Etiqueta seleccionada',
          remove: () => setState(() => _filters = without(label: true)),
        ),
      if (_filters.status != null)
        (
          label: worksStatusLabels[_filters.status]!,
          remove: () => setState(() => _filters = without(status: true)),
        ),
      for (final id in _filters.groups)
        (
          label: 'Grupo: ${groups[id] ?? 'Seleccionado'}',
          remove: () => setState(
            () => _filters = without(groups: {..._filters.groups}..remove(id)),
          ),
        ),
    ];
  }

  @override
  void didUpdateWidget(covariant WorksListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.view != oldWidget.view) _view = widget.view;
  }

  /// Sin [filtered], solo la vista (todos, míos, favoritos, archivados).
  List<WorkSummary> _visible(
    List<WorkSummary> works,
    String? userId, {
    bool filtered = true,
  }) => !filtered
      ? filterWorks(works, view: _view, userId: userId)
      : filterWorks(
          works,
          view: _view,
          userId: userId,
          query: _query,
          groupIds: _filters.groups,
          sectorId: _filters.sector,
          labelValueId: _filters.label,
          status: _filters.status,
          sort: _filters.sort,
        );

  Future<void> _toggleFavorite(WorkSummary work) async {
    try {
      await ref
          .read(worksRepositoryProvider)
          .setFavorite(work.id, !work.isFavorite);
      ref.invalidate(worksListProvider);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _toggleArchived(WorkSummary work) async {
    final changed = await confirmAction(
      context,
      title: work.isArchived ? 'Desarchivar proyecto' : 'Archivar proyecto',
      message: work.isArchived
          ? '«${work.name}» volverá a las vistas activas.'
          : '«${work.name}» pasará a Archivados y dejará de verse en las vistas activas.',
      confirmLabel: work.isArchived ? 'Desarchivar' : 'Archivar',
      onConfirm: () => ref
          .read(worksRepositoryProvider)
          .setArchived(work.id, !work.isArchived),
    );
    if (changed && mounted) refreshResources(ref);
  }

  @override
  Widget build(BuildContext context) {
    final works = ref.watch(worksListProvider(_archived));
    final userId = ref.watch(currentUserProvider)?.id;
    final all = works.value;
    final list = all == null ? null : _visible(all, userId);

    // Las cards se arman de a una, con slivers; la tabla y los vacíos van
    // como bloque.
    final loaded = works.hasError ? null : works.value;
    final shown = loaded == null ? null : _visible(loaded, userId);
    final lazyCards = _grid && shown != null && shown.isNotEmpty ? shown : null;
    final columns = ContentWidth.isWide(context) ? 2 : 1;
    return GenPageScaffold(
      title: switch (_view) {
        WorksView.all => 'Todos los Proyectos',
        WorksView.mine => 'Mis Proyectos',
        WorksView.favorites => 'Proyectos Favoritos',
        WorksView.archived => 'Archivados',
      },
      actions: [
        if (!_archived)
          IconButton.filled(
            key: const ValueKey('works_create'),
            tooltip: 'Crear proyecto',
            onPressed: _create,
            icon: const Icon(AppIcons.add),
          ),
      ],
      onRefresh: () => ref.refresh(worksListProvider(_archived).future),
      bodyPadding: EdgeInsets.zero,
      // Slivers perezosos: solo se construyen las cards visibles (T2).
      body: CustomScrollView(
        key: const ValueKey('works_list'),
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: AppSpace.page.copyWith(bottom: 0),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Sin proyectos no hay franja: el vacío queda arriba (P08-M1).
                  if (list != null && list.isNotEmpty) ...[
                    _Stats(
                      key: const ValueKey('works_stats'),
                      stats: WorksStats.of(list),
                    ),
                    const SizedBox(height: AppSpace.md),
                  ],
                  ListToolbar<WorksSort>(
                    key: const ValueKey('works_toolbar'),
                    keyPrefix: 'works',
                    searchHint: 'Buscar proyectos…',
                    searchController: _search,
                    onSearch: (v) => setState(() => _query = v),
                    filtersExpanded: _filtersOpen,
                    onToggleFilters: () =>
                        setState(() => _filtersOpen = !_filtersOpen),
                    filtersPanel: WorksFiltersPanel(
                      works: all ?? const [],
                      sectors: {
                        for (final s
                            in ref.watch(sectorsProvider).value ??
                                <SectorSummary>[])
                          s.id: s.name,
                      },
                      filters: _filters,
                      onChanged: (f) => setState(() => _filters = f),
                    ),
                    activeFilters: _activeFilterChips(all ?? const []),
                    onClear: _query.isNotEmpty || _activeFilters > 0
                        ? _clearFilters
                        : null,
                    sort: _filters.sort,
                    sortOptions: worksSortOptions,
                    onSort: (sort) => setState(
                      () => _filters = (
                        groups: _filters.groups,
                        sector: _filters.sector,
                        label: _filters.label,
                        status: _filters.status,
                        sort: sort,
                      ),
                    ),
                    grid: _grid,
                    onGrid: (grid) => setState(() => _grid = grid),
                    count: list == null
                        ? 'Cargando proyectos…'
                        : countLabel(list.length, 'proyecto', 'proyectos'),
                  ),
                  const SizedBox(height: AppSpace.md),
                ],
              ),
            ),
          ),
          if (lazyCards != null)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              // En ventanas anchas, dos cards por fila (T7).
              sliver: SliverList.builder(
                itemCount: (lazyCards.length / columns).ceil(),
                itemBuilder: (context, row) {
                  Widget card(WorkSummary work) => WorkCard(
                    work: work,
                    onTap: () =>
                        context.push(Routes.work(work.id, view: _view)),
                    onFavorite: () => _toggleFavorite(work),
                    onArchive: () => _toggleArchived(work),
                  );
                  final start = row * columns;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpace.md),
                    child: columns == 1
                        ? card(lazyCards[start])
                        : IntrinsicHeight(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                for (
                                  var i = start;
                                  i < start + columns;
                                  i++
                                ) ...[
                                  if (i > start)
                                    const SizedBox(width: AppSpace.md),
                                  Expanded(
                                    child: i < lazyCards.length
                                        ? card(lazyCards[i])
                                        : const SizedBox.shrink(),
                                  ),
                                ],
                              ],
                            ),
                          ),
                  );
                },
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              sliver: SliverToBoxAdapter(
                child: AsyncValueView(
                  value: works,
                  onRetry: () => ref.invalidate(worksListProvider(_archived)),
                  errorTitle: 'No se pudieron cargar los proyectos',
                  data: (all) {
                    final visible = _visible(all, userId);
                    if (visible.isEmpty) {
                      // Sin proyectos en la vista: el EmptyState de la web. Con
                      // proyectos que no pasan el filtro: el aviso corto.
                      if (_visible(all, userId, filtered: false).isEmpty) {
                        return EmptyView(
                          icon: AppIcons.projectOpen,
                          title: switch (_view) {
                            WorksView.favorites => 'Sin favoritos',
                            WorksView.mine => 'Sin proyectos propios',
                            WorksView.archived => 'Sin proyectos archivados',
                            WorksView.all => 'Todavía no tenés proyectos',
                          },
                          message: switch (_view) {
                            WorksView.favorites =>
                              'Marcá proyectos como favoritos para verlos acá.',
                            WorksView.mine =>
                              'Los proyectos que vos creaste aparecen acá.',
                            WorksView.archived =>
                              'Los proyectos archivados aparecen acá.',
                            WorksView.all =>
                              'Creá tu primer proyecto para empezar a organizar tareas y sectores.',
                          },
                          actionLabel: _view == WorksView.all
                              ? 'Nuevo proyecto'
                              : null,
                          onAction: _view == WorksView.all ? _create : null,
                        );
                      }
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.xs,
                        ),
                        child: Text(
                          'Sin proyectos que coincidan con el filtro.',
                          style: AppTextStyles.body.copyWith(
                            color: context.colors.muted,
                          ),
                        ),
                      );
                    }
                    return WorkTable(
                      works: visible,
                      onOpen: (work) =>
                          context.push(Routes.work(work.id, view: _view)),
                      onArchive: _toggleArchived,
                    );
                  },
                ),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
        ],
      ),
    );
  }
}

/// Barra de estadísticas del dashboard (`StatsBar.tsx`): Total, En progreso,
/// Completados y Pendientes.
class _Stats extends StatelessWidget {
  const _Stats({super.key, required this.stats});

  final WorksStats stats;

  @override
  Widget build(BuildContext context) => StatCards(
    items: [
      (label: 'Total', value: '${stats.total}'),
      (label: 'En progreso', value: '${stats.inProgress}'),
      (label: 'Completados', value: '${stats.completed}'),
      (label: 'Pendientes', value: '${stats.pending}'),
    ],
  );
}
