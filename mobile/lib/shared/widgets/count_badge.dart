import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';

/// Contador de 18 dp (P03-M4): fondo `hover` sin borde, radio de chip y
/// cifra 11/600 en mono tabular `muted`. Oculto en 0 y "999+" desde 1000. Lo lee un lector de pantalla como una sola frase
/// ("3 tareas pendientes"); el nombre del destino ya se lee en la misma fila.
class CountBadge extends StatelessWidget {
  const CountBadge({
    super.key,
    required this.count,
    this.singular = 'tarea pendiente',
    this.plural = 'tareas pendientes',
  });

  final int count;
  final String singular, plural;

  /// Tope visible del contador.
  static const max = 999;

  static const _height = 18.0;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();
    final c = context.colors;
    return Semantics(
      label: countLabel(count, singular, plural),
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: _height,
          minWidth: _height,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: c.hover,
            borderRadius: AppGeometry.chip,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxs + AppSpacing.hairline,
            ),
            // Factor 1: centra la cifra sin estirarse al ancho disponible.
            child: Center(
              widthFactor: 1,
              heightFactor: 1,
              child: Text(
                count > max ? '$max+' : '$count',
                style: AppTextStyles.technical.copyWith(
                  fontSize: 11,
                  height: 1,
                  fontWeight: FontWeight.w600,
                  color: c.muted,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
