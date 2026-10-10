// Portado de genstock: frontend/lib/core/theme/app_theme.dart
// (AppSpacing, AppGeometry, AppShadows, LeadingTickBorder) y
// frontend/lib/core/theme/workspace_theme.dart (WorkspaceMetrics).
import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Cadencia de espaciado de los widgets portados de genstock. Misma escala que
/// `AppSpace` (que se conserva para el código existente), con otros nombres:
/// no los mezcles dentro de un mismo archivo.
abstract final class AppSpacing {
  static const xxs = 4.0;
  static const xs = 8.0;
  static const sm = 12.0;
  static const md = 16.0;
  static const ml = 20.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 40.0;
  static const xxxl = 48.0;
}

/// Geometría del sistema: la curva es proporcional a la pieza. Nada es una
/// píldora salvo [pill], que existe solo para lo circular por naturaleza.
abstract final class AppGeometry {
  /// Checkbox. Con la curva de [chip] se leería casi redondo y se confundiría
  /// con un radio button.
  static const checkbox = BorderRadius.all(Radius.circular(2));

  /// Chip de estado, badge, tooltip.
  static const chip = BorderRadius.all(Radius.circular(4));

  /// Botón, campo de texto, ítem de navegación.
  static const control = BorderRadius.all(Radius.circular(6));

  /// Card, bloque de contenido, panel, toast.
  static const card = BorderRadius.all(Radius.circular(8));

  /// Menú y popup.
  static const menu = BorderRadius.all(Radius.circular(10));

  /// Ítem dentro de un menú.
  static const menuItem = BorderRadius.all(Radius.circular(7));

  /// Lo que flota por encima de la página: diálogo y overlay.
  static const overlay = BorderRadius.all(Radius.circular(12));

  /// Ancho de diálogo angosto (confirmaciones y formularios de una columna).
  static const dialogNarrow = 400.0;

  /// Ancho de diálogo ancho (listas y contenido con scroll).
  static const dialogWide = 560.0;

  /// Ancho máximo del drawer de navegación.
  static const drawerWidth = 280.0;

  /// Solo para lo circular por naturaleza: avatar, contador, progreso.
  static const pill = BorderRadius.all(Radius.circular(999));

  /// Sin elevación de Material: la profundidad la dan la superficie y, en lo
  /// que flota, [AppShadows].
  static const elevation = 0.0;

  /// Grosor del anillo de foco (borde de 2 px `brand`).
  static const focusRingWidth = 2.0;
}

/// Sombras del sistema: una sola, y solo en lo que flota (diálogo, menú, toast).
abstract final class AppShadows {
  /// `0 10 20 rgba(0,0,0,.5)`
  static const darkFloating = [
    BoxShadow(color: Color(0x80000000), blurRadius: 20, offset: Offset(0, 10)),
  ];

  /// `0 10 20 rgba(15,23,42,.12)`
  static const lightFloating = [
    BoxShadow(color: Color(0x1F0F172A), blurRadius: 20, offset: Offset(0, 10)),
  ];

  /// La sombra que corresponde al brillo de [context].
  static List<BoxShadow> floatingOf(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark
      ? darkFloating
      : lightFloating;
}

/// Grosor de la "marca de etiqueta": la barra de acento que lleva todo lo
/// activo en su borde de arranque —item de navegación seleccionado, fila
/// abierta, tab vigente, columna ordenada—. Es la firma del sistema: un solo
/// gesto, repetido en todas las escalas, que responde siempre a la misma
/// pregunta ("¿cuál está activo?").
const double kActiveTickWidth = 3.0;

/// Cuánto del alto ocupa la lengüeta. Ver [LeadingTickBorder.tickHeightFactor].
const double kActiveTickHeightFactor = 0.5;

/// **Marca de etiqueta** — la firma del sistema.
///
/// Rectángulo redondeado con una barra de acento de [kActiveTickWidth] px
/// pegada al borde de arranque, como la lengüeta que sobresale de un cajón
/// rotulado. La lleva todo lo que está activo: item de navegación
/// seleccionado, fila abierta, tab vigente, columna ordenada.
///
/// Por qué un `ShapeBorder` y no un `Container` con borde a mano en cada
/// pantalla: los indicadores de navegación de Material se configuran por
/// `indicatorShape`, así que la única forma de que el gesto sea el mismo en
/// el drawer, en el rail y en una fila de tabla es que sea una forma
/// compartida y no una decoración copiada.
///
/// Respeta [TextDirection]: en RTL la barra va a la derecha.
class LeadingTickBorder extends OutlinedBorder {
  const LeadingTickBorder({
    required this.tickColor,
    this.borderRadius = AppGeometry.control,
    this.tickWidth = kActiveTickWidth,
    this.tickHeightFactor = kActiveTickHeightFactor,
    super.side = BorderSide.none,
  });

  final Color tickColor;
  final BorderRadius borderRadius;
  final double tickWidth;

