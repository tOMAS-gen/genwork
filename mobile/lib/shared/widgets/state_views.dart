import 'package:flutter/material.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_theme.dart';

/// Mensaje legible de cualquier error (los de la API ya vienen en castellano).
String errorMessage(Object error) => error is ApiException
    ? error.message
    : 'Ocurrió un error inesperado. Probá de nuevo.';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Cargando contenido',
    liveRegion: true,
    child: ExcludeSemantics(
      child: Padding(
        padding: AppSpace.page,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.md),
                child: Container(
                  padding: AppSpace.page,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: AppTokens.of(context).cardRadius,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      FractionallySizedBox(
                        widthFactor: .7,
                        child: Container(
                          height: AppSpace.lg,
                          color: AppTokens.of(context).field,
                        ),
                      ),
                      const SizedBox(height: AppSpace.md),
                      Container(
                        height: AppSpace.md,
                        color: AppTokens.of(context).field,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.wifi_off_outlined,
              size: AppSpace.touch,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: AppSpace.md),
            Semantics(
              liveRegion: true,
              child: Text(errorMessage(error), textAlign: TextAlign.center),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpace.md),
              OutlinedButton(
                key: const ValueKey('error_retry'),
                onPressed: onRetry,
                child: const Text('Reintentar'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: AppSpace.page,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: AppTokens.of(context).overlayRadius,
              ),
              child: Icon(
                icon,
                size: AppSpace.xxl,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
            const SizedBox(height: AppSpace.md),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

/// Muestra un SnackBar con el error de una acción.
void showErrorSnack(BuildContext context, Object error) {
  ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(errorMessage(error))));
}
