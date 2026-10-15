import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';

/// Placeholder de carga: shimmer `hover` → `border` → `hover` de 1.4 s. Con
/// `MediaQuery.disableAnimations` queda estático en `hover`.
class GenSkeleton extends StatefulWidget {
  /// Línea de texto. Sin [width] ocupa todo el ancho disponible.
  const GenSkeleton.text({super.key, this.width, this.height = AppSpacing.sm})
    : _radius = AppGeometry.chip,
      _circle = false;

  /// Bloque con la curva de card, a todo el ancho.
  const GenSkeleton.card({super.key, this.height = AppSpacing.xxxl})
    : width = null,
      _radius = AppGeometry.card,
      _circle = false;

  /// Círculo de lado [size] (avatar, ícono).
  const GenSkeleton.circle({super.key, double size = AppSpacing.xxl})
    : width = size,
      height = size,
      _radius = AppGeometry.pill,
      _circle = true;

  final double? width;
  final double height;
  final BorderRadius _radius;
  final bool _circle;

  /// Duración de un ciclo completo.
  static const period = Duration(milliseconds: 1400);

  @override
  State<GenSkeleton> createState() => _GenSkeletonState();
}

class _GenSkeletonState extends State<GenSkeleton>
    with SingleTickerProviderStateMixin {
  AnimationController? _controller;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final animate = !MediaQuery.disableAnimationsOf(context);
    if (animate && _controller == null) {
      _controller = AnimationController(
        vsync: this,
        duration: GenSkeleton.period,
      )..repeat();
    } else if (!animate && _controller != null) {
      _controller!.dispose();
      _controller = null;
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final controller = _controller;
    Widget box(Color color) => Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: color,
        shape: widget._circle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: widget._circle ? null : widget._radius,
      ),
    );
    if (controller == null) return box(c.hover);
    final tween = TweenSequence<Color?>([
      TweenSequenceItem(
        tween: ColorTween(begin: c.hover, end: c.border),
        weight: 1,
      ),
      TweenSequenceItem(
        tween: ColorTween(begin: c.border, end: c.hover),
        weight: 1,
      ),
    ]);
    return AnimatedBuilder(
      animation: controller,
      builder: (_, _) => box(tween.evaluate(controller)!),
    );
  }
}
