import 'package:flutter/material.dart';

/// Escala compartida: los valores de layout tienen un único origen.
/// Misma escala que `AppSpacing` (app_geometry.dart, usada por los widgets
/// portados de genstock): distinto nombre, mismos valores.
abstract final class AppSpace {
  static const double xxs = 2,
      emptyLead = 120,
      bottomClearance = 80,
      dot = 10,
      dotLarge = 14;
  static const double xs = 4, sm = 8, md = 12, lg = 16, xl = 24, xxl = 32;
  static const double touch = 48, icon = 20, hero = 64, contentMax = 480;
  static const page = EdgeInsets.all(lg);
  static const list = EdgeInsets.fromLTRB(lg, sm, lg, 96);
}

@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens({
    required this.field,
    required this.muted,
    required this.success,
  });
  final Color field, muted, success;
  BorderRadius get controlRadius => BorderRadius.circular(6);
  BorderRadius get cardRadius => BorderRadius.circular(8);
  BorderRadius get overlayRadius => BorderRadius.circular(12);
  EdgeInsets get pagePadding => AppSpace.page;
  TextStyle get code => const TextStyle(fontFamily: 'RobotoMono', fontSize: 12);
  List<BoxShadow> get floatingShadow => const [
    BoxShadow(color: Color(0x26000000), blurRadius: 20, offset: Offset(0, 8)),
  ];
  static AppTokens of(BuildContext context) =>
      Theme.of(context).extension<AppTokens>()!;
  @override
  AppTokens copyWith({Color? field, Color? muted, Color? success}) => AppTokens(
    field: field ?? this.field,
    muted: muted ?? this.muted,
    success: success ?? this.success,
  );
  @override
  AppTokens lerp(AppTokens? other, double t) => other == null
      ? this
      : AppTokens(
          field: Color.lerp(field, other.field, t)!,
          muted: Color.lerp(muted, other.muted, t)!,
          success: Color.lerp(success, other.success, t)!,
        );
}

abstract final class AppColors {
  static const brandLight = Color(0xFF3B5BFA), brandDark = Color(0xFF5B7FFF);
  static const pageLight = Color(0xFFF4F5F8),
      panelLight = Colors.white,
      fieldLight = Color(0xFFF1F3F6),
      borderLight = Color(0xFFD2D6DE);
  static const pageDark = Color(0xFF0C0C0C),
      panelDark = Color(0xFF151515),
      fieldDark = Color(0xFF1C1C1C),
      borderDark = Color(0xFF272727);
}

