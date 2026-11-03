import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Bloque de una página de configuración, como `.section-panel` de la web:
/// card `surface` con borde, padding 16, título 16/600, una bajada `muted`
/// opcional y el contenido debajo. Sin franja de encabezado.
class PanelSection extends StatelessWidget {
  const PanelSection({
    super.key,
    required this.title,
    required this.children,
    this.description,
  });

  final String title;
  final String? description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      // Material (no un Container pintado): las filas con ListTile dibujan su
      // tinta sobre la card.
      child: Material(
        color: c.surface,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: c.border),
          borderRadius: AppGeometry.card,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: AppTextStyles.dialogTitle.copyWith(color: c.text),
                ),
              ),
              if (description != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  description!,
                  style: AppTextStyles.body.copyWith(color: c.muted),
                ),
              ],
              if (children.isNotEmpty) const SizedBox(height: AppSpacing.sm),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

/// Valor para copiar, como `CopyField` de la web: el texto en mono sobre
/// `field` y el botón de copiar como ícono dentro del campo (P24a-M1).
class CopyField extends StatelessWidget {
  const CopyField({
    super.key,
    required this.value,
    required this.onCopy,
    this.buttonKey,
  });

  final String value;
  final VoidCallback onCopy;
  final Key? buttonKey;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      key: const ValueKey('copy_field'),
      padding: const EdgeInsets.only(left: AppSpacing.sm),
      decoration: BoxDecoration(
        color: c.field,
        border: Border.all(color: c.outline),
        borderRadius: AppGeometry.control,
      ),
      child: Row(
        children: [
          Expanded(
            child: SelectableText(
              value,
              style: AppTextStyles.technical.copyWith(color: c.text),
            ),
          ),
          IconButton(
            key: buttonKey,
            tooltip: 'Copiar',
            onPressed: onCopy,
            icon: Icon(
              AppIcons.copy,
              size: AppIconSizes.action,
              color: c.muted,
            ),
          ),
        ],
      ),
    );
  }
}
