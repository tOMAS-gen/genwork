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

/// Sección desplegable del drawer, como `.nav-group` de la web: el rótulo en
/// mayúsculas (con flecha, ícono y contador de pendientes) despliega la
/// sublista, y "ver todos" abre la sección. La sublista lleva una línea guía de
/// 1 px a la izquierda, los accesos directos y hasta [drawerItemLimit] ítems.
class DrawerResourceSection extends StatelessWidget {
  const DrawerResourceSection({
    super.key,
    required this.id,
    required this.title,
    required this.icon,
    required this.itemIcon,
    required this.expanded,
    required this.onToggle,
    required this.onVisit,
    required this.onViewAll,
    required this.value,
    required this.onRetry,
    required this.onOpenItem,
    this.selectedItemId,
    this.shortcuts = const [],
    this.itemLabel = DrawerItemLabel.name,
  });

  final String id, title;
  final IconData icon, itemIcon;
  final bool expanded;
  final VoidCallback onToggle, onVisit, onViewAll, onRetry;
  final AsyncValue<List<DrawerItem>> value;
  final void Function(String id) onOpenItem;
  final String? selectedItemId;
  final List<Widget> shortcuts;

  /// Cómo se muestra el `subtitle` de cada ítem (grupo del proyecto o ámbito
  /// del sector), en el mismo renglón que el nombre.
  final DrawerItemLabel itemLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ordered = orderDrawerItems(value.value ?? []);
    final labelStyle = AppTextStyles.sectionLabel.copyWith(color: c.muted);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  expanded: expanded,
                  button: true,
                  label:
                      '${expanded ? 'Contraer' : 'Desplegar'} ${title.toLowerCase()}',
                  excludeSemantics: true,
                  child: InkWell(
                    key: ValueKey('nav_${id}_toggle'),
                    borderRadius: AppGeometry.control,
                    onTap: onToggle,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(
                        minHeight: kMinInteractiveDimension,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xs,
                        ),
                        child: Row(
                          children: [
                            AnimatedRotation(
                              turns: expanded ? 0.25 : 0,
                              duration: const Duration(milliseconds: 180),
                              child: Icon(
                                AppIcons.chevronRight,
                                size: AppIconSizes.compact,
                                color: c.muted,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.xxs),
                            Icon(
                              icon,
                              size: AppIconSizes.drawer,
                              color: c.muted,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Expanded(
                              child: Text(
                                title.toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: labelStyle,
                              ),
                            ),
                            if (value.hasValue)
                              CountBadge(
                                key: ValueKey('nav_${id}_total'),
                                count: ordered.total,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              TextButton(
                key: ValueKey('nav_$id'),
                // Abrir la sección conserva su ruta y filtros.
                onPressed: onVisit,
                // "ver todos" en 12/600 de marca: no compite con el activo
                // (P03-M1).
                style: TextButton.styleFrom(
                  foregroundColor: c.brand,
                  textStyle: AppTextStyles.supporting.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xs,
                  ),
                ),
                child: const Text('ver todos'),
              ),
            ],
          ),
        ),
        if (expanded)
          // Línea guía de 1 px a la izquierda de la sublista (`.nav-sublist`).
          Padding(
            padding: const EdgeInsets.only(
              left: AppSpacing.md,
              right: AppSpacing.xs,
              bottom: AppSpacing.xs,
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
                    // Sin Tooltip: TalkBack leía el nombre dos veces (T9).
                    for (final item in ordered.items.take(drawerItemLimit))
                      DrawerTile(
                        id: 'nav_${id}_item_${item.id}',
                        compact: true,
                        selected: selectedItemId == item.id,
                        leading: Icon(
                          itemIcon,
                          size: AppIconSizes.action,
                          color: item.color == null
                              ? (selectedItemId == item.id ? c.brand : c.muted)
                              : colorFromHex(item.color),
                        ),
                        // El nombre primero; el grupo o el ámbito de sufijo
                        // (P03-M3).
                        label: item.name,
                        suffix: itemLabel == DrawerItemLabel.suffix
                            ? item.subtitle
                            : null,
                        trailing: CountBadge(count: item.pending),
                        onTap: () => onOpenItem(item.id),
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

/// Cómo se arma el texto de un ítem de la sublista.
enum DrawerItemLabel {
  /// Solo el nombre (grupos).
  name,

  /// El nombre y, en `muted`, el grupo (proyectos) o el ámbito (sectores).
  suffix,
}
