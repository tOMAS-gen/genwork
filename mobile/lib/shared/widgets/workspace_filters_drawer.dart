// Portado de genstock: frontend/lib/shared/widgets/workspace_filters_drawer.dart
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';
import 'app_work_header.dart';

/// Ancho base del panel de filtros; crece con el tamaño de texto.
const double _kFiltersPanelWidth = 320;

/// Panel lateral derecho de filtros: recto, unido al borde de la ventana, con
/// borde y sombra de flotante.
Future<void> showWorkspaceFiltersDrawer(
  BuildContext context, {
  required WidgetBuilder builder,
}) {
  final colors = context.colors;
  final width = math.min(
    MediaQuery.sizeOf(context).width - AppSpacing.lg,
    _kFiltersPanelWidth *
        math.max(1.0, MediaQuery.textScalerOf(context).scale(13) / 13),
  );
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Cerrar filtros',
    barrierColor: Theme.of(context).colorScheme.scrim.withValues(alpha: 0.4),
    transitionDuration: MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 220),
    pageBuilder: (context, animation, secondaryAnimation) => Align(
      alignment: Alignment.centerRight,
      child: Container(
        foregroundDecoration: BoxDecoration(
          border: Border(left: BorderSide(color: colors.border)),
        ),
        decoration: BoxDecoration(boxShadow: AppShadows.floatingOf(context)),
        child: Material(
          color: colors.floating,
          shape: const RoundedRectangleBorder(),
          clipBehavior: Clip.antiAlias,
          child: SizedBox(
            width: width,
            height: double.infinity,
            child: SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  bottom: MediaQuery.viewInsetsOf(context).bottom,
                ),
                child: builder(context),
              ),
            ),
          ),
        ),
      ),
    ),
    transitionBuilder: (context, animation, secondaryAnimation, child) =>
        SlideTransition(
          position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
              .animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
              ),
          child: child,
        ),
  );
}

/// Cabecera y pie fijos; el contenido del borrador tiene scroll propio.
class WorkspaceFiltersPanel extends StatelessWidget {
  const WorkspaceFiltersPanel({
    super.key,
    required this.child,
    required this.onApply,
    required this.onClear,
  });
  final Widget child;
  final VoidCallback onApply;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppWorkHeader(
          title: 'Filtros',
          onClose: () => Navigator.of(context).pop(),
        ),
        Divider(height: 1, thickness: 1, color: c.border),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: child,
          ),
        ),
        Divider(height: 1, thickness: 1, color: c.border),
        ColoredBox(
          color: c.field,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      onClear();
                      Navigator.of(context).pop();
                    },
                    child: const Text('Limpiar'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      onApply();
                      Navigator.of(context).pop();
                    },
                    child: const Text('Aplicar'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
