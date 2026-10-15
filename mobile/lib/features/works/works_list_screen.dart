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
import '../../data/models/work.dart';
import '../../data/models/sector.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';
import 'create_work_dialog.dart';
import 'work_card.dart';
import 'works_dashboard.dart';
import 'works_filter.dart';
import 'works_providers.dart';
import 'works_filters_dialog.dart';
import '../sectors/sectors_providers.dart';

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
  String? _group;
  WorkFilters _filters = emptyWorkFilters;
  int get _activeFilters =>
      (_group == null ? 0 : 1) +
      (_filters.groups.isEmpty ? 0 : 1) +
      (_filters.sector == null ? 0 : 1) +
      (_filters.label == null ? 0 : 1) +
      (_filters.status == null ? 0 : 1);

  @override
  void didUpdateWidget(covariant WorksListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.view != oldWidget.view) _view = widget.view;
  }

  void _selectView(WorksView view) {
    setState(() => _view = view);
    GoRouter.maybeOf(context)?.go(Routes.worksList(view));
  }

  List<WorkSummary> _visible(List<WorkSummary> works, String? userId) =>
      filterWorks(
        works,
        view: _view,
        userId: userId,
        query: _query,
        groupId: _group,
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

  @override
  Widget build(BuildContext context) {
    final works = ref.watch(worksListProvider(_archived));
    final userId = ref.watch(currentUserProvider)?.id;
    final c = context.colors;
    final groupLabels = <String, String>{
      for (final work in works.value ?? <WorkSummary>[])
        work.groupId ?? '': work.groupId == null
            ? 'Sin grupo'
            : work.groupName ?? 'Grupo',
    };
    final all = works.value;
    final list = all == null ? null : _visible(all, userId);

    return GenPageScaffold(
      title: _view == WorksView.all ? 'Todos los Proyectos' : _view.label,
      icon: AppIcons.projects,
      actions: [
        if (!_archived)
          IconButton.filled(
            key: const ValueKey('works_create'),
            tooltip: 'Crear proyecto',
            onPressed: () async {
              final id = await showCreateWorkDialog(context);
              if (id != null && context.mounted) {
                context.push(Routes.work(id, view: _view));
              }
            },
            icon: const Icon(AppIcons.add),
          ),
      ],
      onRefresh: () => ref.refresh(worksListProvider(_archived).future),
      bodyPadding: EdgeInsets.zero,
      body: ListView(
        key: const ValueKey('works_list'),
        padding: AppSpace.page,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          if (list != null)
            _StatsGrid(
              key: const ValueKey('works_stats'),
              stats: WorksStats.of(list),
            ),
          if (list != null) const SizedBox(height: AppSpace.md),
          WorkspacePanel(
            key: const ValueKey('works_toolbar'),
            padding: const EdgeInsets.all(AppSpacing.xs),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  key: const ValueKey('works_search'),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(AppIcons.search),
                    hintText: 'Buscar proyecto, descripción o grupo',
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
                const SizedBox(height: AppSpace.sm),
                if (!_archived) ...[
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final view in [
                          WorksView.all,
                          WorksView.mine,
                          WorksView.favorites,
                        ])
                          Padding(
                            padding: const EdgeInsets.only(right: AppSpace.sm),
                            child: ChoiceChip(
                              key: ValueKey('works_view_${view.name}'),
                              label: Text(
                                view == WorksView.all ? 'Todos' : view.label,
                              ),
                              selected: _view == view,
                              onSelected: (_) => _selectView(view),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpace.sm),
                ],
                Row(
                  children: [
                    Expanded(
                      child: SegmentedButton<bool>(
                        key: const ValueKey('works_archived_toggle'),
                        showSelectedIcon: false,
                        segments: const [
                          ButtonSegment(value: false, label: Text('Activos')),
                          ButtonSegment(value: true, label: Text('Archivados')),
                        ],
                        selected: {_archived},
                        onSelectionChanged: (s) => _selectView(
                          s.first ? WorksView.archived : WorksView.all,
                        ),
                      ),
                    ),
                    PopupMenuButton<String>(
                      key: const ValueKey('works_group_filter'),
                      tooltip: 'Filtrar por grupo',
                      icon: Icon(
                        _group == null
                            ? AppIcons.filter
                            : AppIcons.filterActive,
                        color: _group == null ? c.muted : c.brand,
                      ),
                      onSelected: (v) => setState(() {
                        _group = v == '__all__' ? null : v;
                        _filters = (
                          groups: <String>{},
                          sector: _filters.sector,
                          label: _filters.label,
                          status: _filters.status,
                          sort: _filters.sort,
                        );
                      }),
                      itemBuilder: (_) => [
                        const PopupMenuItem(
                          value: '__all__',
                          child: Text('Todos los grupos'),
                        ),
                        for (final g
                            in groupLabels.entries.toList()
                              ..sort((a, b) => a.value.compareTo(b.value)))
                          PopupMenuItem(value: g.key, child: Text(g.value)),
                      ],
                    ),
                  ],
                ),
                TextButton.icon(
                  key: const ValueKey('works_advanced_filters'),
                  icon: const Icon(AppIcons.tune),
                  label: Text(
                    _activeFilters == 0
                        ? 'Filtros y orden'
                        : 'Filtros y orden ($_activeFilters)',
                  ),
                  onPressed: all == null
                      ? null
                      : () async {
                          final sectors = await ref
                              .read(sectorsProvider.future)
                              .catchError((Object e) {
                                if (context.mounted) showErrorSnack(context, e);
                                return <SectorSummary>[];
                              });
                          if (!context.mounted) return;
                          final result = await showWorksFilters(
                            context,
                            works: all,
                            sectors: {for (final s in sectors) s.id: s.name},
                            current: (
                              groups: _group == null
                                  ? _filters.groups
                                  : {_group!},
                              sector: _filters.sector,
                              label: _filters.label,
                              status: _filters.status,
                              sort: _filters.sort,
                            ),
                          );
                          if (result != null && mounted) {
                            setState(() {
                              _filters = result;
                              _group = null;
                            });
                          }
                        },
                ),
                if (list != null) ...[
                  const Divider(height: AppSpace.lg),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                    ),
                    child: Text(
                      [
                        countLabel(list.length, 'proyecto', 'proyectos'),
                        if (_group != null)
                          'Grupo: ${groupLabels[_group] ?? 'Seleccionado'}',
                      ].join(' · '),
                      style: AppTextStyles.supporting.copyWith(color: c.muted),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpace.md),
          AsyncValueView(
            value: works,
            onRetry: () => ref.invalidate(worksListProvider(_archived)),
            data: (all) {
              final visible = _visible(all, userId);
              if (visible.isEmpty) {
                return EmptyView(
                  message:
                      _query.isNotEmpty || _group != null || _activeFilters > 0
                      ? 'No hay resultados. Probá otra búsqueda o grupo.'
                      : switch (_view) {
                          WorksView.mine => 'Todavía no creaste proyectos.',
                          WorksView.favorites =>
                            'Todavía no tenés favoritos.\nMarcá un proyecto con la estrella.',
                          WorksView.archived => 'No hay proyectos archivados.',
                          WorksView.all =>
                            'Todavía no hay proyectos.\nCreá el primero con el botón +.',
                        },
                );
              }
              return Column(
                children: [
                  for (final work in visible)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.md),
                      child: WorkCard(
                        work: work,
                        onTap: () =>
                            context.push(Routes.work(work.id, view: _view)),
                        onFavorite: () => _toggleFavorite(work),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: AppSpace.xxl),
        ],
      ),
    );
  }
}

/// Barra de estadísticas del dashboard: Total, En progreso, Completados y
/// Pendientes, en 2×2 (cifra en Mono 24/700 y «rótulo · %» en Mono 14 muted).
class _StatsGrid extends StatelessWidget {
  const _StatsGrid({super.key, required this.stats});

  final WorksStats stats;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Total', stats.total, stats.total > 0 ? 100 : 0),
      ('En progreso', stats.inProgress, stats.pct(stats.inProgress)),
      ('Completados', stats.completed, stats.pct(stats.completed)),
      ('Pendientes', stats.pending, stats.pct(stats.pending)),
    ];
    return WorkspacePanel(
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final scale = MediaQuery.textScalerOf(context).scale(13) / 13;
          final columns = constraints.maxWidth / scale >= 320 ? 4 : 2;
          final width =
              (constraints.maxWidth - AppSpacing.sm * (columns - 1)) / columns;
          return Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final item in items)
                SizedBox(
                  width: width,
                  child: _StatTile(
                    label: item.$1,
                    value: item.$2,
                    pct: item.$3,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.pct,
  });

  final String label;
  final int value, pct;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$value',
          style: AppTextStyles.technical.copyWith(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: c.text,
          ),
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          '$label\n$pct%',
          style: AppTextStyles.technical.copyWith(fontSize: 11, color: c.muted),
        ),
      ],
    );
  }
}
