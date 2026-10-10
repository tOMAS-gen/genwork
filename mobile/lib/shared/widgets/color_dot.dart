import 'package:flutter/material.dart';

import '../../core/util/format.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import 'status_chip.dart';

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

/// Pill rectangular (radio 4) con color de etiqueta/estado: fondo 14 % del
/// color sobre `surface`, texto 80 % del color con `text`.
class ColorPill extends StatelessWidget {
  const ColorPill({super.key, required this.label, this.hex});

  final String label;
  final String? hex;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = colorFromHex(hex);
    return StatusChip(
      label: label,
      color: c.chipText(color),
      fill: c.chipFill(color),
    );
  }
}
