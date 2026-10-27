import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Campo con el rótulo arriba, la única receta de campo de la app (PS10):
/// rótulo 12/600 `muted`, 6 de separación y el control debajo. Reemplaza al
/// rótulo flotante de Material (`labelText`).
///
/// TalkBack lee el rótulo como nombre del campo (T1): se fusiona con el nodo
/// del control y el texto visual no suma una parada aparte.
class LabeledField extends StatelessWidget {
  const LabeledField({super.key, required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    mainAxisSize: MainAxisSize.min,
    children: [
      ExcludeSemantics(
        child: Text(
          label,
          style: AppTextStyles.supporting.copyWith(
            fontWeight: FontWeight.w600,
            color: context.colors.muted,
          ),
        ),
      ),
      const SizedBox(height: AppSpacing.xxs + AppSpacing.hairline),
      MergeSemantics(
        child: Semantics(label: label, child: child),
      ),
    ],
  );
}

/// Contador de caracteres como `CharLimit` de la web: "12 / 2.000", 12
/// `muted`, alineado a la derecha.
Widget? webCharCounter(
  BuildContext context, {
  required int currentLength,
  required int? maxLength,
  required bool isFocused,
}) {
  if (maxLength == null) return null;
  final format = NumberFormat.decimalPattern('es');
  // El decorador deja el relleno del campo a la derecha del contador; se
  // corre para quedar alineado con el borde (P06-M3).
  return Transform.translate(
    offset: const Offset(AppSpacing.md, 0),
    child: Text(
      '${format.format(currentLength)} / ${format.format(maxLength)}',
      // Cifras tabulares sin mono: el espacio mono separaba de más.
      style: AppTextStyles.supporting.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: context.colors.muted,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
    ),
  );
}

/// Sin contador visible, aunque el campo tenga tope (la web no lo muestra).
Widget? noCharCounter(
  BuildContext context, {
  required int currentLength,
  required int? maxLength,
  required bool isFocused,
}) => null;
