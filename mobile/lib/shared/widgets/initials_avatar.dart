import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Iniciales del nombre (máx. 2 letras), como `getInitials` de la web.
String initialsOf(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
  final letters = parts.take(2).map((p) => p[0].toUpperCase()).join();
  return letters.isEmpty ? '?' : letters;
}

/// Avatar de iniciales de 32 dp para filas de personas (P14-M4, P26u-M3):
/// neutro, sobre `hover`. Decorativo: el nombre se lee al lado.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({super.key, required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ExcludeSemantics(
      child: CircleAvatar(
        radius: AppSpacing.md,
        backgroundColor: c.hover,
        foregroundColor: c.muted,
        child: Text(
          initialsOf(name),
          style: AppTextStyles.supporting.copyWith(
            fontWeight: FontWeight.w600,
            color: c.muted,
          ),
        ),
      ),
    );
  }
}
