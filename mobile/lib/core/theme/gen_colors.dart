// Portado de genstock: frontend/lib/core/theme/gen_stock_colors.dart
import 'package:flutter/material.dart';

export 'color_contrast.dart' show readableOn, textOn;

/// Tokens de color semánticos de genwork móvil (valores de la web, `globals.css`).
/// Acceso rápido: `context.colors.<token>`.
///
/// Los neutros oscuros son acromáticos (R=G=B); el azul vive solo en marca,
/// selección y foco.
@immutable
class GenColors extends ThemeExtension<GenColors> {
  const GenColors({
    required this.page,
    required this.field,
    required this.surface,
    required this.floating,
    required this.hover,
    required this.text,
    required this.muted,
    required this.border,
    required this.outline,
    required this.brand,
    required this.onBrand,
    required this.brandFill,
    required this.danger,
    required this.dangerFill,
    required this.ok,
    required this.success,
    required this.successFill,
    required this.successText,
    required this.warning,
    required this.warningFill,
    required this.warningText,
    required this.info,
    required this.infoFill,
    required this.infoText,
    required this.favorite,
    required this.dueText,
    required this.dueFill,
    required this.tagWorkText,
    required this.tagWorkFill,
    required this.tagExecText,
    required this.tagExecFill,
    required this.tagRefText,
    required this.tagRefFill,
    required this.tagUserText,
    required this.tagUserFill,
    required this.tagLabelText,
    required this.tagLabelFill,
  });

  /// Scaffold y app bar.
  final Color page;

  /// Inputs, drawer y franjas de header.
  final Color field;

  /// Cards y paneles.
  final Color surface;

  /// Diálogos, menús y toasts: lo único con sombra.
  final Color floating;

  /// Hover/pressed y base del skeleton.
  final Color hover;

  /// Texto principal.
  final Color text;

  /// Texto secundario e íconos.
  final Color muted;

  /// Bordes estructurales.
  final Color border;

  /// Borde de inputs y tracks de progreso.
  final Color outline;

  /// Primario, links, foco y selección.
  final Color brand;

  /// Texto sobre `brand` (en oscuro NO es blanco).
  final Color onBrand;

  /// Ítem activo y caja de ícono de header (en oscuro, opaco ≈ 14 % de brand sobre page).
  final Color brandFill;

  /// Errores y acciones destructivas.
  final Color danger;

  /// Fondo de error.
  final Color dangerFill;

  /// Relleno de progreso en cards.
  final Color ok;

  /// Estado éxito: base.
  final Color success;

  /// Estado éxito: fondo.
  final Color successFill;

  /// Estado éxito: texto.
  final Color successText;

  /// Estado aviso: base.
  final Color warning;

  /// Estado aviso: fondo.
  final Color warningFill;

  /// Estado aviso: texto.
  final Color warningText;

  /// Estado info: base.
  final Color info;

  /// Estado info: fondo.
  final Color infoFill;

  /// Estado info: texto.
  final Color infoText;

  /// Estrella de favoritos.
  final Color favorite;

  /// Fecha dentro de una tarea: texto.
  final Color dueText;

  /// Fecha dentro de una tarea: fondo.
  final Color dueFill;

  /// Sintaxis del composer: trabajo (texto).
  final Color tagWorkText;

  /// Sintaxis del composer: trabajo (fondo).
  final Color tagWorkFill;

  /// Sintaxis del composer: ejecutor (texto).
  final Color tagExecText;

  /// Sintaxis del composer: ejecutor (fondo, = brandFill).
  final Color tagExecFill;

  /// Sintaxis del composer: referencia (texto).
  final Color tagRefText;

  /// Sintaxis del composer: referencia (fondo).
  final Color tagRefFill;

  /// Sintaxis del composer: usuario (texto).
  final Color tagUserText;

  /// Sintaxis del composer: usuario (fondo).
  final Color tagUserFill;

  /// Sintaxis del composer: etiqueta (texto).
  final Color tagLabelText;

  /// Sintaxis del composer: etiqueta (fondo).
  final Color tagLabelFill;

