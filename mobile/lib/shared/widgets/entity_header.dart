import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'color_dot.dart';

/// Encabezado de una entidad abierta —proyecto, sector o grupo— (P14-M1 de la
/// auditoría premium): el mismo en las tres. Título 20/700, el color como un
/// punto de 8 dp, metadatos 13 gris debajo y el menú «⋯» a la derecha.
class EntityHeader extends StatelessWidget {
  const EntityHeader({
    super.key,
    required this.title,
    this.colorHex,
    this.color,
    this.meta,
    this.trailing,
  });

  final String title;

  /// Color de la entidad: [color] si ya está resuelto, o [colorHex].
  final String? colorHex;
  final Color? color;

  /// Metadatos bajo el título (ámbito, grupo, estado, cantidades).
  final Widget? meta;

  /// Menú de acciones de la entidad.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasColor = color != null || colorHex != null;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (hasColor) ...[
                    color == null
                        ? ColorDot(hex: colorHex, size: AppSpacing.xs)
                        : SizedBox.square(
                            dimension: AppSpacing.xs,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                    const SizedBox(width: AppSpacing.xs),
                  ],
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(
                        title,
                        style: AppTextStyles.screenTitle.copyWith(
                          color: c.text,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (meta != null) ...[
                const SizedBox(height: AppSpacing.xxs),
                DefaultTextStyle.merge(
                  style: AppTextStyles.body.copyWith(color: c.muted),
                  child: meta!,
                ),
              ],
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}
