// Portado de genstock: frontend/lib/shared/widgets/adaptive_modal.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';
import 'app_work_header.dart';

/// Muestra [builder] en una ventana que FLOTA sobre la página, centrada y
/// acotada por [maxWidth] × [maxHeight]. Superficie `floating`, curva de
/// [AppGeometry.overlay] y borde fino. Nada entra desde el borde inferior.
///
/// Para contenido grande con scroll y footer propio; los formularios chicos de
/// una columna usan [AppWorkDialog].
Future<T?> showAdaptiveModal<T>({
  required BuildContext context,
  required String title,
  required WidgetBuilder builder,
  bool barrierDismissible = true,
  double maxWidth = AppGeometry.dialogWide,
  double maxHeight = 680.0,
  double minWidth = 0.0,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    builder: (ctx) => _AdaptiveModalDialog(
      title: title,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      minWidth: minWidth,
      child: builder(ctx),
    ),
  );
}

class _AdaptiveModalDialog extends StatelessWidget {
  const _AdaptiveModalDialog({
    required this.title,
    required this.child,
    required this.maxWidth,
    required this.maxHeight,
    this.minWidth = 0.0,
  });

  final String title;
  final Widget child;
  final double maxWidth;
  final double maxHeight;
  final double minWidth;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Dialog(
      backgroundColor: c.floating,
      shape: RoundedRectangleBorder(
        borderRadius: AppGeometry.overlay,
        side: BorderSide(color: c.border),
      ),
      clipBehavior: Clip.antiAlias,
      insetPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.lg,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(minWidth: minWidth, maxWidth: maxWidth),
        child: SizedBox(
          width: maxWidth,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppWorkHeader(
                title: title,
                onClose: () => Navigator.of(context).pop(),
              ),
              Divider(height: 1, thickness: 1, color: c.border),
              Flexible(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: maxHeight),
                  child: child,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
