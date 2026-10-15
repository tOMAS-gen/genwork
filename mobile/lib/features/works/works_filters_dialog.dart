import 'package:flutter/material.dart';
import '../../core/theme/app_geometry.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/app_form_dialog.dart';
import 'works_dashboard.dart';
import 'works_filter.dart';

typedef WorkFilters = ({
  Set<String> groups,
  String? sector,
  String? label,
  ProjectStatus? status,
  WorksSort sort,
});
const emptyWorkFilters = (
  groups: <String>{},
  sector: null,
  label: null,
  status: null,
  sort: WorksSort.recent,
);

Future<WorkFilters?> showWorksFilters(
  BuildContext context, {
  required List<WorkSummary> works,
  required Map<String, String> sectors,
  required WorkFilters current,
}) => showAppFormDialog<WorkFilters>(
  context,
  builder: (_) => _Filters(works: works, sectors: sectors, current: current),
);

class _Filters extends StatefulWidget {
  const _Filters({
    required this.works,
    required this.sectors,
    required this.current,
  });
  final List<WorkSummary> works;
  final Map<String, String> sectors;
  final WorkFilters current;
  @override
  State<_Filters> createState() => _FiltersState();
}

class _FiltersState extends State<_Filters> {
  late WorkFilters filters = (
    groups: {...widget.current.groups},
    sector: widget.current.sector,
    label: widget.current.label,
    status: widget.current.status,
    sort: widget.current.sort,
  );
  @override
  Widget build(BuildContext context) {
    final groups = {
      for (final w in widget.works) w.groupId ?? '': w.groupName ?? 'Sin grupo',
    };
    final labels = {
      for (final w in widget.works)
        for (final l in w.labels)
          if (l.valueId != null) l.valueId!: '${l.keyName}: ${l.valueName}',
    };
    final sectors = {...widget.sectors};
    if (filters.sector != null) {
      sectors.putIfAbsent(filters.sector!, () => 'Sector no disponible');
    }
    if (filters.label != null) {
      labels.putIfAbsent(filters.label!, () => 'Etiqueta no disponible');
    }
    for (final selected in filters.groups) {
      groups.putIfAbsent(selected, () => 'Grupo no disponible');
    }
    return AppWorkDialog(
      title: 'Filtrar y ordenar proyectos',
      actions: [
        TextButton(
          key: const ValueKey('works_filters_clear'),
          onPressed: () => setState(() => filters = emptyWorkFilters),
          child: const Text('Limpiar filtros'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('works_filters_apply'),
          onPressed: () => Navigator.pop(context, filters),
          child: const Text('Aplicar'),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Grupos'),
          for (final g in groups.entries)
            CheckboxListTile(
              key: ValueKey('works_filter_group_${g.key}'),
              contentPadding: EdgeInsets.zero,
              title: Text(g.value),
              value: filters.groups.contains(g.key),
              onChanged: (v) => setState(() {
                final selected = {...filters.groups};
                if (v == true) {
                  selected.add(g.key);
                } else {
                  selected.remove(g.key);
                }
                filters = (
                  groups: selected,
                  sector: filters.sector,
                  label: filters.label,
                  status: filters.status,
                  sort: filters.sort,
                );
              }),
            ),
          const SizedBox(height: AppSpacing.sm),
          DropdownButtonFormField<String>(
            key: ValueKey('works_filter_sector_${filters.sector}'),
            isExpanded: true,
            initialValue: filters.sector,
            decoration: const InputDecoration(labelText: 'Sector'),
            items: [
              const DropdownMenuItem(
                value: null,
                child: Text('Todos los sectores'),
              ),
              for (final s in sectors.entries)
                DropdownMenuItem(
                  value: s.key,
                  child: Text(s.value, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (v) => setState(
              () => filters = (
                groups: filters.groups,
                sector: v,
                label: filters.label,
                status: filters.status,
                sort: filters.sort,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          DropdownButtonFormField<String>(
            key: ValueKey('works_filter_label_${filters.label}'),
            isExpanded: true,
            initialValue: filters.label,
            decoration: const InputDecoration(labelText: 'Etiqueta'),
            items: [
              const DropdownMenuItem(
                value: null,
                child: Text('Todas las etiquetas'),
              ),
              for (final l in labels.entries)
                DropdownMenuItem(
                  value: l.key,
                  child: Text(l.value, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (v) => setState(
              () => filters = (
                groups: filters.groups,
                sector: filters.sector,
                label: v,
                status: filters.status,
                sort: filters.sort,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          DropdownButtonFormField<ProjectStatus>(
            key: ValueKey('works_filter_progress_${filters.status}'),
            isExpanded: true,
            initialValue: filters.status,
            decoration: const InputDecoration(labelText: 'Avance'),
            items: const [
              DropdownMenuItem(value: null, child: Text('Cualquier avance')),
              DropdownMenuItem(
                value: ProjectStatus.pending,
                child: Text('Pendientes'),
              ),
              DropdownMenuItem(
                value: ProjectStatus.inProgress,
                child: Text('En progreso'),
              ),
              DropdownMenuItem(
                value: ProjectStatus.completed,
                child: Text('Completados'),
              ),
            ],
            onChanged: (v) => setState(
              () => filters = (
                groups: filters.groups,
                sector: filters.sector,
                label: filters.label,
                status: v,
                sort: filters.sort,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          DropdownButtonFormField<WorksSort>(
            key: ValueKey('works_filter_sort_${filters.sort}'),
            isExpanded: true,
            initialValue: filters.sort,
            decoration: const InputDecoration(labelText: 'Ordenar'),
            items: const [
              DropdownMenuItem(
                value: WorksSort.recent,
                child: Text('Más recientes y favoritos'),
              ),
              DropdownMenuItem(value: WorksSort.name, child: Text('Nombre')),
              DropdownMenuItem(
                value: WorksSort.progress,
                child: Text('Mayor avance'),
              ),
            ],
            onChanged: (v) => setState(
              () => filters = (
                groups: filters.groups,
                sector: filters.sector,
                label: filters.label,
                status: filters.status,
                sort: v!,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
