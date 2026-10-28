// Escala tipográfica de genwork: los cuatro pasos de la dirección premium (D2,
// spec 066) — 20/700 título, 15/600 título de card o sección, 13/400 cuerpo y
// 11/700 rótulo —, más apoyo 12, acción 13/600 y chip 12/500. Montserrat en
// todo —como la web— y Roboto Mono solo para cifras y códigos. Los estilos
// no llevan color: lo pone el `textTheme` o quien los usa. Todos fijan
// `letterSpacing` (la web usa 0; sin esto heredan 0.25 del tema de Material y el
// texto sale más ancho).
import 'package:flutter/material.dart';

abstract final class AppTextStyles {
  /// Título de pantalla, 20/700. Mapea a `headlineSmall`.
  static const screenTitle = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
    height: 1.3,
  );

  /// Título de una entidad abierta (tarea): el mismo paso que el de pantalla.
  static const entityTitle = screenTitle;

  /// Título de card, sección, ítem o diálogo, 15/600.
  static const cardTitle = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.35,
  );

  /// Mapea a `titleLarge`.
  static const dialogTitle = cardTitle;

  /// Mapea a `titleMedium`.
  static const itemTitle = cardTitle;

  /// Ítem del menú lateral, 14/500 (P03-M1): un paso más que el cuerpo para
  /// que la navegación se lea de un vistazo.
  static const nav = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0,
    height: 1.4,
  );

  /// Mapea a `bodyLarge` y `bodyMedium`.
  static const body = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.6,
  );

  /// Texto secundario (`muted`). Mapea a `bodySmall`.
  static const supporting = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.5,
  );

  /// Rótulo de botón, en sentence case. Mapea a `labelLarge`.
  static const action = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.2,
  );

  /// Rótulo de sección: **mayúsculas** (las pone quien lo usa, p. ej.
  /// `toUpperCase()`) y tracking de 0,06 em. Mapea a `labelSmall`.
  static const sectionLabel = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 11 * .06,
    height: 1.2,
  );

  /// Chip (`chipTheme.labelStyle`).
  static const chip = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0,
    height: 1.5,
  );

  /// Chip compacto de la fila del detalle de tarea: 11/500, para que estado,
  /// Mi día, Urgente y Recordatorio compartan renglón (boceto P09).
  static const chipCompact = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0,
    height: 1.5,
  );

  /// Cifras, fechas numéricas y códigos (`AppTokens.code`), con números
  /// tabulares. Nunca para rótulos ni fechas escritas en palabras.
  static const technical = TextStyle(
    fontFamily: 'RobotoMono',
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    fontFeatures: [FontFeature.tabularFigures()],
  );
}
