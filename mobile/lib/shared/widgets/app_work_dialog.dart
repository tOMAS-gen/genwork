// Portado de genstock: frontend/lib/shared/widgets/app_work_dialog.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';
import 'app_work_header.dart';

/// Una superficie flotante con cabecera, cuerpo y pie continuos, como
/// `dialog.dialog` de la web: sin franjas ni divisores, todo sobre `floating`.
/// El contenido se desplaza; las acciones permanecen al pie. Siempre es una
/// ventana centrada: en genwork móvil nada entra desde el borde inferior.
class AppWorkDialog extends StatelessWidget {
  const AppWorkDialog({
    super.key,
    required this.title,
    this.icon,
    required this.child,
    required this.actions,
    this.subtitle,
    this.onClose,
    this.closeEnabled = true,
    this.maxWidth = AppGeometry.dialogNarrow,
  });

  final String title;
  final IconData? icon;
  final String? subtitle;
  final Widget child;
  final List<Widget> actions;
  final VoidCallback? onClose;
  final bool closeEnabled;
  final double maxWidth;

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
      child: SizedBox(
        width: maxWidth,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppWorkHeader(
              title: title,
              icon: icon,
              subtitle: subtitle,
              onClose: closeEnabled
                  ? onClose ?? () => Navigator.of(context).pop()
                  : null,
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.xs,
                ),
                child: child,
              ),
            ),
            if (actions.isNotEmpty) AppWorkFooter(actions: actions),
          ],
        ),
      ),
    );
  }
}

/// Pie de una ventana de trabajo, como `.dialog-actions`: acciones a la
/// derecha con 8 de separación, sin franja. Los `TextButton` (Cancelar) van
/// como texto gris 13/600 sin borde: la principal es el único botón con forma
/// (P06-M4). [leading] queda a la izquierda —el lugar de la acción destructiva
/// en un detalle—, lejos de la principal.
class AppWorkFooter extends StatelessWidget {
  const AppWorkFooter({super.key, required this.actions, this.leading});

  final List<Widget> actions;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bar = OverflowBar(
      alignment: MainAxisAlignment.end,
      overflowAlignment: OverflowBarAlignment.end,
      spacing: AppSpacing.xs,
      overflowSpacing: AppSpacing.xs,
      children: actions,
    );
    // Gana sobre el del tema; lo demás (tipografía, tamaño mínimo) sale del
    // tema.
    final secondary = TextButton.styleFrom(
      foregroundColor: c.muted,
      shape: const RoundedRectangleBorder(borderRadius: AppGeometry.control),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
    ).merge(Theme.of(context).textButtonTheme.style);
    return TextButtonTheme(
      data: TextButtonThemeData(style: secondary),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.xs,
          AppSpacing.md,
          AppSpacing.md,
        ),
        child: leading == null
            ? bar
            : Row(
                children: [
                  leading!,
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(child: bar),
                ],
              ),
      ),
    );
  }
}
