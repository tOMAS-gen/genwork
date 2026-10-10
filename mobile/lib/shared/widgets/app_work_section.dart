// Portado de genstock: frontend/lib/shared/widgets/app_work_section.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'app_work_box.dart';

/// Sector de trabajo con título, ícono y contenido, sin lógica de negocio.
class AppWorkSection extends StatelessWidget {
  const AppWorkSection({
    super.key,
    this.framed = true,
    required this.title,
    required this.icon,
    required this.child,
    this.expandChild = false,
  });

  /// Desactivar al integrar secciones contiguas separadas por líneas.
  final bool framed;
  final String title;
  final IconData icon;
  final Widget child;

  /// Requiere altura acotada; no usar dentro de un scroll de alto ilimitado.
  final bool expandChild;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(icon, size: AppIconSizes.field, color: c.muted),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.itemTitle.copyWith(color: c.text),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        if (expandChild) Expanded(child: child) else child,
      ],
    );
    return framed
        ? AppWorkBox(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: content,
          )
        : Padding(padding: const EdgeInsets.all(AppSpacing.sm), child: content);
  }
}
