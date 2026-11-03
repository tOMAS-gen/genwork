import 'package:flutter/material.dart';

import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Una acción del menú "⋯" de una fila.
class RowAction {
  const RowAction({
    required this.key,
    required this.label,
    required this.onSelected,
    this.destructive = false,
  });

  /// Clave del ítem del menú (para tests y Marionette).
  final String key;
  final String label;
  final VoidCallback onSelected;

  /// En rojo, al final y separada de las demás (D6).
  final bool destructive;
}

/// Menú "⋯" de una fila (PS5): las acciones secundarias y destructivas no
/// quedan a la vista. Ícono de 20 dp gris con 48 dp táctiles.
class RowActionsMenu extends StatelessWidget {
  const RowActionsMenu({
    super.key,
    required this.tooltip,
    required this.actions,
    this.enabled = true,
  });

  /// Nombre accesible, con el objeto de la fila ("Acciones de Ana").
  final String tooltip;
  final List<RowAction> actions;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final regular = [
      for (final a in actions)
        if (!a.destructive) a,
    ];
    final destructive = [
      for (final a in actions)
        if (a.destructive) a,
    ];
    PopupMenuItem<RowAction> item(RowAction a) => PopupMenuItem(
      key: ValueKey(a.key),
      value: a,
      child: Text(
        a.label,
        style: AppTextStyles.body.copyWith(
          color: a.destructive ? c.danger : c.text,
        ),
      ),
    );
    return PopupMenuButton<RowAction>(
      tooltip: tooltip,
      enabled: enabled,
      icon: Icon(
        AppIcons.moreHorizontal,
        size: AppIconSizes.action,
        color: c.muted,
      ),
      onSelected: (a) => a.onSelected(),
      itemBuilder: (_) => [
        ...regular.map(item),
        if (regular.isNotEmpty && destructive.isNotEmpty)
          const PopupMenuDivider(),
        ...destructive.map(item),
      ],
    );
  }
}
