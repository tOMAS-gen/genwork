// Portado de genstock: frontend/lib/shared/widgets/picker_dialog.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';
import 'app_work_header.dart';

/// Un menú de elección, como VENTANA centrada. El chrome sigue a
/// [AppWorkDialog]: mismo header de 48, superficie `floating`, curva
/// [AppGeometry.overlay] y borde fino.
///
/// El cuerpo va en un [Flexible]: una lista larga scrollea adentro en vez de
/// estirar la ventana, así que los contenidos con muchos ítems traen su propio
/// scroll (`ListView(shrinkWrap: true)`).
Future<T?> showPickerDialog<T>(
  BuildContext context, {
  required String title,
  required WidgetBuilder builder,
  double maxWidth = 360,
  double maxHeight = 460,
  bool barrierDismissible = true,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    builder: (ctx) {
      final c = ctx.colors;
      return Dialog(
        // `Dialog` suma `viewInsets` a este padding: el teclado empuja la
        // ventana en vez de taparla.
        insetPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.lg,
        ),
        backgroundColor: c.floating,
        elevation: AppGeometry.elevation,
        shape: RoundedRectangleBorder(
          borderRadius: AppGeometry.overlay,
          side: BorderSide(color: c.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth, maxHeight: maxHeight),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppWorkHeader(
                title: title,
                onClose: () => Navigator.of(ctx).pop(),
              ),
              Divider(height: 1, thickness: 1, color: c.border),
              Flexible(child: builder(ctx)),
            ],
          ),
        ),
      );
    },
  );
}
