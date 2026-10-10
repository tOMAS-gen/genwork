import 'package:flutter/material.dart';
import '../../core/util/format.dart';

/// Selección visual, con opción de asignación automática al crear un sector.
class ColorPalette extends StatelessWidget {
  const ColorPalette({
    super.key,
    required this.value,
    required this.onChanged,
    this.creating = false,
  });
  final String? value;
  final ValueChanged<String?>? onChanged;
  final bool creating;
  static const colors = [
    '#3b5bfa',
    '#0ea5e9',
    '#14b8a6',
    '#22c55e',
    '#eab308',
    '#f97316',
    '#ef4444',
    '#ec4899',
    '#8b5cf6',
    '#64748b',
  ];
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('Color'),
      Wrap(
        spacing: 4,
        runSpacing: 4,
        children: [
          for (final hex in {...colors, ?value})
            Semantics(
              label: 'Color $hex',
              selected: hex.toLowerCase() == value?.toLowerCase(),
              child: IconButton(
                key: ValueKey('color_$hex'),
                tooltip: 'Color $hex',
                style: IconButton.styleFrom(backgroundColor: colorFromHex(hex)),
                onPressed: onChanged == null ? null : () => onChanged!(hex),
                icon: Icon(
                  hex.toLowerCase() == value?.toLowerCase()
                      ? Icons.check
                      : Icons.circle_outlined,
                  color:
                      ThemeData.estimateBrightnessForColor(colorFromHex(hex)) ==
                          Brightness.dark
                      ? Colors.white
                      : Colors.black,
                ),
              ),
            ),
        ],
      ),
      TextButton(
        key: const ValueKey('color_clear'),
        onPressed: onChanged == null ? null : () => onChanged!(null),
        child: Text(creating ? 'Color automático' : 'Sin color'),
      ),
    ],
  );
}
