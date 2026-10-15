// Portado de genstock: frontend/lib/shared/widgets/field_suffix.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_icons.dart';
import '../../core/theme/gen_colors.dart';

/// Sufijo de un campo de texto armado con ranuras de ancho fijo, para que los
/// íconos de varios campos apilados caigan en la misma columna. Sin caja
/// mínima ([constraints]) y con cada ícono ocupando [slot], el último queda
/// siempre a la misma distancia del borde, haya uno o tres.
abstract final class FieldSuffix {
  static const slot = 32.0;

  /// Margen hasta el borde.
  static const endInset = 4.0;

  /// Para `InputDecoration.suffixIconConstraints`.
  static const constraints = BoxConstraints(minHeight: 40);

  static Widget row(List<Widget> slots) => Padding(
    padding: const EdgeInsets.only(right: endInset),
    child: Row(mainAxisSize: MainAxisSize.min, children: slots),
  );
}

/// Botón de ícono de una ranura de [FieldSuffix].
class FieldSuffixButton extends StatelessWidget {
  const FieldSuffixButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: FieldSuffix.slot,
      child: IconButton(
        icon: Icon(icon, size: AppIconSizes.field, color: context.colors.muted),
        tooltip: tooltip,
        onPressed: onPressed,
        padding: EdgeInsets.zero,
        style: IconButton.styleFrom(
          minimumSize: const Size.square(FieldSuffix.slot),
          maximumSize: const Size.square(FieldSuffix.slot),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ),
    );
  }
}
