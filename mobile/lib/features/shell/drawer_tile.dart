import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Ítem del drawer: `ListTile` con ícono de 16 `muted`. Seleccionado: fondo
/// `brandFill`, ícono y texto `brand` en 600 y lengüeta de 3 px
/// ([LeadingTickBorder]) en el borde de arranque.
class DrawerTile extends StatelessWidget {
  const DrawerTile({
    super.key,
    required this.id,
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
    this.leading,
    this.subtitle,
    this.trailing,
    this.compact = false,
    this.maxLines = 1,
  });

  /// Va como `ValueKey` del `ListTile` (los tests lo buscan por tipo y key).
  final String id;
  final IconData? icon;

  /// Reemplaza al ícono (p. ej. el ícono tintado con el color del recurso).
  final Widget? leading;
  final String label;
  final String? subtitle;
  final bool selected, compact;
  final int maxLines;
  final Widget? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final base = compact ? AppTextStyles.body : AppTextStyles.itemTitle;
    return ListTile(
      key: ValueKey(id),
      selected: selected,
      contentPadding: EdgeInsets.only(
        left: compact ? AppSpacing.sm : AppSpacing.md,
        right: AppSpacing.xs,
      ),
      minVerticalPadding: AppSpacing.xxs,
      minTileHeight: compact ? 44 : AppSpacing.xxxl,
      minLeadingWidth: AppSpacing.md,
      horizontalTitleGap: AppSpacing.sm,
      selectedColor: c.brand,
      selectedTileColor: c.brandFill,
      shape: selected
          ? LeadingTickBorder(tickColor: c.brand)
          : const RoundedRectangleBorder(borderRadius: AppGeometry.control),
      leading:
          leading ??
          (icon == null
              ? null
              : Icon(
                  icon,
                  size: AppIconSizes.drawer,
                  color: selected ? c.brand : c.muted,
                )),
      title: Text(
        label,
        maxLines: maxLines,
        overflow: TextOverflow.ellipsis,
        style: base.copyWith(
          fontWeight: selected ? FontWeight.w600 : base.fontWeight,
          color: selected ? c.brand : c.text,
        ),
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.supporting.copyWith(color: c.muted),
            ),
      trailing: trailing,
      onTap: onTap,
    );
  }
}
