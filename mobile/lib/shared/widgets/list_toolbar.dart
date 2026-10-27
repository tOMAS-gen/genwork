import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'labeled_field.dart';
import 'app_dropdown_decoration.dart';

/// Un filtro activo, con la acción que lo quita (`.toolbar-chips`).
typedef ActiveFilter = ({String label, VoidCallback remove});

/// Barra para buscar, filtrar y ordenar un listado, como `.toolbar` de la web
/// (`FilterBar.tsx`) en el teléfono: el buscador ocupa un renglón; debajo van
/// [Filtros], el orden y el cambio grilla/lista. "Filtros" despliega
/// [filtersPanel] dentro de la misma card, y al pie quedan el contador, los
/// filtros activos y "Limpiar filtros".
class ListToolbar<S> extends StatelessWidget {
  const ListToolbar({
    super.key,
    required this.keyPrefix,
    required this.searchHint,
    required this.onSearch,
    required this.sort,
    required this.sortOptions,
    required this.onSort,
    required this.count,
    this.searchController,
    this.filtersExpanded = false,
    this.onToggleFilters,
    this.filtersPanel,
    this.activeFilters = const [],
    this.onClear,
    this.grid,
    this.onGrid,
    this.summaryTrailing,
    this.clearKey,
    this.countKey,
  });

  /// Prefijo de las `ValueKey`: `<prefix>_search`, `<prefix>_filters_toggle`,
  /// `<prefix>_sort`, `<prefix>_view_grid`, `<prefix>_view_list`,
  /// `<prefix>_filters_clear`.
  final String keyPrefix;
  final String searchHint;
  final ValueChanged<String> onSearch;
  final TextEditingController? searchController;

  final S sort;
  final Map<S, String> sortOptions;
  final ValueChanged<S> onSort;

  /// Sin [onToggleFilters] no hay botón "Filtros".
  final bool filtersExpanded;
  final VoidCallback? onToggleFilters;
  final Widget? filtersPanel;
  final List<ActiveFilter> activeFilters;

  /// "Limpiar filtros": aparece si hay búsqueda o filtros activos.
  final VoidCallback? onClear;

  /// Vista de grilla (`true`) o lista. Sin [onGrid] no hay cambio de vista.
  final bool? grid;
  final ValueChanged<bool>? onGrid;

  /// Texto del contador ("3 proyectos").
  final String count;

  /// Acción al pie, a la derecha (p. ej. "Contraer todo").
  final Widget? summaryTrailing;

