import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Miga de una página de detalle o subpantalla (D9 de la auditoría premium):
/// 12/500 gris, que no compite con el título. Muestra el nivel padre, tocable
/// con 48 dp de alto, seguido de «›»; [current] solo se agrega cuando el
/// título de la pantalla no lo repite (p. ej. «Mis notas › Nota»).
class Breadcrumb extends StatelessWidget {
  const Breadcrumb({
    super.key,
    required this.rootLabel,
    required this.onRoot,
    this.current,
    this.rootKey,
  });

  final String rootLabel;
  final String? current;
  final VoidCallback onRoot;
  final Key? rootKey;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = AppTextStyles.supporting.copyWith(
      fontWeight: FontWeight.w500,
      color: c.muted,
    );
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        InkWell(
          key: rootKey,
          onTap: onRoot,
          borderRadius: AppGeometry.chip,
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              minHeight: kMinInteractiveDimension,
            ),
            child: Align(widthFactor: 1, child: Text(rootLabel, style: style)),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxs),
          child: Text('›', style: style),
        ),
        if (current != null) Text(current!, style: style),
      ],
    );
  }
}
