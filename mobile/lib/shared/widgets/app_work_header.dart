// Portado de genstock: frontend/lib/shared/widgets/app_work_header.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Cabecera compartida de las ventanas de trabajo: franja `field`, título,
/// subtítulo opcional y cierre con objetivo táctil de 48. El dueño de la
/// ventana decide cómo cerrar y cuándo deshabilitar el cierre.
class AppWorkHeader extends StatelessWidget {
  const AppWorkHeader({
    super.key,
    required this.title,
    this.icon,
    required this.onClose,
    this.subtitle,
    this.actions = const [],
    this.padding = const EdgeInsets.symmetric(
      horizontal: AppSpacing.md,
      vertical: AppSpacing.xxs,
    ),
  });

  final String title;
  final IconData? icon;
  final String? subtitle;
  final VoidCallback? onClose;
  final List<Widget> actions;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final content = Row(
      children: [
        if (icon != null) ...[
          Icon(icon, color: c.muted, size: AppIconSizes.field),
          const SizedBox(width: AppSpacing.sm),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: AppTextStyles.dialogTitle.copyWith(color: c.text),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: AppSpacing.xxs),
                Text(
                  subtitle!,
                  style: AppTextStyles.supporting.copyWith(color: c.muted),
                ),
              ],
            ],
          ),
        ),
        for (final action in actions) ...[
          const SizedBox(width: AppSpacing.xs),
          action,
        ],
        const SizedBox(width: AppSpacing.xs),
        IconButton(
          tooltip: 'Cerrar',
          style: IconButton.styleFrom(
            foregroundColor: c.muted,
            minimumSize: const Size.square(kMinInteractiveDimension),
            shape: const RoundedRectangleBorder(
              borderRadius: AppGeometry.control,
            ),
          ),
          onPressed: onClose,
          icon: const Icon(AppIcons.close, size: AppIconSizes.field),
        ),
      ],
    );
    return ColoredBox(
      color: c.field,
      child: Padding(padding: padding, child: content),
    );
  }
}
