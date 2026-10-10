import 'package:flutter/material.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/router/routes.dart';
import '../../core/util/format.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/progress_line.dart';
import '../../shared/widgets/state_views.dart';
import 'create_work_dialog.dart';
import 'works_providers.dart';
import 'works_filter.dart';

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
    final groupLabels = <String, String>{
      for (final work in works.value ?? <WorkSummary>[])
        work.groupId ?? '': work.groupId == null
            ? 'Sin grupo'
            : work.groupName ?? 'Grupo',
    };

    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: Text(_view == WorksView.all ? 'Proyectos' : _view.label),
      ),
      floatingActionButton: _archived
          ? null
          : FloatingActionButton(
              key: const ValueKey('works_create'),
              tooltip: 'Crear proyecto',
              onPressed: () async {
                final id = await showCreateWorkDialog(context);
                if (id != null && context.mounted) {
                  context.push(Routes.work(id, view: _view));
                }
              },
              child: const Icon(Icons.add),
            ),
      body: Column(
        children: [
          Padding(
            padding: AppSpace.page,
            child: Column(
              children: [
                TextField(
                  key: const ValueKey('works_search'),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
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
                        _group == null ? Icons.filter_list : Icons.filter_alt,
                        color: _group == null
                            ? null
                            : Theme.of(context).colorScheme.primary,
                      ),
                      onSelected: (v) =>
                          setState(() => _group = v == '__all__' ? null : v),
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
                if (_group != null)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Grupo: ${groupLabels[_group] ?? 'Seleccionado'}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: AsyncValueView(
              value: works,
              onRetry: () => ref.invalidate(worksListProvider(_archived)),
              data: (all) {
                final list = _visible(all, userId);
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(worksListProvider(_archived).future),
                  child: list.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            const SizedBox(height: AppSpace.emptyLead),
                            EmptyView(
                              message: _query.isNotEmpty || _group != null
                                  ? 'No hay resultados. Probá otra búsqueda o grupo.'
                                  : switch (_view) {
                                      WorksView.mine =>
                                        'Todavía no creaste proyectos.',
                                      WorksView.favorites =>
                                        'Todavía no tenés favoritos.\nMarcá un proyecto con la estrella.',
                                      WorksView.archived =>
                                        'No hay proyectos archivados.',
                                      WorksView.all =>
                                        'Todavía no hay proyectos.\nCreá el primero con el botón +.',
                                    },
                            ),
                          ],
                        )
                      : ListView.separated(
                          key: const ValueKey('works_list'),
                          padding: AppSpace.list,
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: list.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: AppSpace.md),
                          itemBuilder: (context, i) => _WorkTile(
                            work: list[i],
                            onTap: () => context.push(
                              Routes.work(list[i].id, view: _view),
                            ),
                            onFavorite: () => _toggleFavorite(list[i]),
                          ),
                        ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkTile extends StatelessWidget {
  const _WorkTile({
    required this.work,
    required this.onTap,
    required this.onFavorite,
  });

  final WorkSummary work;
  final VoidCallback onTap;
  final VoidCallback onFavorite;

  @override
  Widget build(BuildContext context) {
    final meta = [
      work.groupName ?? 'Personal',
      if (work.dueDate != null) 'vence ${formatDay(work.dueDate!)}',
    ].join(' · ');

    return Card(
      child: ListTile(
        key: ValueKey('work_${work.id}'),
        onTap: onTap,
        title: Text(work.name),
        contentPadding: AppSpace.page,
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(meta),
            const SizedBox(height: AppSpace.sm),
            ProgressLine(progress: work.progress),
            if (work.stageName != null || work.labels.isNotEmpty) ...[
              const SizedBox(height: AppSpace.sm),
              Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.xs,
                children: [
                  if (work.stageName != null)
                    ColorPill(label: work.stageName!, hex: work.stageColor),
                  for (final l in work.labels.where((l) => l.isPrimary))
                    ColorPill(label: l.valueName, hex: l.color),
                ],
              ),
            ],
          ],
        ),
        trailing: IconButton(
          key: ValueKey('work_favorite_${work.id}'),
          tooltip: work.isFavorite
              ? 'Quitar de favoritos'
              : 'Agregar a favoritos',
          icon: Icon(work.isFavorite ? Icons.star : Icons.star_border),
          onPressed: onFavorite,
        ),
      ),
    );
  }
}
