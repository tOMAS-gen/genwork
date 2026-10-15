// Portado de genstock: frontend/lib/shared/widgets/app_inline_notice.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/color_contrast.dart';
import '../../core/theme/gen_colors.dart';

/// Tonos semánticos del aviso inline compartido.
enum AppInlineNoticeTone { info, success, warning, error }

/// Aviso para mensajes de varias líneas. Es un bloque INLINE: va en el flujo
/// de la pantalla, con la curva de card y sin sombra (no flota sobre nada).
class AppInlineNotice extends StatelessWidget {
  const AppInlineNotice({
    super.key,
    required this.message,
    this.tone = AppInlineNoticeTone.info,
    this.icon,
  });

  const AppInlineNotice.error({super.key, required this.message})
    : tone = AppInlineNoticeTone.error,
      icon = null;

  const AppInlineNotice.warning({super.key, required this.message})
    : tone = AppInlineNoticeTone.warning,
      icon = null;

  final String message;
  final AppInlineNoticeTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final palette = _palette(colors, tone);
    final effectiveBackground = appColorOver(palette.fill, colors.surface);
    final textColor = appForegroundWithContrast(
      preferred: palette.text,
      background: effectiveBackground,
      fallback: colors.text,
      minimumRatio: 4.5,
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: palette.fill,
        border: Border.all(color: palette.accent),
        borderRadius: AppGeometry.card,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon ?? palette.icon,
            size: AppIconSizes.notice,
            color: palette.accent,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              softWrap: true,
              style: AppTextStyles.supporting.copyWith(color: textColor),
            ),
          ),
        ],
      ),
    );
  }
}

class _NoticePalette {
  const _NoticePalette({
    required this.accent,
    required this.fill,
    required this.text,
    required this.icon,
  });

  final Color accent;
  final Color fill;
  final Color text;
  final IconData icon;
}

_NoticePalette _palette(GenColors c, AppInlineNoticeTone tone) {
  return switch (tone) {
    AppInlineNoticeTone.info => _NoticePalette(
      accent: c.info,
      fill: c.infoFill,
      text: c.infoText,
      icon: AppIcons.info,
    ),
    AppInlineNoticeTone.success => _NoticePalette(
      accent: c.success,
      fill: c.successFill,
      text: c.successText,
      icon: AppIcons.success,
    ),
    AppInlineNoticeTone.warning => _NoticePalette(
      accent: c.warning,
      fill: c.warningFill,
      text: c.warningText,
      icon: AppIcons.warning,
    ),
    AppInlineNoticeTone.error => _NoticePalette(
      accent: c.danger,
      fill: c.dangerFill,
      text: c.danger,
      icon: AppIcons.error,
    ),
  };
}
