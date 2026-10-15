// Portado de genstock: frontend/lib/shared/widgets/kpi_tile.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Tarjeta de un indicador numérico. El valor usa cifras tabulares: el ancho no
/// salta al actualizarse. Es una card —bloque apoyado en la página—: curva de
/// card y nada de sombra.
class KpiTile extends StatelessWidget {
  const KpiTile({
    super.key,
    required this.label,
    required this.value,
    this.caption,
    this.shrinkValueToFit = false,
  });

  final String label;
  final String value;
  final String? caption;

  /// Si el valor se ACHICA hasta entrar en vez de recortarse con puntos
  /// suspensivos. Apagado por defecto; un importe a medias es peor que no
  /// mostrarlo.
  final bool shrinkValueToFit;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        border: Border.all(color: c.border),
        color: c.surface,
        borderRadius: AppGeometry.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        // Altura del contenido, no del contenedor.
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
          ),
          const SizedBox(height: AppSpacing.xs),
          _KpiValue(
            value: value,
            shrinkToFit: shrinkValueToFit,
            style: AppTextStyles.screenTitle.copyWith(
              color: c.text,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (caption != null) ...[
            const SizedBox(height: AppSpacing.xxs),
            Text(
              caption!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.supporting.copyWith(color: c.muted),
            ),
          ],
        ],
      ),
    );
  }
}

/// El número grande del tile. Con `shrinkToFit` se ACHICA hasta entrar entero;
/// el alto se fija con el que tendría el texto SIN achicar (medido con un
/// [TextPainter]) para que los tiles vecinos queden alineados.
class _KpiValue extends StatelessWidget {
  const _KpiValue({
    required this.value,
    required this.style,
    required this.shrinkToFit,
  });

  final String value;
  final TextStyle style;
  final bool shrinkToFit;

  @override
  Widget build(BuildContext context) {
    if (!shrinkToFit) {
      return Text(
        value,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: style,
      );
    }

    final medidor = TextPainter(
      text: TextSpan(text: value, style: style),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
      maxLines: 1,
    )..layout();
    final alto = medidor.height;
    medidor.dispose();

    return SizedBox(
      height: alto,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(value, maxLines: 1, style: style),
      ),
    );
  }
}
