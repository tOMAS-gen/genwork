// Portado de genstock: frontend/lib/shared/widgets/status_chip.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/color_contrast.dart';
import '../../core/theme/gen_colors.dart';

/// Chip de estado con color semántico: fondo `fill` (translúcido o no) sobre
/// `surface`, texto del color de acento si alcanza el contraste.
class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    required this.color,
    required this.fill,
    this.uppercase = false,
    this.mono = false,
  });

  final String label;
  final Color color;
  final Color fill;
  final bool uppercase;

  /// Texto en Roboto Mono (fechas, códigos y números).
  final bool mono;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final effectiveBackground = appColorOver(fill, colors.surface);
    final effectiveAccent = appForegroundWithContrast(
      preferred: color,
      background: effectiveBackground,
      fallback: colors.muted,
      minimumRatio: 3,
    );
    final textColor = appForegroundWithContrast(
      preferred: effectiveAccent,
      background: effectiveBackground,
      fallback: colors.text,
      minimumRatio: 4.5,
    );

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: AppSpacing.xxs / 2,
      ),
      decoration: BoxDecoration(
        color: effectiveBackground,
        borderRadius: AppGeometry.chip,
      ),
      child: Text(
        uppercase ? label.toUpperCase() : label,
        maxLines: 1,
        softWrap: false,
        overflow: TextOverflow.ellipsis,
        style: (mono ? AppTextStyles.technical : AppTextStyles.chip).copyWith(
          color: textColor,
        ),
      ),
    );
  }
}

/// Chip informativo genérico (sync, carga, info).
class InfoChip extends StatelessWidget {
  const InfoChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return StatusChip(label: label, color: c.info, fill: c.infoFill);
  }
}
