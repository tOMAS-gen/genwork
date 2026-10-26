import 'package:flutter/material.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'app_error_widget.dart';
import 'app_state_block.dart';
import 'gen_skeleton.dart';

/// Mensaje legible de cualquier error (los de la API ya vienen en castellano).
String errorMessage(Object error) => error is ApiException
    ? error.message
    : 'Ocurrió un error inesperado. Probá de nuevo.';

/// Ancho máximo del mensaje de un estado vacío.
const double _kEmptyMaxWidth = 360;

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: 'Cargando contenido',
      liveRegion: true,
      child: ExcludeSemantics(
        // Arriba, en el flujo de la página (no centrado), como los skeletons de
        // la web. Con texto grande (header alto) alcanzan dos.
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (
                  var i = 0;
                  i < (MediaQuery.textScalerOf(context).scale(13) > 16 ? 2 : 3);
                  i++
                )
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: c.surface,
                        border: Border.all(color: c.border),
                        borderRadius: AppGeometry.card,
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          FractionallySizedBox(
                            widthFactor: .7,
                            child: GenSkeleton.text(height: AppSpacing.lg),
                          ),
                          SizedBox(height: AppSpacing.md),
                          GenSkeleton.text(),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry, this.title});

  final Object error;
  final VoidCallback? onRetry;
  final String? title;

  @override
  Widget build(BuildContext context) => AppStateBlock(
    minHeight: AppBlockHeights.errorState,
    child: AppErrorWidget(
      error: error,
      onRetry: onRetry,
      title: title,
      retryKey: const ValueKey('error_retry'),
    ),
  );
}

/// Estado vacío, como `EmptyState` de la web: ícono 48 `muted`, título 16/600
/// opcional, texto `muted` y una acción opcional debajo.
class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.message,
    this.icon = AppIcons.inbox,
    this.title,
    this.actionLabel,
    this.onAction,
  });

  final String message;
  final IconData icon;
  final String? title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppStateBlock(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _kEmptyMaxWidth),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: AppIconSizes.state, color: c.muted),
              const SizedBox(height: AppSpacing.md),
              if (title != null) ...[
                Text(
                  title!,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.dialogTitle.copyWith(color: c.text),
                ),
                const SizedBox(height: AppSpacing.xs),
              ],
              Text(
                message,
                textAlign: TextAlign.center,
                style: AppTextStyles.body.copyWith(color: c.muted),
              ),
              if (actionLabel != null && onAction != null) ...[
                const SizedBox(height: AppSpacing.sm),
                FilledButton(onPressed: onAction, child: Text(actionLabel!)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Muestra un SnackBar (con el estilo del tema) con el error de una acción.
void showErrorSnack(BuildContext context, Object error) {
  ScaffoldMessenger.of(
    context,
  ).showSnackBar(errorSnackBar(context.colors, error));
}

/// El SnackBar de [showErrorSnack], para mostrarlo con un `ScaffoldMessenger`
/// guardado antes (cuando la pantalla que falló ya no está montada).
SnackBar errorSnackBar(GenColors c, Object error) => SnackBar(
  content: Row(
    children: [
      Icon(AppIcons.error, size: AppIconSizes.action, color: c.danger),
      const SizedBox(width: AppSpacing.sm),
      Expanded(child: Text(errorMessage(error))),
    ],
  ),
);
