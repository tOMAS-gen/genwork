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
/// [breadcrumb] va arriba del título, en las subpantallas (PS13). [bottom] es
/// un área opcional (tabs, filtros) debajo.
class GenSectionHeader extends StatelessWidget {
  const GenSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.count,
    this.titleVisible = true,
    this.breadcrumb,
    this.showBackButton = false,
    this.actions = const [],
    this.bottom,
  });

  final String title;
  final String? subtitle;

  /// Cantidad junto al título, en gris y cifras mono («Vence hoy  0»).
  final int? count;

  /// En falso no se dibuja el título: bajo las pestañas de Configuración la
  /// pestaña activa ya lo dice (P23-M2, P24a-M3). El subtítulo queda.
  final bool titleVisible;
  final Widget? breadcrumb;
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
              ?breadcrumb,
              if (titleVisible)
                Semantics(
                  header: true,
                  child: Text.rich(
                    TextSpan(
                      text: title,
                      children: [
                        if (count != null)
                          TextSpan(
                            text: '  $count',
                            style: AppTextStyles.technical.copyWith(
                              fontSize: AppTextStyles.screenTitle.fontSize,
                              fontWeight: FontWeight.w500,
                              color: c.muted,
                            ),
                          ),
                      ],
                    ),
                    style: AppTextStyles.screenTitle.copyWith(color: c.text),
                  ),
                ),
              if (subtitle != null)
                Padding(
                  padding: EdgeInsets.only(
                    top: titleVisible ? AppSpacing.xxs : 0,
                  ),
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
