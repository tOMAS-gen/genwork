import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Píldora con el nombre de un proyecto o sector (como `.pc-name-pill` de la
/// web): en MAYÚSCULAS, 14/600, radio 4, del color del recurso (fondo 14 %
/// sobre `surface`, texto 80 % con `text`) o, sin color, `hover` y `text`.
class NamePill extends StatelessWidget {
  const NamePill({super.key, required this.name, this.color});

  final String name;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: AppSpacing.xxs,
      ),
      decoration: BoxDecoration(
        color: color == null ? c.hover : c.chipFill(color!),
        borderRadius: AppGeometry.chip,
      ),
      child: Text(
        name.toUpperCase(),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: AppTextStyles.itemTitle.copyWith(
          color: color == null ? c.text : c.chipText(color!),
        ),
      ),
    );
  }
}
