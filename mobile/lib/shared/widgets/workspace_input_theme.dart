// Portado de genstock: frontend/lib/shared/widgets/workspace_input_theme.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';

/// Campos integrados que conservan la superficie del tema general, sin rótulo
/// flotante. Conserva los indicadores de foco, error y deshabilitado.
class WorkspaceInputTheme extends StatelessWidget {
  const WorkspaceInputTheme({
    super.key,
    required this.child,
    this.borderRadius = AppGeometry.control,
  });

  final Widget child;
  final BorderRadius borderRadius;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final inputs = theme.inputDecorationTheme;
    InputBorder? shape(InputBorder? border) => border is OutlineInputBorder
        ? border.copyWith(borderRadius: borderRadius)
        : border;
    return Theme(
      data: theme.copyWith(
        inputDecorationTheme: inputs.copyWith(
          floatingLabelBehavior: FloatingLabelBehavior.never,
          border: shape(inputs.border),
          enabledBorder: shape(inputs.enabledBorder),
          disabledBorder: shape(inputs.disabledBorder),
          focusedBorder: shape(inputs.focusedBorder),
          errorBorder: shape(inputs.errorBorder),
          focusedErrorBorder: shape(inputs.focusedErrorBorder),
        ),
      ),
      child: child,
    );
  }
}