  static const light = GenColors(
    page: Color(0xFFF4F5F8),
    field: Color(0xFFF1F3F6),
    surface: Color(0xFFFFFFFF),
    floating: Color(0xFFFFFFFF),
    hover: Color(0xFFECEEF2),
    text: Color(0xFF111118),
    muted: Color(0xFF5C5C70),
    border: Color(0xFFD2D6DE),
    outline: Color(0xFFE3E6EB),
    brand: Color(0xFF3B5BFA),
    onBrand: Color(0xFFFFFFFF),
    brandFill: Color(0xFFEEF1FF),
    danger: Color(0xFFB91C1C),
    dangerFill: Color(0xFFFEF2F2),
    ok: Color(0xFF15803D),
    success: Color(0xFF22C55E),
    successFill: Color(0xFFF0FDF4),
    successText: Color(0xFF166534),
    warning: Color(0xFFF59E0B),
    warningFill: Color(0xFFFFFBEB),
    warningText: Color(0xFF92400E),
    info: Color(0xFF3B82F6),
    infoFill: Color(0xFFEFF6FF),
    infoText: Color(0xFF1E40AF),
    favorite: Color(0xFFEAB308),
    dueText: Color(0xFFB45309),
    dueFill: Color(0xFFFEF3C7),
    tagWorkText: Color(0xFF7C3AED),
    tagWorkFill: Color(0xFFF3EEFF),
    tagExecText: Color(0xFF2563EB),
    tagExecFill: Color(0xFFEEF1FF),
    tagRefText: Color(0xFFB45309),
    tagRefFill: Color(0xFFFFF4E0),
    tagUserText: Color(0xFF9333EA),
    tagUserFill: Color(0xFFF3E8FF),
    tagLabelText: Color(0xFF0F766E),
    tagLabelFill: Color(0xFFCCFBF1),
  );

  static const dark = GenColors(
    page: Color(0xFF0C0C0C),
    field: Color(0xFF151515),
    surface: Color(0xFF1C1C1C),
    floating: Color(0xFF262626),
    hover: Color(0xFF2C2C2C),
    text: Color(0xFFF0F0F0),
    muted: Color(0xFF959595),
    border: Color(0xFF272727),
    outline: Color(0xFF333333),
    brand: Color(0xFF5B7FFF),
    onBrand: Color(0xFF0C0C0C),
    brandFill: Color(0xFF171C2E),
    danger: Color(0xFFF87171),
    dangerFill: Color(0xFF3A1518),
    ok: Color(0xFF3ECF8E),
    success: Color(0xFF4ADE80),
    successFill: Color(0x1A22C55E),
    successText: Color(0xFF86EFAC),
    warning: Color(0xFFFBBF24),
    warningFill: Color(0x1AF59E0B),
    warningText: Color(0xFFFCD34D),
    info: Color(0xFF60A5FA),
    infoFill: Color(0x1A3B82F6),
    infoText: Color(0xFF93C5FD),
    favorite: Color(0xFFFACC15),
    dueText: Color(0xFFFBBF24),
    dueFill: Color(0x26FBBF24),
    tagWorkText: Color(0xFFB79CFF),
    tagWorkFill: Color(0xFF2A2140),
    tagExecText: Color(0xFF7FB0FF),
    tagExecFill: Color(0xFF171C2E),
    tagRefText: Color(0xFFFFB35C),
    tagRefFill: Color(0xFF3A2A12),
    tagUserText: Color(0xFFC084FC),
    tagUserFill: Color(0xFF2E1A47),
    tagLabelText: Color(0xFF5EEAD4),
    tagLabelFill: Color(0xFF113230),
  );

  // ── Derivados ───────────────────────────────────────────

  /// Fondo de un chip de color elegido por el usuario: 14 % del color sobre `surface`.
  Color chipFill(Color c) =>
      Color.alphaBlend(c.withValues(alpha: .14), surface);

  /// Texto de un chip de color elegido por el usuario: 80 % del color con `text`.
  Color chipText(Color c) => Color.lerp(text, c, .8)!;

  /// Fondo del pill de estado de tarea: 16 % del color sobre `surface`.
  Color statusFill(Color c) =>
      Color.alphaBlend(c.withValues(alpha: .16), surface);

  /// Texto del pill de estado de tarea: 85 % del color con `text`.
  Color statusText(Color c) => Color.lerp(text, c, .85)!;

  // ── ThemeExtension ──────────────────────────────────────

