import 'package:flutter/material.dart';

import '../../core/util/format.dart';
import '../../core/theme/app_theme.dart';

class ColorDot extends StatelessWidget {
  const ColorDot({super.key, required this.hex, this.size = AppSpace.dot});

  final String? hex;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: colorFromHex(hex), shape: BoxShape.circle),
  );
}

/// Pill rectangular (radio bajo) con color de etiqueta/estado.
class ColorPill extends StatelessWidget {
  const ColorPill({super.key, required this.label, this.hex});

  final String label;
  final String? hex;

  @override
  Widget build(BuildContext context) {
    final color = colorFromHex(hex);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.sm,
        vertical: AppSpace.xxs,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: AppTokens.of(context).controlRadius,
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Theme.of(context).colorScheme.onSurface,
        ),
      ),
    );
  }
}
