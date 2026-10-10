import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Migas de pan de una página de detalle, como las de la web: «Raíz / Nombre».
/// El texto de la raíz es tocable; si no entra en un renglón, envuelve.
class Breadcrumb extends StatelessWidget {
  const Breadcrumb({
    super.key,
    required this.rootLabel,
    required this.onRoot,
    required this.current,
    this.rootKey,
  });

  final String rootLabel, current;
  final VoidCallback onRoot;
  final Key? rootKey;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = AppTextStyles.itemTitle.copyWith(
      fontWeight: FontWeight.w400,
      color: c.muted,
    );
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        InkWell(
          key: rootKey,
          onTap: onRoot,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
            child: Text(rootLabel, style: style),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
          child: Text('/', style: style.copyWith(color: c.outline)),
        ),
        Text(current, style: style),
      ],
    );
  }
}
