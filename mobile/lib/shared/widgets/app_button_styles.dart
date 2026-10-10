// Portado de genstock: frontend/lib/shared/widgets/app_button_styles.dart
import 'package:flutter/material.dart';

import '../../core/theme/gen_colors.dart';

/// Estilos que necesitan emparejar superficie y texto explícitamente.
abstract final class AppButtonStyles {
  /// Conserva el contraste al sustituir el azul de FilledButton por rojo.
  static ButtonStyle destructiveFilled(BuildContext context) =>
      FilledButton.styleFrom(
        backgroundColor: context.colors.danger,
        foregroundColor: Theme.of(context).colorScheme.onError,
      );

  /// Botón de contorno para una acción destructiva (borrar): texto y borde
  /// `danger`.
  static ButtonStyle destructiveOutlined(BuildContext context) =>
      OutlinedButton.styleFrom(
        foregroundColor: context.colors.danger,
        side: BorderSide(color: context.colors.danger),
      );
}
