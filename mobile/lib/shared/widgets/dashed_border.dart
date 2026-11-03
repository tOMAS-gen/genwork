import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';

/// Borde punteado de 1 px, como `border: 1px dashed` de la web (selector de
/// fecha del proyecto, "Sin tareas generales.", "Nueva clave").
class DashedBorder extends StatelessWidget {
  const DashedBorder({
    super.key,
    required this.color,
    required this.child,
    this.radius = AppGeometry.control,
  });

  final Color color;
  final BorderRadius radius;
  final Widget child;

  @override
  Widget build(BuildContext context) => CustomPaint(
    foregroundPainter: _DashedPainter(color: color, radius: radius),
    child: child,
  );
}

class _DashedPainter extends CustomPainter {
  _DashedPainter({required this.color, required this.radius});

  final Color color;
  final BorderRadius radius;

  static const _dash = AppSpacing.xxs;
  static const _gap = AppSpacing.xxs - 1;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final rect = (Offset.zero & size).deflate(0.5);
    final path = Path()..addRRect(radius.toRRect(rect));
    for (final ui.PathMetric metric in path.computeMetrics()) {
      for (double d = 0; d < metric.length; d += _dash + _gap) {
        canvas.drawPath(metric.extractPath(d, d + _dash), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedPainter old) =>
      old.color != color || old.radius != radius;
}
