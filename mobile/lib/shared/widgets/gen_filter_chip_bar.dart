// Portado de genstock: frontend/lib/shared/widgets/gen_filter_chip_bar.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Un chip de [GenFilterChipBar].
class GenFilterChip {
  const GenFilterChip({required this.id, required this.label});

  final String id;
  final String label;
}

/// Barra horizontal scrolleable de chips de filtro. Activo: `brandFill` +
/// borde y texto `brand`. Inactivo: relleno `field` + borde `border` + texto
/// `muted`. Curva [AppGeometry.control].
///
/// El activo no lleva la lengüeta de [LeadingTickBorder]: esa barra vive en
/// listas con borde de arranque (drawer, tabs), no en una fila horizontal.
///
/// Usa `TextButton`, no `ChoiceChip`: los filtros existentes que los tests
/// buscan como `ChoiceChip` se estilan por `chipTheme` y no usan este widget.
class GenFilterChipBar extends StatelessWidget {
  const GenFilterChipBar({
    super.key,
    required this.chips,
    required this.selectedId,
    required this.onSelected,
    this.controlHeight = kMinInteractiveDimension,
    this.contentPadding = const EdgeInsets.symmetric(
      horizontal: AppSpacing.sm,
      vertical: AppSpacing.xs,
    ),
  });

  final List<GenFilterChip> chips;

  /// Altura de los controles.
  final double controlHeight;

  /// Id del chip activo, o `null` si ninguno.
  final String? selectedId;

  final ValueChanged<String>? onSelected;

  /// Margen interno antes del primer chip y en los extremos de la fila.
  final EdgeInsets contentPadding;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: controlHeight + contentPadding.vertical,
      width: double.infinity,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: contentPadding,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            for (final chip in chips) ...[
              _BoxChip(
                label: chip.label,
                height: controlHeight,
                isActive: chip.id == selectedId,
                onTap: onSelected == null ? null : () => onSelected!(chip.id),
              ),
              const SizedBox(width: AppSpacing.xs),
            ],
          ],
        ),
      ),
    );
  }
}

class _BoxChip extends StatelessWidget {
  const _BoxChip({
    required this.label,
    required this.height,
    required this.isActive,
    required this.onTap,
  });

  final String label;
  final double height;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      selected: isActive,
      child: TextButton(
        onPressed: onTap,
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          minimumSize: Size(kMinInteractiveDimension, height),
          tapTargetSize: MaterialTapTargetSize.padded,
          backgroundColor: isActive ? c.brandFill : c.field,
          foregroundColor: isActive ? c.brand : c.muted,
          side: BorderSide(color: isActive ? c.brand : c.border),
          shape: const RoundedRectangleBorder(
            borderRadius: AppGeometry.control,
          ),
          textStyle: AppTextStyles.supporting,
        ),
        child: Text(label),
      ),
    );
  }
}
