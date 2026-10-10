import 'package:flutter/material.dart';

import 'app_geometry.dart';
import 'app_icons.dart';
import 'app_text_styles.dart';
import 'gen_colors.dart';

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

/// Fachada sobre [GenColors] y [AppGeometry] para el código que ya usaba
/// `AppTokens.of(context)`. Los valores viven en los tokens nuevos.
@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens({
    required this.field,
    required this.muted,
    required this.success,
    required this.floatingShadow,
  });

  factory AppTokens.from(GenColors c, {required bool dark}) => AppTokens(
    field: c.field,
    muted: c.muted,
    success: c.ok,
    floatingShadow: dark ? AppShadows.darkFloating : AppShadows.lightFloating,
  );

  final Color field, muted, success;
  final List<BoxShadow> floatingShadow;
  BorderRadius get controlRadius => AppGeometry.control;
  BorderRadius get cardRadius => AppGeometry.card;
  BorderRadius get overlayRadius => AppGeometry.overlay;
  EdgeInsets get pagePadding => AppSpace.page;
  TextStyle get code => AppTextStyles.technical;
  static AppTokens of(BuildContext context) =>
      Theme.of(context).extension<AppTokens>()!;
  @override
  AppTokens copyWith({
    Color? field,
    Color? muted,
    Color? success,
    List<BoxShadow>? floatingShadow,
  }) => AppTokens(
    field: field ?? this.field,
    muted: muted ?? this.muted,
    success: success ?? this.success,
    floatingShadow: floatingShadow ?? this.floatingShadow,
  );
  @override
  AppTokens lerp(AppTokens? other, double t) => other == null
      ? this
      : AppTokens(
          field: Color.lerp(field, other.field, t)!,
          muted: Color.lerp(muted, other.muted, t)!,
          success: Color.lerp(success, other.success, t)!,
          floatingShadow: BoxShadow.lerpList(
            floatingShadow,
            other.floatingShadow,
            t,
          )!,
        );
}

abstract final class AppTheme {
  static ThemeData light() => _build(GenColors.light, dark: false);
  static ThemeData dark() => _build(GenColors.dark, dark: true);

