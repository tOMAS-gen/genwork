// Escala tipográfica de genwork (tabla 2.3 del plan de paridad). Montserrat en
// todo —como la web— y Roboto Mono para fechas, códigos y números. Los estilos
// no llevan color: lo pone el `textTheme` o quien los usa. Todos fijan
// `letterSpacing` (la web usa 0; sin esto heredan 0.25 del tema de Material y el
// texto sale más ancho).
import 'package:flutter/material.dart';

abstract final class AppTextStyles {
  /// Mapea a `headlineSmall`.
  static const screenTitle = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
    height: 1.3,
  );

  /// Mapea a `titleLarge`.
  static const dialogTitle = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.3,
  );

  /// Mapea a `titleMedium`.
  static const itemTitle = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.35,
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
  /// `toUpperCase()`) y tracking 1.2. Mapea a `labelSmall`.
  static const sectionLabel = TextStyle(
    fontFamily: 'Montserrat',
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.2,
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

  /// Fechas, códigos y números (`AppTokens.code`).
  static const technical = TextStyle(
    fontFamily: 'RobotoMono',
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
  );
}
