import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Un indicador de [StatCards].
typedef StatItem = ({String label, String value});

/// Alto mínimo de la franja (P05-M1).
const double _stripHeight = 72;

/// Relleno lateral de cada columna.
const double _columnInset = AppSpacing.xxs + AppSpacing.hairline;

/// Franja de KPI (P05-M1, P35-M4): una sola card con los valores en columnas
/// separadas por divisores verticales, la cifra en Mono 20/700 y el rótulo en
/// 11/600 gris. Sin porcentaje: repetía lo que dicen las cifras. Quien la usa
/// la oculta si no hay datos (P08-M1).
///
/// El rótulo va en caja normal y sin tracking: en mayúsculas, "COMPLETADOS"
/// mide 97 dp y la columna de un teléfono de 390 deja unos 76.
class StatCards extends StatelessWidget {
  const StatCards({super.key, required this.items});

  final List<StatItem> items;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return LayoutBuilder(
      builder: (context, constraints) {
        final labelStyle = _labelStyle(
          context,
          // Ancho de columna menos bordes, divisores y relleno.
          (constraints.maxWidth - 2 - (items.length - 1)) / items.length -
              2 * _columnInset,
        );
        return Container(
          key: const ValueKey('stat_strip'),
          constraints: const BoxConstraints(minHeight: _stripHeight),
          decoration: BoxDecoration(
            color: c.surface,
            border: Border.all(color: c.border),
            borderRadius: AppGeometry.card,
          ),
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < items.length; i++) ...[
                  if (i > 0)
                    VerticalDivider(width: 1, thickness: 1, color: c.border),
                  Expanded(
                    child: StatCard(item: items[i], labelStyle: labelStyle),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  /// Rótulo en una línea. Si el más largo no entra en su columna (teléfono
  /// angosto o texto ampliado), todos se achican igual, para que la franja no
  /// mezcle tamaños.
  TextStyle _labelStyle(BuildContext context, double width) {
    final base = _label(context);
    var widest = 0.0;
    for (final item in items) {
      final painter = TextPainter(
        text: TextSpan(text: item.label, style: base),
        textDirection: Directionality.of(context),
        textScaler: MediaQuery.textScalerOf(context),
        maxLines: 1,
      )..layout();
      if (painter.width > widest) widest = painter.width;
      painter.dispose();
    }
    if (widest <= width || width <= 0) return base;
    return base.copyWith(fontSize: base.fontSize! * width / widest);
  }
}

TextStyle _label(BuildContext context) => AppTextStyles.sectionLabel.copyWith(
  fontWeight: FontWeight.w600,
  letterSpacing: 0,
  color: context.colors.muted,
);

/// Una columna de [StatCards]: la cifra y su rótulo, leídos juntos.
class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.item, this.labelStyle});

  final StatItem item;

  /// El de la franja; por defecto, 11/600 gris.
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return MergeSemantics(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: _columnInset),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.value,
              key: const ValueKey('stat_value'),
              maxLines: 1,
              style: AppTextStyles.technical.copyWith(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: c.text,
              ),
            ),
            const SizedBox(height: AppSpacing.hairline),
            Text(
              item.label,
              maxLines: 1,
              softWrap: false,
              style: labelStyle ?? _label(context),
            ),
          ],
        ),
      ),
    );
  }
}
