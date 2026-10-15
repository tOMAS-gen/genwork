import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../shared/widgets/count_badge.dart';
import 'drawer_items.dart';
import 'drawer_tile.dart';

class DrawerResourceSection extends StatelessWidget {
  const DrawerResourceSection({
    super.key,
    required this.id,
    required this.title,
    required this.icon,
    required this.selected,
    required this.expanded,
    required this.onToggle,
    required this.onVisit,
    required this.onViewAll,
    required this.value,
    required this.onRetry,
    required this.onOpenItem,
    this.selectedItemId,
    this.shortcuts = const [],
  });

  final String id, title;
  final IconData icon;
  final bool selected, expanded;
  final VoidCallback onToggle, onVisit, onViewAll, onRetry;
  final AsyncValue<List<DrawerItem>> value;
  final void Function(String id) onOpenItem;
  final String? selectedItemId;
  final List<Widget> shortcuts;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ordered = orderDrawerItems(value.value ?? []);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xs,
            vertical: AppSpacing.hairline,
          ),
          child: DrawerTile(
            id: 'nav_$id',
            icon: icon,
            label: title,
            selected: selected,
            // Abrir la sección conserva su ruta y filtros; el control aparte
            // despliega los accesos sin abandonar la pantalla actual.
            onTap: onVisit,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (value.hasValue)
                  CountBadge(
                    key: ValueKey('nav_${id}_total'),
                    count: ordered.total,
                  ),
                Semantics(
                  expanded: expanded,
                  child: IconButton(
                    key: ValueKey('nav_${id}_toggle'),
                    tooltip:
                        '${expanded ? 'Contraer' : 'Desplegar'} ${title.toLowerCase()}',
                    onPressed: onToggle,
                    icon: Icon(
                      expanded ? AppIcons.expandLess : AppIcons.expandMore,
                      size: AppIconSizes.action,
                      color: c.muted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (expanded)
          // Línea guía de 1 px a la izquierda de la sublista.
          Padding(
            padding: const EdgeInsets.only(
              left: AppSpacing.lg,
              right: AppSpacing.xs,
            ),
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border(left: BorderSide(color: c.border)),
              ),
              child: Padding(
                padding: const EdgeInsets.only(left: AppSpacing.xxs),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ...shortcuts,
                    if (value.isLoading)
                      Padding(
                        key: ValueKey('nav_${id}_loading'),
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        child: const LinearProgressIndicator(
                          semanticsLabel: 'Actualizando accesos',
                        ),
                      ),
                    if (value.hasError)
                      ListTile(
                        title: const Text(
                          'No se pudieron actualizar los accesos.',
                        ),
                        subtitle: TextButton.icon(
                          key: ValueKey('nav_${id}_retry'),
                          onPressed: onRetry,
                          icon: const Icon(AppIcons.retry),
                          label: const Text('Reintentar'),
                        ),
                      ),
                    if (value.hasValue &&
                        ordered.items.isEmpty &&
                        !value.isLoading &&
                        !value.hasError)
                      Padding(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        child: Text(
                          'No hay ${title.toLowerCase()} visibles',
                          style: AppTextStyles.supporting.copyWith(
                            color: c.muted,
                          ),
                        ),
                      ),
                    for (final item in ordered.items.take(drawerItemLimit))
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.hairline,
                        ),
                        child: Tooltip(
                          message: [
                            item.name,
                            if (item.subtitle != null) item.subtitle!,
                          ].join(' · '),
                          child: DrawerTile(
                            id: 'nav_${id}_item_${item.id}',
                            compact: true,
                            maxLines: 2,
                            selected: selectedItemId == item.id,
                            leading: Icon(
                              icon,
                              size: AppIconSizes.drawer,
                              color: item.color == null
                                  ? (selectedItemId == item.id
                                        ? c.brand
                                        : c.muted)
                                  : colorFromHex(item.color),
                            ),
                            label: item.name,
                            subtitle: item.subtitle,
                            trailing: CountBadge(count: item.pending),
                            onTap: () => onOpenItem(item.id),
                          ),
                        ),
                      ),
                    if (ordered.items.length > drawerItemLimit)
                      TextButton(
                        key: ValueKey('nav_${id}_more'),
                        onPressed: onViewAll,
                        child: Text(
                          '+${ordered.items.length - drawerItemLimit} más…',
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
