// Portado de genstock: frontend/lib/shared/widgets/app_state_block.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';

/// Envoltorio de un bloque de estado (cargando/error/vacío) dentro de un
/// scroll sin altura acotada: centra [child] y reserva [minHeight] para que no
/// colapse a su contenido.
///
/// **`minHeight`, no `height`**: con `textScaler` alto el mensaje crece, y
/// nunca queda más chico que el piso visual de [AppBlockHeights].
class AppStateBlock extends StatelessWidget {
  const AppStateBlock({
    super.key,
    required this.child,
    this.minHeight = AppBlockHeights.state,
  });

  final Widget child;
  final double minHeight;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: minHeight),
      child: SizedBox(
        width: double.infinity,
        child: Center(child: child),
      ),
    );
  }
}
