import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Un indicador de [StatCards].
typedef StatItem = ({String label, int value, int pct});

/// Barra de estadísticas, como `.stats-bar` de la web: una [StatCard] por
/// indicador, en 2 columnas en el teléfono (`max-width: 480px`) y en una fila
/// cuando hay lugar, con 12 de separación.
class StatCards extends StatelessWidget {
  const StatCards({super.key, required this.items});

  final List<StatItem> items;

  /// Ancho desde el que la web deja de usar la grilla de 2 columnas.
  static const _rowBreakpoint = 480.0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth > _rowBreakpoint
            ? items.length
            : 2;
        final width =
            (constraints.maxWidth - AppSpacing.sm * (columns - 1)) / columns;
        return Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            for (final item in items)
              SizedBox(width: width, child: StatCard(item: item)),
          ],
        );
      },
    );
  }
}

/// Tarjeta de una estadística (`.stat-card`): la cifra en Mono 700 y debajo
/// «rótulo · %» en Mono `muted`. Los tamaños son los de Android, más chicos que
/// los de la web (regla de la spec 066).
class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.item});

  final StatItem item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.border),
        borderRadius: AppGeometry.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${item.value}',
            style: AppTextStyles.technical.copyWith(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: c.text,
            ),
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            '${item.label} · ${item.pct}%',
            style: AppTextStyles.technical.copyWith(
              fontSize: 11,
              color: c.muted,
            ),
          ),
        ],
      ),
    );
  }
}
