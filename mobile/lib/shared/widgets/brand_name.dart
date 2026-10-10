// Portado de genstock: frontend/lib/shared/widgets/brand_name.dart
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/gen_colors.dart';

/// Logo de texto «›gen»+«work»: «›gen» en 600 `brand`, «work» en 400 `text`.
///
/// [size] es el cuerpo de la tipografía Montserrat de ambas partes.
class BrandName extends StatelessWidget {
  const BrandName({super.key, this.size = 18, this.scaleDownToFit = false});

  final double size;

  /// Reduce toda la marca para respetar el ancho que le asigne su padre. El
  /// escalado entra en el layout del [RichText], así que el chevron inicial no
  /// puede pintarse fuera de su caja.
  final bool scaleDownToFit;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final text = TextSpan(
      children: [
        TextSpan(
          text: '›gen',
          style: TextStyle(
            fontFamily: 'Montserrat',
            fontSize: size,
            fontWeight: FontWeight.w600,
            letterSpacing: 0,
            color: c.brand,
          ),
        ),
        TextSpan(
          text: 'work',
          style: TextStyle(
            fontFamily: 'Montserrat',
            fontSize: size,
            fontWeight: FontWeight.w400,
            letterSpacing: 0,
            color: c.text,
          ),
        ),
      ],
    );

    if (!scaleDownToFit) {
      return RichText(maxLines: 1, overflow: TextOverflow.ellipsis, text: text);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final availableWidth = constraints.maxWidth;
        final textPainter = TextPainter(
          text: text,
          textDirection: Directionality.of(context),
          textScaler: TextScaler.noScaling,
        )..layout();
        final scale =
            availableWidth.isFinite && textPainter.width > availableWidth
            ? math.max(0.0, availableWidth / textPainter.width).toDouble()
            : 1.0;
        textPainter.dispose();

        return RichText(
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          text: text,
          textScaler: TextScaler.linear(scale),
        );
      },
    );
  }
}
