// Portado de genstock: frontend/lib/shared/widgets/gen_tab_section.dart
// (solo el encabezado `GenSectionHeader`, aplanado al estilo de genwork web).
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Encabezado de página: caja de ícono (38, `brandFill`), título 24/700,
/// subtítulo 13 `muted` y acciones a la derecha, con un borde inferior de 1 px
/// `border`. Es plano: no es una card, apoya sobre el fondo de la página.
///
/// Las acciones comparten renglón con el título si caben; si no, pasan a la
/// línea de abajo. [bottom] es un área opcional (tabs, filtros) bajo el borde.
class GenSectionHeader extends StatelessWidget {
  const GenSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.showBackButton = false,
    this.actions = const [],
    this.bottom,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final bool showBackButton;
  final List<Widget> actions;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final titleStyle = AppTextStyles.screenTitle.copyWith(color: c.text);
    final double leadingWidth =
        (showBackButton ? kMinInteractiveDimension : 0) +
        (icon == null ? 0 : WorkspaceMetrics.headerIconExtent + AppSpacing.sm);

    final titleRow = Row(
      children: [
        if (showBackButton) const BackButton(),
        if (icon != null) ...[
          Container(
            width: WorkspaceMetrics.headerIconExtent,
            height: WorkspaceMetrics.headerIconExtent,
            decoration: BoxDecoration(
              color: c.brandFill,
              borderRadius: AppGeometry.control,
            ),
            child: Icon(
              icon,
              size: WorkspaceMetrics.headerIconSize,
              color: c.brand,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
        Expanded(
          child: Semantics(header: true, child: Text(title, style: titleStyle)),
        ),
      ],
    );

    final head = LayoutBuilder(
      builder: (context, constraints) {
        if (actions.isEmpty) return titleRow;
        final titlePainter = TextPainter(
          text: TextSpan(text: title, style: titleStyle),
          textDirection: Directionality.of(context),
          textScaler: MediaQuery.textScalerOf(context),
        )..layout();
        final titleWidth = titlePainter.width + leadingWidth;
        titlePainter.dispose();
        return Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.xs,
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            SizedBox(
              width: titleWidth.clamp(0.0, constraints.maxWidth),
              child: titleRow,
            ),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              alignment: WrapAlignment.end,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: actions,
            ),
          ],
        );
      },
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                head,
                if (subtitle != null)
                  Padding(
                    padding: EdgeInsetsDirectional.only(
                      top: AppSpacing.xxs,
                      start: leadingWidth,
                    ),
                    child: Text(
                      subtitle!,
                      style: AppTextStyles.body.copyWith(color: c.muted),
                    ),
                  ),
              ],
            ),
          ),
          ?bottom,
        ],
      ),
    );
  }
}
