// Portado de genstock: frontend/lib/shared/widgets/workspace_panel.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';
import 'app_work_box.dart';

/// Contenedor de bloque compartido, como `.card` de genwork web: `surface`,
/// borde `border`, curva de card y sin sombra.
class WorkspacePanel extends StatelessWidget {
  const WorkspacePanel({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.margin = EdgeInsets.zero,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context) => Padding(
    padding: margin,
    child: AppWorkBox(
      backgroundColor: context.colors.surface,
      borderRadius: AppGeometry.card,
      padding: padding,
      child: child,
    ),
  );
}

/// Listado simple dentro de un único bloque: las filas se separan con una
/// línea fina en vez de apilar un recuadro por fila. El `Material`
/// transparente deja que la tinta de cada fila se recorte contra la curva del
/// panel.
class WorkspaceListPanel extends StatelessWidget {
  const WorkspaceListPanel({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return WorkspacePanel(
      child: Material(
        type: MaterialType.transparency,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < children.length; i++) ...[
              if (i > 0) Divider(height: 1, thickness: 1, color: c.border),
              children[i],
            ],
          ],
        ),
      ),
    );
  }
}
