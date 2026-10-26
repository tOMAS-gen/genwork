import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Campo con el rótulo arriba, como `.dialog-field` de la web: rótulo 13/500
/// `muted`, 6 de separación y el control debajo. Reemplaza al rótulo flotante
/// de Material (`labelText`).
class LabeledField extends StatelessWidget {
  const LabeledField({super.key, required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        label,
        style: AppTextStyles.body.copyWith(
          fontWeight: FontWeight.w500,
          color: context.colors.muted,
        ),
      ),
      const SizedBox(height: AppSpacing.xxs + AppSpacing.hairline),
      child,
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
  return Text(
    '${format.format(currentLength)} / ${format.format(maxLength)}',
    style: AppTextStyles.supporting.copyWith(color: context.colors.muted),
  );
}

/// Sin contador visible, aunque el campo tenga tope (la web no lo muestra).
Widget? noCharCounter(
  BuildContext context, {
  required int currentLength,
  required int? maxLength,
  required bool isFocused,
}) => null;
