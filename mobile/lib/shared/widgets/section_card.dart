// Portado de genstock: frontend/lib/shared/widgets/sector_card.dart
// (renombrado: en genwork "sector" es un concepto de dominio).
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Card de sección con borde y header, para agrupar los campos de un
/// formulario grande sin anidar otro `Scaffold`/`Dialog`. Es una card: curva
/// [AppGeometry.card], superficie `surface` y sin sombra.
///
/// Cuando [enabled] es `false`, el contenido colapsa con una animación de
/// 200 ms (secciones opcionales con un interruptor en [leading]).
///
/// La cabecera comparte el mínimo de los controles más aire y crece con el
/// texto. Título y acciones pasan a otra línea si no caben.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.title,
    required this.child,
    this.leading,
    this.trailing,
    this.enabled = true,
  });

  final String title;
  final Widget child;

  /// Control que ENCIENDE la sección, antes del título.
  final Widget? leading;

  /// Lo que se hace DESPUÉS de leer la sección, al final del renglón.
  final Widget? trailing;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.border),
        borderRadius: AppGeometry.card,
      ),
      // El header va a fondo completo: sin recorte, su relleno asomaría en
      // escuadra por las esquinas curvas de arriba.
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            constraints: BoxConstraints(
              minHeight:
                  WorkspaceMetrics.controlHeight(context) + AppSpacing.xxs * 2,
            ),
            alignment: AlignmentDirectional.centerStart,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xxs,
            ),
            decoration: BoxDecoration(
              color: c.field,
              border: enabled
                  ? Border(bottom: BorderSide(color: c.border))
                  : null,
            ),
            child: SizedBox(
              width: double.infinity,
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.xs,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (leading != null) ...[
                        leading!,
                        const SizedBox(width: AppSpacing.sm),
                      ],
                      Flexible(
                        child: Text(
                          title.toUpperCase(),
                          style: AppTextStyles.sectionLabel.copyWith(
                            color: c.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                  ?trailing,
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            child: enabled
                ? Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: child,
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}