abstract final class AppTheme {
  static ThemeData light() => _build(false);
  static ThemeData dark() => _build(true);
  static ThemeData _build(bool dark) {
    final brand = dark ? AppColors.brandDark : AppColors.brandLight;
    final page = dark ? AppColors.pageDark : AppColors.pageLight;
    final panel = dark ? AppColors.panelDark : AppColors.panelLight;
    final border = dark ? AppColors.borderDark : AppColors.borderLight;
    final text = dark ? const Color(0xFFF5F5F5) : const Color(0xFF20232D);
    final tokens = AppTokens(
      field: dark ? AppColors.fieldDark : AppColors.fieldLight,
      muted: dark ? const Color(0xFFB0B0B0) : const Color(0xFF596170),
      success: dark ? const Color(0xFF78D6A1) : const Color(0xFF197443),
    );
    final scheme =
        ColorScheme.fromSeed(
          seedColor: brand,
          brightness: dark ? Brightness.dark : Brightness.light,
        ).copyWith(
          primary: brand,
          onPrimary: dark ? AppColors.pageDark : Colors.white,
          primaryContainer: dark
              ? const Color(0xFF1A254A)
              : const Color(0xFFE9EDFF),
          onPrimaryContainer: dark
              ? const Color(0xFFB9C7FF)
              : const Color(0xFF2641C2),
          surface: panel,
          onSurface: text,
          onSurfaceVariant: tokens.muted,
          surfaceContainerLowest: page,
          surfaceContainerLow: page,
          surfaceContainer: tokens.field,
          surfaceContainerHigh: tokens.field,
          surfaceContainerHighest: tokens.field,
          outline: tokens.muted,
          outlineVariant: border,
          surfaceTint: Colors.transparent,
        );
    final shape = RoundedRectangleBorder(borderRadius: tokens.controlRadius);
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: 'Montserrat',
    );
    final typography = base.textTheme
        .copyWith(
          headlineSmall: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: text,
            height: 1.3,
          ),
          headlineMedium: TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.w700,
            color: text,
            height: 1.2,
          ),
          titleLarge: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: text,
          ),
          titleMedium: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: text,
            height: 1.4,
          ),
          titleSmall: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: text,
          ),
          bodyLarge: TextStyle(fontSize: 15, height: 1.5, color: text),
          bodyMedium: TextStyle(fontSize: 14, height: 1.5, color: text),
          bodySmall: TextStyle(fontSize: 12, height: 1.5, color: tokens.muted),
          labelLarge: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: text,
          ),
          labelSmall: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: tokens.muted,
          ),
        )
        .apply(fontFamily: 'Montserrat');
    return base.copyWith(
      extensions: [tokens],
      textTheme: typography,
      scaffoldBackgroundColor: page,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      appBarTheme: AppBarThemeData(
        backgroundColor: page,
        foregroundColor: text,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: typography.titleLarge,
        toolbarHeight: 72,
      ),
      cardTheme: CardThemeData(
        color: panel,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: tokens.cardRadius,
          side: BorderSide(color: border),
        ),
      ),
      listTileTheme: ListTileThemeData(
        contentPadding: AppSpace.page,
        minVerticalPadding: AppSpace.md,
        titleTextStyle: typography.titleMedium,
        subtitleTextStyle: typography.bodySmall,
        iconColor: tokens.muted,
      ),
      inputDecorationTheme: InputDecorationThemeData(
        filled: true,
        fillColor: tokens.field,
        contentPadding: AppSpace.page,
        errorMaxLines: 4,
        border: OutlineInputBorder(
          borderRadius: tokens.controlRadius,
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: tokens.controlRadius,
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: tokens.controlRadius,
          borderSide: BorderSide(color: brand, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 52),
          shape: shape,
          textStyle: typography.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          shape: shape,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, 48),
          shape: shape,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(minimumSize: const Size.square(48)),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: brand,
        foregroundColor: scheme.onPrimary,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: tokens.overlayRadius),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: panel,
        elevation: 0,
        height: 80,
        indicatorColor: scheme.primaryContainer,
        indicatorShape: shape,
        labelTextStyle: WidgetStatePropertyAll(typography.labelSmall),
      ),
      chipTheme: ChipThemeData(
        shape: shape,
        side: BorderSide(color: border),
        labelStyle: typography.labelSmall,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStatePropertyAll(shape),
          minimumSize: const WidgetStatePropertyAll(Size(48, 48)),
          textStyle: WidgetStatePropertyAll(typography.labelLarge),
        ),
      ),
      dividerTheme: DividerThemeData(color: border, space: 1),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: panel,
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: panel,
        shape: RoundedRectangleBorder(borderRadius: tokens.overlayRadius),
      ),
      expansionTileTheme: ExpansionTileThemeData(
        shape: const Border(),
        collapsedShape: const Border(),
        textColor: text,
        collapsedTextColor: text,
        tilePadding: AppSpace.page,
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: brand,
        linearTrackColor: border,
        borderRadius: tokens.controlRadius,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: shape,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: _AppTransition(),
          TargetPlatform.iOS: _AppTransition(),
        },
      ),
    );
  }
}

class _AppTransition extends PageTransitionsBuilder {
  const _AppTransition();
  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) => MediaQuery.disableAnimationsOf(context)
      ? child
      : FadeTransition(opacity: animation, child: child);
}
