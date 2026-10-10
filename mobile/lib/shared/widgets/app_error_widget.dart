// Portado de genstock: frontend/lib/shared/widgets/app_error_widget.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'state_views.dart';

class AppErrorWidget extends StatelessWidget {
  const AppErrorWidget({
    super.key,
    required this.error,
    this.onRetry,
    this.retryKey,
  });

  final Object error;
  final VoidCallback? onRetry;

  /// Key del botón "Reintentar".
  final Key? retryKey;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(AppIcons.error, size: AppIconSizes.state, color: c.danger),
            const SizedBox(height: AppSpacing.md),
            Semantics(
              liveRegion: true,
              child: Text(
                errorMessage(error),
                textAlign: TextAlign.center,
                style: AppTextStyles.body.copyWith(color: c.muted),
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.lg),
              FilledButton.icon(
                key: retryKey,
                onPressed: onRetry,
                icon: const Icon(AppIcons.retry),
                label: const Text('Reintentar'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