  /// Fracción del alto que ocupa la lengüeta, centrada verticalmente.
  ///
  /// No corre de arriba abajo, y no es un detalle estético: recortada contra
  /// los 8 px de curva de [AppGeometry.control], una barra de altura completa
  /// termina en dos puntas afiladas y se lee como un artefacto de render.
  /// Acortada y centrada, sus extremos quedan lejos de las esquinas, se le
  /// pueden redondear, y pasa a leerse como lo que es: una marca puesta a
  /// propósito.
  final double tickHeightFactor;

  RRect _rrect(Rect rect) => borderRadius.toRRect(rect);

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.all(side.width);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) =>
      Path()..addRRect(_rrect(rect));

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      Path()..addRRect(_rrect(rect).deflate(side.width));

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final outer = _rrect(rect);

    final tickHeight = rect.height * tickHeightFactor;
    if (tickHeight > 0 && tickWidth > 0) {
      final leadingOnLeft = textDirection != TextDirection.rtl;
      final bar = Rect.fromLTWH(
        leadingOnLeft ? rect.left : rect.right - tickWidth,
        rect.center.dy - tickHeight / 2,
        tickWidth,
        tickHeight,
      );
      // Extremos redondeados propios: la barra es una pieza con forma, no un
      // recorte de la caja que la contiene.
      canvas.drawRRect(
        RRect.fromRectAndRadius(bar, Radius.circular(tickWidth / 2)),
        Paint()..color = tickColor,
      );
    }

    if (side.style != BorderStyle.none && side.width > 0) {
      canvas.drawRRect(outer.deflate(side.width / 2), side.toPaint());
    }
  }

  @override
  LeadingTickBorder copyWith({
    BorderSide? side,
    Color? tickColor,
    BorderRadius? borderRadius,
    double? tickWidth,
    double? tickHeightFactor,
  }) => LeadingTickBorder(
    side: side ?? this.side,
    tickColor: tickColor ?? this.tickColor,
    borderRadius: borderRadius ?? this.borderRadius,
    tickWidth: tickWidth ?? this.tickWidth,
    tickHeightFactor: tickHeightFactor ?? this.tickHeightFactor,
  );

  @override
  ShapeBorder scale(double t) => LeadingTickBorder(
    side: side.scale(t),
    tickColor: tickColor,
    borderRadius: borderRadius * t,
    tickWidth: tickWidth * t,
    // La fracción no escala: es una proporción, no una medida.
    tickHeightFactor: tickHeightFactor,
  );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeadingTickBorder &&
          other.side == side &&
          other.tickColor == tickColor &&
          other.borderRadius == borderRadius &&
          other.tickWidth == tickWidth &&
          other.tickHeightFactor == tickHeightFactor;

  @override
  int get hashCode =>
      Object.hash(side, tickColor, borderRadius, tickWidth, tickHeightFactor);
}

/// Alturas mínimas de bloques de estado (cargando/error/vacío) dentro de un
/// scroll sin altura acotada. Se usan como `minHeight`, nunca como `height`
/// fijo: a texto grande un alto fijo recortaría el mensaje.
abstract final class AppBlockHeights {
  static const state = 240.0;
  static const errorState = 280.0;
}

/// Medidas del espacio de trabajo, con controles que crecen con la fuente.
abstract final class WorkspaceMetrics {
  /// Caja de ícono del encabezado de página (sobre `brandFill`).
  static const headerIconExtent = 38.0;
  static const headerIconSize = 22.0;

  /// Pestañas compactas; crecen si el usuario amplía el texto.
  static double tabBarHeight(BuildContext context) => math.max(
    40.0,
    (MediaQuery.textScalerOf(context).scale(14) * 1.6 + AppSpacing.xs)
        .ceilToDouble(),
  );

  /// Alto de campos, botones, selectores y filas: ≥ 40 y crece con `textScaler`.
  static double controlHeight(BuildContext context) => math.max(
    40.0,
    (MediaQuery.textScalerOf(context).scale(13) * 1.6 + AppSpacing.xs * 2)
        .ceilToDouble(),
  );

  /// Chips de selección: caja visual compacta, dentro de un objetivo de 48 px.
  static double filterChipHeight(BuildContext context) => math.max(
    36.0,
    (MediaQuery.textScalerOf(context).scale(12) * 1.5 + AppSpacing.xs * 2)
        .ceilToDouble(),
  );

  static ButtonStyle controlStyle(BuildContext context) => ButtonStyle(
    fixedSize: WidgetStatePropertyAll(Size.fromHeight(controlHeight(context))),
    minimumSize: WidgetStatePropertyAll(Size(0, controlHeight(context))),
    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    visualDensity: VisualDensity.standard,
    padding: const WidgetStatePropertyAll(
      EdgeInsets.symmetric(horizontal: AppSpacing.sm),
    ),
  );
}
