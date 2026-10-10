// Portado de genstock: frontend/lib/shared/widgets/workspace_selector_bar.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import 'gen_filter_chip_bar.dart';

/// Selector de contexto: chips con la densidad de los filtros y aire visible.
class WorkspaceSelectorBar extends StatelessWidget {
  const WorkspaceSelectorBar({
    super.key,
    required this.chips,
    required this.selectedId,
    required this.onSelected,
    this.trailing,
  });

  final List<GenFilterChip> chips;
  final String? selectedId;
  final ValueChanged<String> onSelected;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final height = WorkspaceMetrics.filterChipHeight(context);
    final inset =
        (kMinInteractiveDimension - height).clamp(
          0.0,
          kMinInteractiveDimension,
        ) /
        2;
    return Padding(
      padding: EdgeInsets.only(bottom: AppSpacing.md - inset),
      child: Row(
        children: [
          Expanded(
            child: GenFilterChipBar(
              controlHeight: height,
              contentPadding: EdgeInsets.zero,
              chips: chips,
              selectedId: selectedId,
              onSelected: onSelected,
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: AppSpacing.sm),
            trailing!,
          ],
        ],
      ),
    );
  }
}
