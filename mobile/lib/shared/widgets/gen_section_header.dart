// Portado de genstock: frontend/lib/shared/widgets/gen_tab_section.dart
// (solo el encabezado `GenSectionHeader`, aplanado al estilo de genwork web).
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';

/// Encabezado compacto de página (D1, PS3 de la auditoría premium): título
/// 20/700 con el subtítulo 13 `muted` debajo y las acciones a la derecha en el
/// mismo renglón que el título. Sin caja de ícono ni regla: el contenido
/// empieza antes. Es plano: no es una card, apoya sobre el fondo de la página.
///
/// [bottom] es un área opcional (tabs, filtros) bajo el borde.
class GenSectionHeader extends StatelessWidget {
  const GenSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.showBackButton = false,
    this.actions = const [],
    this.bottom,
  });

  final String title;
  final String? subtitle;
  final bool showBackButton;
  final List<Widget> actions;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final heading = Row(
      children: [
        if (showBackButton) const BackButton(),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: AppTextStyles.screenTitle.copyWith(color: c.text),
                ),
              ),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.xxs),
                  child: Text(
                    subtitle!,
                    style: AppTextStyles.body.copyWith(color: c.muted),
                  ),
                ),
            ],
          ),
        ),
      ],
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          // Margen de página: la misma línea de 16 dp que el contenido (PS2).
          padding: const EdgeInsets.fromLTRB(
            AppSpace.gutter,
            AppSpacing.md,
            AppSpace.gutter,
            0,
          ),
          child: LayoutBuilder(
            builder: (context, constraints) => Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: heading),
                if (actions.isNotEmpty) ...[
                  const SizedBox(width: AppSpacing.sm),
                  // El título conserva al menos 160 px; si las acciones no
                  // entran en el resto, pasan a otra línea entre ellas.
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: math.max(0, constraints.maxWidth - 160),
                    ),
                    child: Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      alignment: WrapAlignment.end,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: actions,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        ?bottom,
      ],
    );
  }
}