  static ThemeData _build(GenColors c, {required bool dark}) {
    final tokens = AppTokens.from(c, dark: dark);
    final scheme = ColorScheme(
      brightness: dark ? Brightness.dark : Brightness.light,
      primary: c.brand,
      onPrimary: c.onBrand,
      primaryContainer: c.brandFill,
      onPrimaryContainer: c.brand,
      secondary: c.brand,
      onSecondary: c.onBrand,
      secondaryContainer: c.brandFill,
      onSecondaryContainer: c.brand,
      error: c.danger,
      onError: c.onBrand,
      errorContainer: c.dangerFill,
      onErrorContainer: c.danger,
      surface: c.surface,
      onSurface: c.text,
      onSurfaceVariant: c.muted,
      outline: c.outline,
      outlineVariant: c.border,
      surfaceContainerLowest: c.page,
      surfaceContainerLow: c.page,
      surfaceContainer: c.field,
      surfaceContainerHigh: c.field,
      surfaceContainerHighest: c.field,
      inverseSurface: c.text,
      onInverseSurface: c.page,
      inversePrimary: c.brand,
      surfaceTint: Colors.transparent,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: 'Montserrat',
    );
    final typography = base.textTheme
        .copyWith(
          headlineSmall: AppTextStyles.screenTitle.copyWith(color: c.text),
          headlineMedium: AppTextStyles.screenTitle.copyWith(
            fontSize: 30,
            height: 1.2,
            color: c.text,
          ),
          titleLarge: AppTextStyles.dialogTitle.copyWith(color: c.text),
          titleMedium: AppTextStyles.itemTitle.copyWith(color: c.text),
          titleSmall: AppTextStyles.itemTitle.copyWith(
            fontSize: 13,
            color: c.text,
          ),
          bodyLarge: AppTextStyles.body.copyWith(color: c.text),
          bodyMedium: AppTextStyles.body.copyWith(color: c.text),
          bodySmall: AppTextStyles.supporting.copyWith(color: c.muted),
          labelLarge: AppTextStyles.action.copyWith(color: c.text),
          labelSmall: AppTextStyles.sectionLabel.copyWith(color: c.muted),
        )
        .apply(fontFamily: 'Montserrat');
    final controlShape = const RoundedRectangleBorder(
      borderRadius: AppGeometry.control,
    );
    final floatingShadowColor = dark
        ? AppShadows.darkFloating.first.color
        : AppShadows.lightFloating.first.color;
    OutlineInputBorder inputBorder(Color color, [double width = 1]) =>
        OutlineInputBorder(
          borderRadius: AppGeometry.control,
          borderSide: BorderSide(color: color, width: width),
        );
    final floatingShape = RoundedRectangleBorder(
      borderRadius: AppGeometry.menu,
      side: BorderSide(color: c.border),
    );
    return base.copyWith(
      extensions: [c, tokens],
      textTheme: typography,
      scaffoldBackgroundColor: c.page,
      hoverColor: c.hover,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: c.brand,
        selectionColor: c.brand.withValues(alpha: .3),
        selectionHandleColor: c.brand,
      ),
      appBarTheme: AppBarThemeData(
        backgroundColor: c.page,
        foregroundColor: c.text,
        surfaceTintColor: Colors.transparent,
        elevation: AppGeometry.elevation,
        scrolledUnderElevation: AppGeometry.elevation,
        centerTitle: false,
        titleTextStyle: typography.titleLarge,
        toolbarHeight: 48,
        shape: Border(bottom: BorderSide(color: c.border)),
      ),
      cardTheme: CardThemeData(
        color: c.surface,
        elevation: AppGeometry.elevation,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppGeometry.card,
          side: BorderSide(color: c.border),
        ),
      ),
      listTileTheme: ListTileThemeData(
        contentPadding: AppSpace.page,
        minVerticalPadding: AppSpace.md,
        minTileHeight: 44,
        shape: controlShape,
        titleTextStyle: typography.titleMedium,
        subtitleTextStyle: typography.bodySmall,
        iconColor: c.muted,
        textColor: c.text,
        selectedColor: c.brand,
        selectedTileColor: c.brandFill,
      ),
      inputDecorationTheme: InputDecorationThemeData(
        filled: true,
        fillColor: c.field,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.sm,
        ),
        errorMaxLines: 4,
        hintStyle: AppTextStyles.body.copyWith(color: c.muted),
        labelStyle: AppTextStyles.body.copyWith(color: c.muted),
        floatingLabelStyle: AppTextStyles.supporting.copyWith(color: c.muted),
        errorStyle: AppTextStyles.supporting.copyWith(color: c.danger),
        border: inputBorder(c.outline),
        enabledBorder: inputBorder(c.outline),
        disabledBorder: inputBorder(c.outline),
        focusedBorder: inputBorder(c.brand, AppGeometry.focusRingWidth),
        errorBorder: inputBorder(c.danger),
        focusedErrorBorder: inputBorder(c.danger, AppGeometry.focusRingWidth),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: c.brand,
          foregroundColor: c.onBrand,
          minimumSize: const Size(48, 40),
          shape: controlShape,
          textStyle: AppTextStyles.action,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.text,
          minimumSize: const Size(48, 40),
          shape: controlShape,
          side: BorderSide(color: c.border),
          textStyle: AppTextStyles.action,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.brand,
          minimumSize: const Size(48, 40),
          shape: controlShape,
          textStyle: AppTextStyles.action,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size.square(40),
          iconSize: AppIconSizes.field,
          shape: controlShape,
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: c.brand,
        foregroundColor: c.onBrand,
        elevation: AppGeometry.elevation,
        focusElevation: AppGeometry.elevation,
        hoverElevation: AppGeometry.elevation,
        highlightElevation: AppGeometry.elevation,
        shape: const RoundedRectangleBorder(borderRadius: AppGeometry.overlay),
      ),
      checkboxTheme: CheckboxThemeData(
        shape: const RoundedRectangleBorder(borderRadius: AppGeometry.checkbox),
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? c.brand
              : Colors.transparent,
        ),
        checkColor: WidgetStatePropertyAll(c.onBrand),
        side: WidgetStateBorderSide.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? BorderSide(color: c.brand, width: 1.5)
              : BorderSide(color: c.muted, width: 1.5),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: const RoundedRectangleBorder(borderRadius: AppGeometry.chip),
        side: BorderSide.none,
        backgroundColor: c.field,
        selectedColor: c.brandFill,
        disabledColor: c.field,
        checkmarkColor: c.brand,
        labelStyle: AppTextStyles.chip.copyWith(color: c.text),
        secondaryLabelStyle: AppTextStyles.chip.copyWith(color: c.brand),
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStatePropertyAll(controlShape),
          minimumSize: const WidgetStatePropertyAll(Size(48, 40)),
          textStyle: const WidgetStatePropertyAll(AppTextStyles.action),
          side: WidgetStatePropertyAll(BorderSide(color: c.border)),
          backgroundColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? c.brandFill
                : Colors.transparent,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (states) =>
                states.contains(WidgetState.selected) ? c.brand : c.text,
          ),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        indicator: UnderlineTabIndicator(
          borderSide: BorderSide(color: c.brand, width: kActiveTickWidth),
        ),
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: c.border,
        labelColor: c.brand,
        unselectedLabelColor: c.muted,
        labelStyle: AppTextStyles.action,
        unselectedLabelStyle: AppTextStyles.action,
      ),
      drawerTheme: DrawerThemeData(
        backgroundColor: c.field,
        surfaceTintColor: Colors.transparent,
        elevation: AppGeometry.elevation,
        width: 280,
        shape: const RoundedRectangleBorder(),
      ),
      dividerTheme: DividerThemeData(color: c.border, space: 1),
      dialogTheme: DialogThemeData(
        backgroundColor: c.floating,
        surfaceTintColor: Colors.transparent,
        shadowColor: floatingShadowColor,
        elevation: 8,
        shape: const RoundedRectangleBorder(borderRadius: AppGeometry.overlay),
        titleTextStyle: typography.titleLarge,
        contentTextStyle: typography.bodyMedium,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: c.floating,
        surfaceTintColor: Colors.transparent,
        shadowColor: floatingShadowColor,
        elevation: 8,
        shape: floatingShape,
        textStyle: typography.bodyMedium,
      ),
      menuTheme: MenuThemeData(
        style: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(c.floating),
          surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
          shadowColor: WidgetStatePropertyAll(floatingShadowColor),
          elevation: const WidgetStatePropertyAll(8),
          shape: WidgetStatePropertyAll(floatingShape),
        ),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: c.floating,
          borderRadius: AppGeometry.chip,
          border: Border.all(color: c.border),
        ),
        textStyle: AppTextStyles.supporting.copyWith(color: c.text),
      ),
      expansionTileTheme: ExpansionTileThemeData(
        shape: const Border(),
        collapsedShape: const Border(),
        textColor: c.text,
        collapsedTextColor: c.text,
        tilePadding: AppSpace.page,
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: c.brand,
        linearTrackColor: c.outline,
        linearMinHeight: 4,
        borderRadius: AppGeometry.chip,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: c.floating,
        contentTextStyle: typography.bodyMedium,
        actionTextColor: c.brand,
        elevation: 6,
        shape: RoundedRectangleBorder(
          borderRadius: AppGeometry.card,
          side: BorderSide(color: c.border),
        ),
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
