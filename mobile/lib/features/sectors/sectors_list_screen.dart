import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/common.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/progress_line.dart';
import '../../shared/widgets/state_views.dart';
import 'sector_form_dialog.dart';
import 'sector_sections.dart';
import 'sectors_providers.dart';

class SectorsListScreen extends ConsumerStatefulWidget {
  const SectorsListScreen({super.key});
  @override
  ConsumerState<SectorsListScreen> createState() => _SectorsListScreenState();
}

class _SectorsListScreenState extends ConsumerState<SectorsListScreen> {
  final _search = TextEditingController();
  String _scope = '';
  SectorSort _sort = SectorSort.name;
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
    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: const Text('Sectores'),
      ),
      floatingActionButton: canCreateSector(ref.watch(currentUserProvider))
          ? FloatingActionButton(
              key: const ValueKey('create_sector'),
              tooltip: 'Nuevo sector',
              child: const Icon(Icons.add),
              onPressed: () async {
                final id = await showSectorForm(context);
                if (id != null && context.mounted) {
                  context.push(Routes.sector(id));
                }
              },
            )
          : null,
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
          return RefreshIndicator(
            onRefresh: () => ref.refresh(sectorsProvider.future),
            child: ListView(
              key: const ValueKey('sectors_list'),
              padding: AppSpace.list,
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                TextField(
                  key: const ValueKey('sectors_search'),
                  controller: _search,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    labelText: 'Buscar sectores',
                  ),
                  onChanged: (_) => setState(_filteredCollapsed.clear),
                ),
                const SizedBox(height: AppSpace.md),
                DropdownButtonFormField<String>(
                  key: ValueKey('sectors_scope_$_scope'),
                  isExpanded: true,
                  initialValue: _scope,
                  decoration: const InputDecoration(
                    labelText: 'Grupo o ámbito',
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
                const SizedBox(height: AppSpace.md),
                DropdownButtonFormField<SectorSort>(
                  key: const ValueKey('sectors_sort'),
                  isExpanded: true,
                  initialValue: _sort,
                  decoration: const InputDecoration(labelText: 'Ordenar'),
                  items: [
                    for (final sort in SectorSort.values)
                      DropdownMenuItem(value: sort, child: Text(sort.label)),
                  ],
                  onChanged: (value) => setState(() => _sort = value!),
                ),
                const SizedBox(height: AppSpace.sm),
                Text(
                  '$resultCount ${resultCount == 1 ? 'sector' : 'sectores'}',
                  key: const ValueKey('sectors_count'),
                ),
                Wrap(
                  spacing: AppSpace.sm,
                  children: [
                    if (_filtering)
                      TextButton(
                        key: const ValueKey('sectors_clear'),
                        onPressed: () => setState(() {
                          _search.clear();
                          _scope = '';
                          _filteredCollapsed.clear();
                        }),
                        child: const Text('Limpiar filtros'),
                      ),
                    if (sections.isNotEmpty)
                      TextButton(
                        key: const ValueKey('sectors_toggle_all'),
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
                  ],
                ),
                if (sections.isEmpty)
                  EmptyView(
                    message: list.isEmpty
                        ? 'No hay sectores visibles'
                        : 'No hay sectores que coincidan con el filtro.',
                  ),
                for (final section in sections) ...[
                  ListTile(
                    key: ValueKey('sectors_section_${section.key}'),
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      section.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    subtitle: Text(
                      '${section.sectors.length} ${section.sectors.length == 1 ? 'sector' : 'sectores'} · ${section.pending} ${section.pending == 1 ? 'pendiente' : 'pendientes'}',
                    ),
                    trailing: Icon(
                      _closed.contains(section.key)
                          ? Icons.expand_more
                          : Icons.expand_less,
                    ),
                    onTap: () => setState(() {
                      if (!_closed.remove(section.key)) {
                        _closed.add(section.key);
                      }
                    }),
                  ),
                  if (!_closed.contains(section.key))
                    for (final s in section.sectors)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpace.md),
                        child: Card(
                          child: Column(
                            children: [
                              ListTile(
                                key: ValueKey('sector_${s.id}'),
                                leading: ColorDot(
                                  hex: s.color,
                                  size: AppSpace.dotLarge,
                                ),
                                title: Text(s.name),
                                subtitle: Text(
                                  '${s.pending} ${s.pending == 1 ? 'pendiente' : 'pendientes'} · ${s.total} ${s.total == 1 ? 'tarea' : 'tareas'}',
                                ),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => context.push(Routes.sector(s.id)),
                              ),
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpace.lg,
                                  0,
                                  AppSpace.lg,
                                  AppSpace.md,
                                ),
                                child: ProgressLine(
                                  progress: Progress(
                                    done: s.done,
                                    total: s.total,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                ],
                const SizedBox(height: AppSpace.bottomClearance),
              ],
            ),
          );
        },
      ),
    );
  }
}
