import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';

/// Selección visual, con opción de asignación automática al crear un sector.
class ColorPalette extends StatelessWidget {
  const ColorPalette({
    super.key,
    required this.value,
    required this.onChanged,
    this.creating = false,
    this.allowClear = true,
    this.label = 'Color',
  });
  final String? value;
  final ValueChanged<String?>? onChanged;
  final bool creating;

  /// Ofrece «Sin color»/«Color automático»; desactivar si el color es obligatorio.
  final bool allowClear;

  /// Título sobre los swatches.
  final String label;

  /// Color por defecto (marca). Se ofrece primero, además de la paleta.
  static const defaultColor = '#3b5bfa';

  /// Paleta única del sistema (`src/lib/domain/colors/palette.ts`).
  static const colors = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#22c55e',
    '#10b981',
    '#14b8a6',
    '#0ea5e9',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#d946ef',
    '#ec4899',
    '#6b7280',
    '#475569',
    '#92400e',
  ];

  /// Lado visual de cada swatch.
  static const double swatchSize = 32;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label),
      Wrap(
        spacing: AppSpacing.xxs,
        runSpacing: AppSpacing.xxs,
        children: [
          for (final hex in {defaultColor, ...colors, ?value})
            _Swatch(
              hex: hex,
              selected: hex.toLowerCase() == value?.toLowerCase(),
              onTap: onChanged == null ? null : () => onChanged!(hex),
            ),
        ],
      ),
      if (allowClear)
        TextButton(
          key: const ValueKey('color_clear'),
          onPressed: onChanged == null ? null : () => onChanged!(null),
          child: Text(creating ? 'Color automático' : 'Sin color'),
        ),
    ],
  );
}

class _Swatch extends StatelessWidget {
  const _Swatch({
    required this.hex,
    required this.selected,
    required this.onTap,
  });
  final String hex;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = colorFromHex(hex);
    return Semantics(
      label: 'Color $hex',
      selected: selected,
      child: IconButton(
        key: ValueKey('color_$hex'),
        tooltip: 'Color $hex',
        style: IconButton.styleFrom(
          backgroundColor: color,
          fixedSize: const Size.square(ColorPalette.swatchSize),
          minimumSize: const Size.square(ColorPalette.swatchSize),
          padding: EdgeInsets.zero,
          shape: const RoundedRectangleBorder(
            borderRadius: AppGeometry.control,
          ),
        ),
        onPressed: onTap,
        icon: Icon(
          selected ? AppIcons.check : AppIcons.radioOff,
          color: textOn(color),
        ),
      ),
    );
  }
}
