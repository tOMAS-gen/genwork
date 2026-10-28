import 'package:flutter/material.dart';

/// Ancho desde el que el contenido deja de ocupar toda la ventana (T7).
const double contentWideAt = 600;

/// Ancho máximo del contenido en ventanas anchas (T7).
const double contentMaxWidth = 720;

/// En tablet, pantalla dividida o plegable abierto, centra el contenido y lo
/// limita a [contentMaxWidth] para que las líneas no se estiren. En el
/// teléfono no cambia nada.
class ContentWidth extends StatelessWidget {
  const ContentWidth({super.key, required this.child});

  final Widget child;

  /// Si la ventana es ancha (para elegir grillas en lugar de listas).
  static bool isWide(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= contentWideAt;

  // La misma forma de árbol en todo ancho: al girar o redimensionar no se
  // pierde el estado de lo que hay adentro (desplazamiento, borradores).
  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.topCenter,
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: isWide(context) ? contentMaxWidth : double.infinity,
      ),
      child: child,
    ),
  );
}
