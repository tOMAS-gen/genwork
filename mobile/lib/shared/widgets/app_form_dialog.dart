// Portado de genstock: frontend/lib/shared/widgets/app_form_dialog.dart
import 'package:flutter/material.dart';

import 'app_work_dialog.dart';

/// Abre un formulario como ventana centrada. El widget que devuelve [builder]
/// conserva su propio estado y aporta cabecera, cuerpo y acciones mediante
/// [AppFormDialog] o [AppWorkDialog]; `Dialog` ya se corre por encima del
/// teclado.
Future<T?> showAppFormDialog<T>(
  BuildContext context, {
  required WidgetBuilder builder,
  bool barrierDismissible = true,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    builder: builder,
  );
}

/// Formulario con cabecera, cuerpo desplazable y pie fijo.
class AppFormDialog extends StatelessWidget {
  const AppFormDialog({
    super.key,
    required this.title,
    required this.child,
    required this.actions,
  });

  final String title;
  final Widget child;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return AppWorkDialog(title: title, actions: actions, child: child);
  }
}
