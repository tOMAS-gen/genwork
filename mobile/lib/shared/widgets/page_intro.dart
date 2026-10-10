import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import 'brand_name.dart';
import 'gen_section_header.dart';

/// Encabezado de pantalla: título, subtítulo e ícono opcional, con el estilo
/// de [GenSectionHeader].
class PageIntro extends StatelessWidget {
  const PageIntro({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon,
  });
  final String title, subtitle;
  final IconData? icon;
  @override
  Widget build(BuildContext context) =>
      GenSectionHeader(title: title, subtitle: subtitle, icon: icon);
}

class BrandHeader extends StatelessWidget {
  const BrandHeader({super.key, required this.title, required this.subtitle});
  final String title, subtitle;
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            ClipRRect(
              borderRadius: AppGeometry.card,
              child: Image.asset(
                'assets/brand/genwork.png',
                width: AppSpace.touch,
                height: AppSpace.touch,
                excludeFromSemantics: true,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            const BrandName(size: 22),
          ],
        ),
        const SizedBox(height: AppSpacing.xxl),
        Semantics(
          header: true,
          child: Text(title, style: Theme.of(context).textTheme.headlineMedium),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(subtitle, style: AppTextStyles.body.copyWith(color: c.muted)),
      ],
    );
  }
}
