// Portado de genstock: frontend/lib/shared/widgets/app_color_contrast.dart
import 'package:flutter/material.dart';

/// Relación de contraste WCAG entre dos colores opacos.
double appContrastRatio(Color foreground, Color background) {
  final foregroundLuminance = foreground.computeLuminance();
  final backgroundLuminance = background.computeLuminance();
  final lighter = foregroundLuminance > backgroundLuminance
      ? foregroundLuminance
      : backgroundLuminance;
  final darker = foregroundLuminance > backgroundLuminance
      ? backgroundLuminance
      : foregroundLuminance;
  return (lighter + 0.05) / (darker + 0.05);
}

/// Resuelve un color translúcido contra la superficie que lo contiene.
Color appColorOver(Color foreground, Color background) =>
    Color.alphaBlend(foreground, background);

/// Conserva el acento cuando alcanza el contraste pedido y usa el fallback
/// semántico del tema cuando no llega.
Color appForegroundWithContrast({
  required Color preferred,
  required Color background,
  required Color fallback,
  required double minimumRatio,
}) => appContrastRatio(preferred, background) >= minimumRatio
    ? preferred
    : fallback;

/// Texto legible sobre un fondo arbitrario: `#111111` si la luminancia es
/// mayor a 0.5, si no `#FFFFFF`. Misma regla que `contrast.ts` de la web.
Color textOn(Color background) => background.computeLuminance() > 0.5
    ? const Color(0xFF111111)
    : const Color(0xFFFFFFFF);

/// Entre `#111111` y `#FFFFFF`, el que más contrasta con [background]. Para
/// íconos y rótulos sobre rellenos de estado, donde `textOn` (luminancia > 0.5)
/// deja el blanco por debajo de 3:1 en verdes medios.
Color readableOn(Color background) =>
    appContrastRatio(const Color(0xFF111111), background) >=
        appContrastRatio(const Color(0xFFFFFFFF), background)
    ? const Color(0xFF111111)
    : const Color(0xFFFFFFFF);
