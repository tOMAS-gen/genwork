import 'package:flutter/material.dart';

import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Mensaje de error inline: texto 12/400 en `danger`.
class ErrorText extends StatelessWidget {
  const ErrorText(this.message, {super.key, this.textAlign});

  final String message;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) => Text(
    message,
    textAlign: textAlign,
    style: AppTextStyles.supporting.copyWith(color: context.colors.danger),
  );
}
