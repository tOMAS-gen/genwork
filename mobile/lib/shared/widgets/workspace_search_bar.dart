// Portado de genstock: frontend/lib/shared/widgets/workspace_search_bar.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/gen_colors.dart';

/// Campo y acciones comparten altura y se alinean con el marco del listado.
class WorkspaceSearchBar extends StatelessWidget {
  const WorkspaceSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.hintText,
    this.focusNode,
    this.actions = const [],
    this.bottomInset = AppSpacing.md,
  });

  final TextEditingController controller;
  final FocusNode? focusNode;
  final ValueChanged<String> onChanged;
  final String hintText;
  final List<Widget> actions;
  final double bottomInset;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final height = WorkspaceMetrics.controlHeight(context);
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: height,
              child: ValueListenableBuilder<TextEditingValue>(
                valueListenable: controller,
                builder: (context, value, _) => TextField(
                  controller: controller,
                  focusNode: focusNode,
                  onChanged: onChanged,
                  textAlignVertical: TextAlignVertical.center,
                  decoration: InputDecoration(
                    hintText: hintText,
                    prefixIcon: const Icon(
                      AppIcons.search,
                      size: AppIconSizes.field,
                    ),
                    suffixIcon: value.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Limpiar búsqueda',
                            icon: const Icon(
                              AppIcons.close,
                              size: AppIconSizes.field,
                            ),
                            onPressed: () {
                              controller.clear();
                              onChanged('');
                            },
                          ),
                  ),
                ),
              ),
            ),
          ),
          for (final action in actions) ...[
            const SizedBox(width: AppSpacing.sm),
            SizedBox(
              height: height,
              child: IconButtonTheme(
                data: IconButtonThemeData(
                  style: IconButton.styleFrom(
                    backgroundColor: c.field,
                    side: BorderSide(color: c.border),
                    shape: const RoundedRectangleBorder(
                      borderRadius: AppGeometry.control,
                    ),
                    minimumSize: Size(height, height),
                  ),
                ),
                child: action,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Botón «Filtros» de los listados: rótulo visible y el conteo entre
/// paréntesis. Con filtros activos toma `brand` sobre `brandFill`, para que se
/// note sin abrir el panel.
class WorkspaceFilterButton extends StatelessWidget {
  const WorkspaceFilterButton({
    super.key,
    required this.onPressed,
    this.count = 0,
    this.label,
  });

  final VoidCallback? onPressed;
  final int count;

  /// Reemplaza el rótulo por defecto (p. ej. «Ocultar filtros»).
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return OutlinedButton.icon(
      onPressed: onPressed,
      style: WorkspaceMetrics.controlStyle(context).merge(
        OutlinedButton.styleFrom(
          foregroundColor: count > 0 ? c.brand : c.text,
          backgroundColor: count > 0 ? c.brandFill : null,
        ),
      ),
      icon: const Icon(AppIcons.tune, size: AppIconSizes.field),
      label: Text(label ?? (count == 0 ? 'Filtros' : 'Filtros ($count)')),
    );
  }
}