  /// Claves que la pantalla ya tenía antes de usar la barra (se conservan).
  final Key? clearKey, countKey;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final divider = BorderSide(color: c.border);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.border),
        borderRadius: AppGeometry.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.xs),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _SearchField(
                  fieldKey: ValueKey('${keyPrefix}_search'),
                  hint: searchHint,
                  controller: searchController,
                  onChanged: onSearch,
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    if (onToggleFilters != null) ...[
                      _FiltersButton(
                        key: ValueKey('${keyPrefix}_filters_toggle'),
                        expanded: filtersExpanded,
                        count: activeFilters.length,
                        onPressed: onToggleFilters!,
                      ),
                      const SizedBox(
                        width: AppSpacing.xxs + AppSpacing.hairline,
                      ),
                    ],
                    Expanded(
                      child: _SortSelect<S>(
                        selectKey: ValueKey('${keyPrefix}_sort'),
                        value: sort,
                        options: sortOptions,
                        onChanged: onSort,
                      ),
                    ),
                    if (onGrid != null) ...[
                      const SizedBox(
                        width: AppSpacing.xxs + AppSpacing.hairline,
                      ),
                      _ViewSwitch(
                        keyPrefix: keyPrefix,
                        grid: grid ?? true,
                        onChanged: onGrid!,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          if (filtersExpanded && filtersPanel != null)
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: c.field,
                border: Border(top: divider),
              ),
              child: filtersPanel,
            ),
          Container(
            constraints: const BoxConstraints(minHeight: 40),
            padding: const EdgeInsets.all(AppSpacing.xs),
            decoration: BoxDecoration(border: Border(top: divider)),
            child: Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.xs,
              crossAxisAlignment: WrapCrossAlignment.center,
              alignment: WrapAlignment.spaceBetween,
              children: [
                Text(
                  count,
                  key: countKey,
                  style: AppTextStyles.supporting.copyWith(
                    color: c.muted,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                for (final filter in activeFilters)
                  _ActiveFilterChip(filter: filter),
                if (onClear != null)
                  TextButton(
                    key: clearKey ?? ValueKey('${keyPrefix}_filters_clear'),
                    onPressed: onClear,
                    style: TextButton.styleFrom(
                      foregroundColor: c.muted,
                      textStyle: AppTextStyles.supporting,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xxs,
                      ),
                      minimumSize: const Size(0, 36),
                    ),
                    child: const Text('Limpiar filtros'),
                  ),
                ?summaryTrailing,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.fieldKey,
    required this.hint,
    required this.onChanged,
    this.controller,
  });

  final Key fieldKey;
  final String hint;
  final ValueChanged<String> onChanged;
  final TextEditingController? controller;

  @override
  Widget build(BuildContext context) => TextField(
    key: fieldKey,
    controller: controller,
    onChanged: onChanged,
    textInputAction: TextInputAction.search,
    style: AppTextStyles.body,
    decoration: InputDecoration(
      hintText: hint,
      prefixIcon: const Icon(AppIcons.search, size: AppIconSizes.action),
      isDense: true,
      constraints: const BoxConstraints(minHeight: 44),
    ),
  );
}

class _FiltersButton extends StatelessWidget {
  const _FiltersButton({
    super.key,
    required this.expanded,
    required this.count,
    required this.onPressed,
  });

  final bool expanded;
  final int count;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fg = expanded ? c.brand : c.text;
    return Semantics(
      expanded: expanded,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 44),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
          foregroundColor: fg,
          backgroundColor: expanded ? c.brandFill : Colors.transparent,
          side: BorderSide(color: expanded ? c.brand : c.control),
          shape: const RoundedRectangleBorder(
            borderRadius: AppGeometry.control,
          ),
          textStyle: AppTextStyles.action,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(AppIcons.tune, size: AppIconSizes.field),
            const SizedBox(width: AppSpacing.xxs),
            const Text('Filtros'),
            if (count > 0) ...[
              const SizedBox(width: AppSpacing.xxs),
              Container(
                constraints: const BoxConstraints(minWidth: 18),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxs),
                decoration: BoxDecoration(
                  color: c.brandFill,
                  borderRadius: AppGeometry.chip,
                ),
                child: Text(
                  '$count',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.supporting.copyWith(
                    fontSize: 11,
                    color: c.brand,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SortSelect<S> extends StatelessWidget {
  const _SortSelect({
    required this.selectKey,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final Key selectKey;
  final S value;
  final Map<S, String> options;
  final ValueChanged<S> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: 'Ordenar',
      child: DropdownButtonHideUnderline(
        child: DropdownButton<S>(
          icon: const AppDropdownIcon(),
          key: selectKey,
          value: value,
          isExpanded: true,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxs),
          borderRadius: AppGeometry.menu,
          style: AppTextStyles.body.copyWith(
            color: c.text,
            fontWeight: FontWeight.w500,
          ),
          items: [
            for (final o in options.entries)
              DropdownMenuItem(
                value: o.key,
                child: Text(o.value, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }
}

class _ViewSwitch extends StatelessWidget {
  const _ViewSwitch({
    required this.keyPrefix,
    required this.grid,
    required this.onChanged,
  });

  final String keyPrefix;
  final bool grid;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget option(bool isGrid, IconData icon, String label) {
      final selected = grid == isGrid;
      return Semantics(
        selected: selected,
        child: IconButton(
          key: ValueKey('${keyPrefix}_view_${isGrid ? 'grid' : 'list'}'),
          tooltip: label,
          onPressed: () => onChanged(isGrid),
          constraints: const BoxConstraints(minWidth: 40, minHeight: 36),
          padding: EdgeInsets.zero,
          style: IconButton.styleFrom(
            backgroundColor: selected ? c.brandFill : Colors.transparent,
            foregroundColor: selected ? c.brand : c.muted,
            shape: const RoundedRectangleBorder(borderRadius: AppGeometry.chip),
          ),
          icon: Icon(icon, size: AppIconSizes.field),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.hairline),
      decoration: BoxDecoration(
        color: c.field,
        border: Border.all(color: c.control),
        borderRadius: AppGeometry.control,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          option(true, AppIcons.gridView, 'Ver como grilla'),
          const SizedBox(width: AppSpacing.hairline),
          option(false, AppIcons.list, 'Ver como lista'),
        ],
      ),
    );
  }
}

class _ActiveFilterChip extends StatelessWidget {
  const _ActiveFilterChip({required this.filter});

  final ActiveFilter filter;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: 'Quitar filtro: ${filter.label}',
      excludeSemantics: true,
      child: InkWell(
        onTap: filter.remove,
        borderRadius: AppGeometry.chip,
        child: Container(
          constraints: const BoxConstraints(minHeight: 36),
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xs,
            AppSpacing.hairline,
            AppSpacing.xxs + AppSpacing.hairline,
            AppSpacing.hairline,
          ),
          decoration: BoxDecoration(
            color: c.field,
            border: Border.all(color: c.border),
            borderRadius: AppGeometry.chip,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  filter.label,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.supporting.copyWith(
                    fontSize: 11,
                    color: c.text,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xxs + AppSpacing.hairline),
              Icon(AppIcons.close, size: AppIconSizes.compact, color: c.muted),
            ],
          ),
        ),
      ),
    );
  }
}

/// Campo de un panel de filtros (`.toolbar-filter-field`): rótulo 12/600 arriba
/// y el control debajo.
class ToolbarFilterField extends StatelessWidget {
  const ToolbarFilterField({
    super.key,
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  /// La misma receta que cualquier campo (PS10, T1).
  @override
  Widget build(BuildContext context) =>
      LabeledField(label: label, child: child);
}
