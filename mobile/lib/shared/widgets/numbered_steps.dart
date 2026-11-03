import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Lista de pasos con el número en un círculo de 20 dp (cifras mono) y el
/// texto en 13 `muted` (P01-M4, P24a-M4, P24b-M2).
class NumberedSteps extends StatelessWidget {
  const NumberedSteps({super.key, required this.steps, this.keyPrefix});

  final List<String> steps;

  /// Clave de cada círculo: `<keyPrefix>_<n>`.
  final String? keyPrefix;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : AppSpacing.sm),
            child: MergeSemantics(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    key: keyPrefix == null
                        ? null
                        : ValueKey('${keyPrefix}_${i + 1}'),
                    width: AppSpacing.ml,
                    height: AppSpacing.ml,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: c.hover,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${i + 1}',
                      style: AppTextStyles.technical.copyWith(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: c.text,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      steps[i],
                      style: AppTextStyles.body.copyWith(color: c.muted),
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
