import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Ítem del drawer: `ListTile` de 48 dp con ícono de 20 `muted` y texto
/// 14/500 sobre un solo eje (P03-M1, P03-M2). [compact] es el ítem de una
/// sublista: el mismo tamaño, en `muted`. Seleccionado: fondo `brandFill`,
/// ícono y texto `brand` en 600 y lengüeta de 3 px ([LeadingTickBorder]) en el
/// borde de arranque. [suffix] se agrega al texto en 12 `muted` (el grupo de
/// un proyecto o el ámbito de un sector).
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
    this.suffix,
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
  final String? suffix;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final base = AppTextStyles.nav.copyWith(color: compact ? c.muted : c.text);
    return ListTile(
      key: ValueKey(id),
      selected: selected,
      contentPadding: EdgeInsets.only(
        left: compact ? AppSpacing.sm : AppSpacing.xs,
        right: AppSpacing.xs,
      ),
      // Con subtítulo, ListTile pasa a modo compacto e ignora el mínimo de
      // alto: el relleno lo lleva a 48 dp (T4).
      minVerticalPadding: subtitle == null ? AppSpacing.xxs : AppSpacing.xs,
      minTileHeight: kMinInteractiveDimension,
      minLeadingWidth: AppIconSizes.action,
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
                  size: AppIconSizes.action,
                  color: selected ? c.brand : c.muted,
                )),
      title: Text.rich(
        TextSpan(
          text: label,
          children: [
            if (suffix != null)
              TextSpan(
                text: '  $suffix',
                style: AppTextStyles.supporting.copyWith(color: c.muted),
              ),
          ],
        ),
        maxLines: maxLines,
        overflow: TextOverflow.ellipsis,
        style: base.copyWith(
          fontWeight: selected ? FontWeight.w600 : base.fontWeight,
          color: selected ? c.brand : base.color,
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
