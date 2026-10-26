import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/list_toolbar.dart';
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

/// Orden del listado, con los textos del selector de la web.
const worksSortOptions = {
  WorksSort.recent: 'Más recientes',
  WorksSort.name: 'Nombre · A–Z',
  WorksSort.progress: 'Mayor avance',
};

/// Texto de cada estado en el filtro, como la web.
const worksStatusLabels = {
  ProjectStatus.pending: 'Pendiente',
  ProjectStatus.inProgress: 'En progreso',
  ProjectStatus.completed: 'Completado',
};

/// Grupos visibles en el listado: id (vacío = personal) → nombre.
Map<String, String> worksGroups(List<WorkSummary> works) => {
  for (final w in works) w.groupId ?? '': w.groupName ?? 'Sin grupo',
};

/// Etiquetas usadas en el listado: id del valor → "Clave: Valor".
Map<String, String> worksLabels(List<WorkSummary> works) => {
  for (final w in works)
    for (final l in w.labels)
      if (l.valueId != null) l.valueId!: '${l.keyName}: ${l.valueName}',
};

/// Panel de filtros de Proyectos, como `.toolbar-filter-panel` de la web:
/// Sector, Etiqueta y Estado, y los grupos con casillas. Cada cambio se aplica
/// en el acto ([onChanged]).
class WorksFiltersPanel extends StatelessWidget {
  const WorksFiltersPanel({
    super.key,
    required this.works,
    required this.sectors,
    required this.filters,
    required this.onChanged,
  });

  final List<WorkSummary> works;
  final Map<String, String> sectors;
  final WorkFilters filters;
  final ValueChanged<WorkFilters> onChanged;

  void _set({
    Set<String>? groups,
    String? sector,
    bool clearSector = false,
    String? label,
    bool clearLabel = false,
    ProjectStatus? status,
    bool clearStatus = false,
  }) => onChanged((
    groups: groups ?? filters.groups,
    sector: clearSector ? null : sector ?? filters.sector,
    label: clearLabel ? null : label ?? filters.label,
    status: clearStatus ? null : status ?? filters.status,
    sort: filters.sort,
  ));

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final groups = worksGroups(works);
    final labels = worksLabels(works);
    final sectorOptions = {...sectors};
    if (filters.sector != null) {
      sectorOptions.putIfAbsent(filters.sector!, () => 'Sector no disponible');
    }
    if (filters.label != null) {
      labels.putIfAbsent(filters.label!, () => 'Etiqueta no disponible');
    }
    for (final selected in filters.groups) {
      groups.putIfAbsent(selected, () => 'Grupo no disponible');
    }

    Widget select<T>({
      required String fieldKey,
      required T? value,
      required String all,
      required Map<T, String> options,
      required ValueChanged<T?> onSelect,
    }) => DropdownButtonFormField<T>(
      key: ValueKey(fieldKey),
      isExpanded: true,
      initialValue: value,
      style: AppTextStyles.body.copyWith(color: c.text),
      decoration: InputDecoration(filled: true, fillColor: c.surface),
      items: [
        DropdownMenuItem(value: null, child: Text(all)),
        for (final o in options.entries)
          DropdownMenuItem(
            value: o.key,
            child: Text(o.value, overflow: TextOverflow.ellipsis),
          ),
      ],
      onChanged: onSelect,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ToolbarFilterField(
          label: 'Sector',
          child: select<String>(
            fieldKey: 'works_filter_sector_${filters.sector}',
            value: filters.sector,
            all: 'Todos los sectores',
            options: sectorOptions,
            onSelect: (v) => _set(sector: v, clearSector: v == null),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ToolbarFilterField(
          label: 'Etiqueta',
          child: select<String>(
            fieldKey: 'works_filter_label_${filters.label}',
            value: filters.label,
            all: 'Todas las etiquetas',
            options: labels,
            onSelect: (v) => _set(label: v, clearLabel: v == null),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ToolbarFilterField(
          label: 'Estado',
          child: select<ProjectStatus>(
            fieldKey: 'works_filter_progress_${filters.status}',
            value: filters.status,
            all: 'Todos los estados',
            options: worksStatusLabels,
            onSelect: (v) => _set(status: v, clearStatus: v == null),
          ),
        ),
        if (groups.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          Text.rich(
            TextSpan(
              text: 'Grupos',
              style: AppTextStyles.supporting.copyWith(
                fontWeight: FontWeight.w600,
                color: c.text,
              ),
              children: [
                TextSpan(
                  text: '   Podés elegir más de uno',
                  style: AppTextStyles.supporting.copyWith(
                    fontSize: 11,
                    color: c.muted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.lg,
            children: [
              for (final g in groups.entries)
                InkWell(
                  key: ValueKey('works_filter_group_${g.key}'),
                  onTap: () {
                    final selected = {...filters.groups};
                    if (!selected.remove(g.key)) selected.add(g.key);
                    _set(groups: selected);
                  },
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 44),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Checkbox(
                          value: filters.groups.contains(g.key),
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                          onChanged: (_) {
                            final selected = {...filters.groups};
                            if (!selected.remove(g.key)) selected.add(g.key);
                            _set(groups: selected);
                          },
                        ),
                        const SizedBox(width: AppSpacing.xxs),
                        Text(
                          g.value,
                          style: AppTextStyles.body.copyWith(
                            color: filters.groups.contains(g.key)
                                ? c.text
                                : c.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
