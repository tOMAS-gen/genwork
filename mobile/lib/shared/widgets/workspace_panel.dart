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

/// [WorkspaceListPanel] perezoso, para listas largas dentro de un
/// `CustomScrollView` (T2): el marco se dibuja con [DecoratedSliver] y solo
/// se construyen las filas visibles. La primera y la última fila se recortan
/// a la curva del panel para que la tinta no se salga.
class SliverListPanel extends StatelessWidget {
  const SliverListPanel({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const radius = AppGeometry.card;
    return PanelSliver(
      sliver: SliverList.separated(
        itemCount: itemCount,
        separatorBuilder: (_, _) =>
            Divider(height: 1, thickness: 1, color: c.border),
        itemBuilder: (context, i) {
          final row = Material(
            type: MaterialType.transparency,
            child: itemBuilder(context, i),
          );
          final first = i == 0, last = i == itemCount - 1;
          if (!first && !last) return row;
          return ClipRRect(
            borderRadius: BorderRadius.vertical(
              top: first ? radius.topLeft : Radius.zero,
              bottom: last ? radius.bottomLeft : Radius.zero,
            ),
            child: row,
          );
        },
      ),
    );
  }
}

/// El marco de [WorkspacePanel] alrededor de un sliver (T2): fondo `surface`
/// con la curva de card y el contorno delante, como [AppWorkBox].
class PanelSliver extends StatelessWidget {
  const PanelSliver({super.key, required this.sliver});

  final Widget sliver;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedSliver(
      position: DecorationPosition.foreground,
      decoration: BoxDecoration(
        border: Border.all(color: c.border),
        borderRadius: AppGeometry.card,
      ),
      sliver: DecoratedSliver(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: AppGeometry.card,
        ),
        sliver: sliver,
      ),
    );
  }
}
