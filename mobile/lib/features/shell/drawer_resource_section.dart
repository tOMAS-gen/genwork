import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/util/format.dart';
import '../../shared/widgets/count_badge.dart';
import 'drawer_items.dart';

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
    final theme = Theme.of(context);
    final ordered = orderDrawerItems(value.value ?? []);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpace.sm,
            vertical: AppSpace.xxs,
          ),
          child: Material(
            color: selected
                ? theme.colorScheme.primaryContainer
                : Colors.transparent,
            borderRadius: AppTokens.of(context).controlRadius,
            child: ListTile(
              key: ValueKey('nav_$id'),
              selected: selected,
              selectedColor: theme.colorScheme.onPrimaryContainer,
              contentPadding: const EdgeInsets.only(
                left: AppSpace.md,
                right: AppSpace.xxs,
              ),
              minTileHeight: AppSpace.touch + AppSpace.sm,
              leading: Icon(icon),
              title: Text(title, style: theme.textTheme.titleSmall),
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
                        expanded ? Icons.expand_less : Icons.expand_more,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (expanded)
          Padding(
            padding: const EdgeInsets.only(
              left: AppSpace.lg,
              right: AppSpace.sm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ...shortcuts,
                if (value.isLoading)
                  Padding(
                    key: ValueKey('nav_${id}_loading'),
                    padding: const EdgeInsets.all(AppSpace.md),
                    child: const LinearProgressIndicator(
                      semanticsLabel: 'Actualizando accesos',
                    ),
                  ),
                if (value.hasError)
                  ListTile(
                    title: const Text('No se pudieron actualizar los accesos.'),
                    subtitle: TextButton.icon(
                      key: ValueKey('nav_${id}_retry'),
                      onPressed: onRetry,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Reintentar'),
                    ),
                  ),
                if (value.hasValue &&
                    ordered.items.isEmpty &&
                    !value.isLoading &&
                    !value.hasError)
                  Padding(
                    padding: const EdgeInsets.all(AppSpace.md),
                    child: Text(
                      'No hay ${title.toLowerCase()} visibles',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                for (final item in ordered.items.take(drawerItemLimit))
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpace.xxs),
                    child: Material(
                      color: selectedItemId == item.id
                          ? theme.colorScheme.primaryContainer
                          : Colors.transparent,
                      borderRadius: AppTokens.of(context).controlRadius,
                      child: Tooltip(
                        message: [
                          item.name,
                          if (item.subtitle != null) item.subtitle!,
                        ].join(' · '),
                        child: ListTile(
                          key: ValueKey('nav_${id}_item_${item.id}'),
                          selected: selectedItemId == item.id,
                          selectedColor: theme.colorScheme.onPrimaryContainer,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: AppSpace.sm,
                          ),
                          minTileHeight: AppSpace.touch,
                          minLeadingWidth: AppSpace.icon,
                          horizontalTitleGap: AppSpace.sm,
                          leading: Icon(
                            icon,
                            color: item.color == null
                                ? null
                                : colorFromHex(item.color),
                          ),
                          title: Text(
                            item.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: item.subtitle == null
                              ? null
                              : Text(
                                  item.subtitle!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                          trailing: CountBadge(count: item.pending),
                          onTap: () => onOpenItem(item.id),
                        ),
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
      ],
    );
  }
}