  @override
  GenColors copyWith({
    Color? page,
    Color? field,
    Color? surface,
    Color? floating,
    Color? hover,
    Color? text,
    Color? muted,
    Color? border,
    Color? outline,
    Color? brand,
    Color? onBrand,
    Color? brandFill,
    Color? danger,
    Color? dangerFill,
    Color? ok,
    Color? success,
    Color? successFill,
    Color? successText,
    Color? warning,
    Color? warningFill,
    Color? warningText,
    Color? info,
    Color? infoFill,
    Color? infoText,
    Color? favorite,
    Color? dueText,
    Color? dueFill,
    Color? tagWorkText,
    Color? tagWorkFill,
    Color? tagExecText,
    Color? tagExecFill,
    Color? tagRefText,
    Color? tagRefFill,
    Color? tagUserText,
    Color? tagUserFill,
    Color? tagLabelText,
    Color? tagLabelFill,
  }) {
    return GenColors(
      page: page ?? this.page,
      field: field ?? this.field,
      surface: surface ?? this.surface,
      floating: floating ?? this.floating,
      hover: hover ?? this.hover,
      text: text ?? this.text,
      muted: muted ?? this.muted,
      border: border ?? this.border,
      outline: outline ?? this.outline,
      brand: brand ?? this.brand,
      onBrand: onBrand ?? this.onBrand,
      brandFill: brandFill ?? this.brandFill,
      danger: danger ?? this.danger,
      dangerFill: dangerFill ?? this.dangerFill,
      ok: ok ?? this.ok,
      success: success ?? this.success,
      successFill: successFill ?? this.successFill,
      successText: successText ?? this.successText,
      warning: warning ?? this.warning,
      warningFill: warningFill ?? this.warningFill,
      warningText: warningText ?? this.warningText,
      info: info ?? this.info,
      infoFill: infoFill ?? this.infoFill,
      infoText: infoText ?? this.infoText,
      favorite: favorite ?? this.favorite,
      dueText: dueText ?? this.dueText,
      dueFill: dueFill ?? this.dueFill,
      tagWorkText: tagWorkText ?? this.tagWorkText,
      tagWorkFill: tagWorkFill ?? this.tagWorkFill,
      tagExecText: tagExecText ?? this.tagExecText,
      tagExecFill: tagExecFill ?? this.tagExecFill,
      tagRefText: tagRefText ?? this.tagRefText,
      tagRefFill: tagRefFill ?? this.tagRefFill,
      tagUserText: tagUserText ?? this.tagUserText,
      tagUserFill: tagUserFill ?? this.tagUserFill,
      tagLabelText: tagLabelText ?? this.tagLabelText,
      tagLabelFill: tagLabelFill ?? this.tagLabelFill,
    );
  }

  @override
  GenColors lerp(covariant GenColors? other, double t) {
    if (other is! GenColors) return this;
    return GenColors(
      page: Color.lerp(page, other.page, t)!,
      field: Color.lerp(field, other.field, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      floating: Color.lerp(floating, other.floating, t)!,
      hover: Color.lerp(hover, other.hover, t)!,
      text: Color.lerp(text, other.text, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      border: Color.lerp(border, other.border, t)!,
      outline: Color.lerp(outline, other.outline, t)!,
      brand: Color.lerp(brand, other.brand, t)!,
      onBrand: Color.lerp(onBrand, other.onBrand, t)!,
      brandFill: Color.lerp(brandFill, other.brandFill, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      dangerFill: Color.lerp(dangerFill, other.dangerFill, t)!,
      ok: Color.lerp(ok, other.ok, t)!,
      success: Color.lerp(success, other.success, t)!,
      successFill: Color.lerp(successFill, other.successFill, t)!,
      successText: Color.lerp(successText, other.successText, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningFill: Color.lerp(warningFill, other.warningFill, t)!,
      warningText: Color.lerp(warningText, other.warningText, t)!,
      info: Color.lerp(info, other.info, t)!,
      infoFill: Color.lerp(infoFill, other.infoFill, t)!,
      infoText: Color.lerp(infoText, other.infoText, t)!,
      favorite: Color.lerp(favorite, other.favorite, t)!,
      dueText: Color.lerp(dueText, other.dueText, t)!,
      dueFill: Color.lerp(dueFill, other.dueFill, t)!,
      tagWorkText: Color.lerp(tagWorkText, other.tagWorkText, t)!,
      tagWorkFill: Color.lerp(tagWorkFill, other.tagWorkFill, t)!,
      tagExecText: Color.lerp(tagExecText, other.tagExecText, t)!,
      tagExecFill: Color.lerp(tagExecFill, other.tagExecFill, t)!,
      tagRefText: Color.lerp(tagRefText, other.tagRefText, t)!,
      tagRefFill: Color.lerp(tagRefFill, other.tagRefFill, t)!,
      tagUserText: Color.lerp(tagUserText, other.tagUserText, t)!,
      tagUserFill: Color.lerp(tagUserFill, other.tagUserFill, t)!,
      tagLabelText: Color.lerp(tagLabelText, other.tagLabelText, t)!,
      tagLabelFill: Color.lerp(tagLabelFill, other.tagLabelFill, t)!,
    );
  }
}

/// Acceso rápido: `context.colors.brand`. Sin la extensión en el tema (un
/// `MaterialApp` pelado) cae a la instancia que corresponde al brillo.
extension GenColorsX on BuildContext {
  GenColors get colors {
    final theme = Theme.of(this);
    return theme.extension<GenColors>() ??
        (theme.brightness == Brightness.dark
            ? GenColors.dark
            : GenColors.light);
  }
}
