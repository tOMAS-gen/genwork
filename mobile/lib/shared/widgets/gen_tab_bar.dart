// Portado de genstock: frontend/lib/shared/widgets/gen_tab_section.dart
// (solo `GenTabBar` y sus modelos; sin el orquestador de contenido).
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Acción inline de la barra de pestañas: ícono + callback opcional.
class GenTabAction {
  const GenTabAction({
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.primary = false,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;

  /// Acción principal: se pinta con el color de marca.
  final bool primary;
}

/// Una pestaña: nombre, ícono opcional y cierre opcional.
class GenTabItem {
  const GenTabItem({required this.label, this.icon, this.onClose});

  final String label;
  final IconData? icon;

  /// Callback de cierre. Cuando está presente el tab muestra una `×`.
  final VoidCallback? onClose;
}

enum GenTabBarStyle { workspace, quiet }

/// Barra de pestañas: fila horizontal desplazable de tabs + acciones inline a
/// la derecha, con borde inferior común. La pestaña activa lleva una lengüeta
/// de [kActiveTickWidth] px en `brand`. Mantiene a la vista la pestaña activa.
class GenTabBar extends StatefulWidget {
  const GenTabBar({
    super.key,
    required this.tabs,
    required this.activeIndex,
    required this.onSelect,
    this.inlineActions = const [],
    this.leading,
    this.trailing = const [],
    this.style = GenTabBarStyle.quiet,
    this.height = kMinInteractiveDimension,
    this.showBottomBorder = true,
    this.showIcons = false,
  });

  final List<GenTabItem> tabs;
  final int activeIndex;
  final List<GenTabAction> inlineActions;
  final ValueChanged<int> onSelect;
  final GenTabBarStyle style;
  final Widget? leading;
  final List<Widget> trailing;

  /// Altura mínima de pestañas y acciones de la barra.
  final double height;

  /// Desactivar si la cabecera que contiene las pestañas ya dibuja su borde.
  final bool showBottomBorder;

  /// Muestra el ícono de cada pestaña también en el estilo `quiet`.
  final bool showIcons;

  @override
  State<GenTabBar> createState() => _GenTabBarState();
}

class _GenTabBarState extends State<GenTabBar> {
  final _scrollController = ScrollController();
  final _tabKeys = <GlobalKey>[];
  double? _viewportWidth;
  double? _scaledBodySize;
  bool _revealScheduled = false;

  @override
  void initState() {
    super.initState();
    _syncKeys();
    _scheduleReveal();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scaledBodySize = MediaQuery.textScalerOf(context).scale(13);
    if (_scaledBodySize != scaledBodySize) {
      _scaledBodySize = scaledBodySize;
      _scheduleReveal();
    }
  }

  @override
  void didUpdateWidget(GenTabBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncKeys();
    final labelsChanged =
        widget.tabs.length == oldWidget.tabs.length &&
        List.generate(
          widget.tabs.length,
          (i) => i,
        ).any((i) => widget.tabs[i].label != oldWidget.tabs[i].label);
    if (widget.activeIndex != oldWidget.activeIndex ||
        widget.tabs.length != oldWidget.tabs.length ||
        widget.height != oldWidget.height ||
        widget.style != oldWidget.style ||
        labelsChanged) {
      _scheduleReveal();
    }
  }

  void _syncKeys() {
    while (_tabKeys.length < widget.tabs.length) {
      _tabKeys.add(GlobalKey());
    }
    if (_tabKeys.length > widget.tabs.length) {
      _tabKeys.removeRange(widget.tabs.length, _tabKeys.length);
    }
  }

  void _scheduleReveal() {
    if (_revealScheduled) return;
    _revealScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _revealScheduled = false;
      if (!mounted || !_scrollController.hasClients) return;
      final activeIndex = widget.activeIndex;
      if (activeIndex < 0 || activeIndex >= _tabKeys.length) return;
      final target = _tabKeys[activeIndex].currentContext?.findRenderObject();
      final position = _scrollController.position;
      if (target == null ||
          !target.attached ||
          !position.hasContentDimensions) {
        return;
      }
      final viewport = RenderAbstractViewport.maybeOf(target);
      if (viewport == null) return;
      final start = viewport.getOffsetToReveal(target, 0).offset;
      final end = viewport.getOffsetToReveal(target, 1).offset;
      // Solo mover lo necesario y únicamente por selección o geometría: los
      // rebuilds de datos y el desplazamiento manual no reubican la fila.
      final offset = start < position.pixels
          ? start
          : end > position.pixels
          ? (start < end ? start : end)
          : position.pixels;
      final clamped = offset
          .clamp(position.minScrollExtent, position.maxScrollExtent)
          .toDouble();
      if ((clamped - position.pixels).abs() > 0.5) position.jumpTo(clamped);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final workspace = widget.style == GenTabBarStyle.workspace;

    final tabRow = SingleChildScrollView(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          ?widget.leading,
          for (var i = 0; i < widget.tabs.length; i++)
            _TabButton(
              key: _tabKeys[i],
              item: widget.tabs[i],
              style: widget.style,
              height: widget.height,
              showIcon: widget.showIcons || workspace,
              isSelected: i == widget.activeIndex,
              onTap: () => widget.onSelect(i),
            ),
        ],
      ),
    );

    final bar = DecoratedBox(
      decoration: BoxDecoration(
        color: workspace ? c.field : null,
        border: widget.showBottomBorder
            ? Border(bottom: BorderSide(color: c.border))
            : null,
      ),
      child: Row(
        children: [
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                if (_viewportWidth != constraints.maxWidth) {
                  _viewportWidth = constraints.maxWidth;
                  _scheduleReveal();
                }
                return tabRow;
              },
            ),
          ),
          for (final a in widget.inlineActions)
            SizedBox.square(
              dimension: widget.height,
              child: IconButton(
                icon: Icon(a.icon, size: AppIconSizes.field),
                color: a.primary ? c.brand : null,
                onPressed: a.onPressed,
                tooltip: a.tooltip,
              ),
            ),
          for (final action in widget.trailing)
            ConstrainedBox(
              constraints: BoxConstraints(minHeight: widget.height),
              child: action,
            ),
        ],
      ),
    );
    return widget.style == GenTabBarStyle.quiet
        ? Material(type: MaterialType.transparency, child: bar)
        : bar;
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    super.key,
    required this.item,
    required this.height,
    required this.isSelected,
    required this.onTap,
    required this.style,
    required this.showIcon,
  });

  final GenTabItem item;
  final bool showIcon;
  final double height;
  final bool isSelected;
  final VoidCallback onTap;
  final GenTabBarStyle style;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final workspace = style == GenTabBarStyle.workspace;
    final quiet = !workspace;
    final textColor = quiet
        ? (isSelected ? c.brand : c.muted)
        : (isSelected ? c.text : c.muted);

    final button = InkWell(
      onTap: onTap,
      focusColor: quiet ? c.brandFill : null,
      hoverColor: quiet ? c.hover : null,
      child: Container(
        constraints: BoxConstraints(minHeight: height),
        padding: EdgeInsets.symmetric(
          horizontal: quiet ? AppSpacing.md : AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: workspace && isSelected ? c.hover : null,
          // La pestaña inactiva reserva el mismo espacio con borde transparente;
          // el único contorno exterior lo dibuja la cabecera que la contiene.
          border: Border(
            right: workspace ? BorderSide(color: c.border) : BorderSide.none,
            bottom: BorderSide(
              color: workspace
                  ? c.border
                  : isSelected
                  ? c.brand
                  : c.brand.withValues(alpha: 0),
              width: workspace ? 1 : kActiveTickWidth,
            ),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (showIcon && item.icon != null) ...[
              Icon(item.icon, size: AppIconSizes.notice, color: textColor),
              const SizedBox(width: AppSpacing.xxs),
            ],
            Text(
              item.label,
              style: (quiet ? AppTextStyles.body : AppTextStyles.supporting)
                  .copyWith(
                    color: textColor,
                    fontWeight: quiet ? FontWeight.w500 : FontWeight.w400,
                  ),
            ),
            if (item.onClose != null) ...[
              const SizedBox(width: AppSpacing.xxs),
              SizedBox.square(
                dimension: height,
                child: IconButton(
                  tooltip: 'Cerrar ${item.label}',
                  onPressed: item.onClose,
                  icon: Icon(
                    AppIcons.close,
                    size: AppIconSizes.compact,
                    color: c.muted,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
    if (quiet) {
      return Semantics(button: true, selected: isSelected, child: button);
    }
    return Semantics(
      button: true,
      selected: isSelected,
      child: Stack(
        children: [
          button,
          if (isSelected)
            Positioned(
              left: AppSpacing.sm,
              right: AppSpacing.sm,
              bottom: 0,
              height: kActiveTickWidth,
              child: IgnorePointer(child: ColoredBox(color: c.brand)),
            ),
        ],
      ),
    );
  }
}
