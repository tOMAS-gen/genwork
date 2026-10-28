import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Alto visible del segmentado (P32-M1).
const double _height = 36;

/// Segmentado de texto: marco `outline` de 36 dp con radio 6, la opción
/// activa sobre el acento al 12 % con texto de acento 13/600 y sin check
/// (P32-M1). Cada opción responde en 48 dp de alto.
class AppSegmented<T> extends StatelessWidget {
  const AppSegmented({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
    this.keyPrefix,
  });

  final Map<T, String> options;
  final T selected;
  final ValueChanged<T> onChanged;

  /// Clave de cada opción: `<keyPrefix>_<valor>`.
  final String? keyPrefix;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      height: kMinInteractiveDimension,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            height: _height,
            decoration: BoxDecoration(
              border: Border.all(color: c.outline),
              borderRadius: AppGeometry.control,
            ),
          ),
          Row(
            children: [
              for (final entry in options.entries)
                Expanded(
                  child: Semantics(
                    button: true,
                    selected: entry.key == selected,
                    label: entry.value,
                    excludeSemantics: true,
                    child: InkWell(
                      key: keyPrefix == null
                          ? null
                          : ValueKey('${keyPrefix}_${entry.key}'),
                      onTap: () => onChanged(entry.key),
                      child: SizedBox(
                        height: kMinInteractiveDimension,
                        child: Center(
                          child: Container(
                            height: _height - 4,
                            margin: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.hairline,
                            ),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: entry.key == selected
                                  ? c.brand.withValues(alpha: .12)
                                  : null,
                              borderRadius: AppGeometry.control,
                            ),
                            child: Text(
                              entry.value,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTextStyles.action.copyWith(
                                color: entry.key == selected
                                    ? c.brand
                                    : c.muted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
