import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

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
  Widget build(BuildContext context) => Padding(
    padding: AppSpace.page,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (icon != null) ...[
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: AppSpace.md),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              const SizedBox(height: AppSpace.xs),
              Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ],
    ),
  );
}

class BrandHeader extends StatelessWidget {
  const BrandHeader({super.key, required this.title, required this.subtitle});
  final String title, subtitle;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          ClipRRect(
            borderRadius: AppTokens.of(context).cardRadius,
            child: Image.asset(
              'assets/brand/genwork.png',
              width: AppSpace.touch,
              height: AppSpace.touch,
              excludeFromSemantics: true,
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Text('genwork', style: Theme.of(context).textTheme.titleLarge),
        ],
      ),
      const SizedBox(height: AppSpace.xxl),
      Semantics(
        header: true,
        child: Text(title, style: Theme.of(context).textTheme.headlineMedium),
      ),
      const SizedBox(height: AppSpace.md),
      Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
    ],
  );
}
