// Portado de genstock: frontend/lib/shared/widgets/theme_toggle.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/theme/theme_preference.dart';
import 'settings_rows.dart';
import 'state_views.dart';

IconData _iconFor(ThemeMode mode) => switch (mode) {
  ThemeMode.system => AppIcons.themeSystem,
  ThemeMode.light => AppIcons.themeLight,
  ThemeMode.dark => AppIcons.themeDark,
};

String _labelFor(ThemeMode mode) => switch (mode) {
  ThemeMode.light => 'Claro',
  ThemeMode.dark => 'Oscuro',
  ThemeMode.system => 'Sistema',
};

/// Control segmentado de tres opciones: sistema · claro · oscuro.
///
/// Sin fondo propio. La opción activa se distingue por el color de marca del
/// ícono; las demás quedan en `muted`. Cada opción mide al menos
/// [kMinInteractiveDimension] (objetivo táctil móvil).
class ThemeToggle extends ConsumerWidget {
  const ThemeToggle({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(themePreferenceProvider);
    final c = context.colors;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final mode in ThemeMode.values)
          SizedBox.square(
            dimension: kMinInteractiveDimension,
            child: IconButton(
              key: ValueKey('theme_${mode.name}'),
              tooltip: _labelFor(mode),
              isSelected: mode == current,
              onPressed: () async {
                try {
                  await ref
                      .read(themePreferenceProvider.notifier)
                      .setMode(mode);
                } catch (e) {
                  if (context.mounted) showErrorSnack(context, e);
                }
              },
              style: IconButton.styleFrom(
                minimumSize: const Size.square(kMinInteractiveDimension),
                maximumSize: const Size.square(kMinInteractiveDimension),
                padding: EdgeInsets.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              icon: Icon(
                _iconFor(mode),
                color: mode == current ? c.brand : c.muted,
              ),
            ),
          ),
      ],
    );
  }
}

/// Alto visual del segmentado del tema (P25-M3); el área táctil sigue siendo
/// de 48.
const double _segmentHeight = 32;

/// Ancho de cada opción del segmentado del tema.
const double _segmentWidth = 44;

/// Segmentado de tres opciones (sistema · claro · oscuro) con borde `outline`
/// y la activa sobre el acento al 12 % (P25-M3). Sin check: la activa se lee
/// por el relleno y el color del ícono. Se ve de 32 dp, pero cada opción
/// responde en 48 (objetivo táctil móvil).
class ThemeSegmented extends ConsumerWidget {
  const ThemeSegmented({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(themePreferenceProvider);
    final c = context.colors;
    return SizedBox(
      key: const ValueKey('theme_segmented'),
      height: kMinInteractiveDimension,
      width: _segmentWidth * ThemeMode.values.length,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // El marco de 32 dp, detrás de las tres opciones.
          Container(
            height: _segmentHeight,
            decoration: BoxDecoration(
              border: Border.all(color: c.outline),
              borderRadius: AppGeometry.control,
            ),
          ),
          Row(
            children: [
              for (final mode in ThemeMode.values)
                Semantics(
                  button: true,
                  selected: mode == current,
                  label: _labelFor(mode),
                  excludeSemantics: true,
                  child: InkWell(
                    key: ValueKey('theme_${mode.name}'),
                    onTap: () async {
                      try {
                        await ref
                            .read(themePreferenceProvider.notifier)
                            .setMode(mode);
                      } catch (e) {
                        if (context.mounted) showErrorSnack(context, e);
                      }
                    },
                    child: SizedBox(
                      width: _segmentWidth,
                      height: kMinInteractiveDimension,
                      child: Center(
                        child: Container(
                          height: _segmentHeight - 2,
                          width: _segmentWidth - 2,
                          decoration: BoxDecoration(
                            color: mode == current
                                ? c.brand.withValues(alpha: .12)
                                : null,
                            borderRadius: AppGeometry.control,
                          ),
                          child: Icon(
                            _iconFor(mode),
                            size: AppIconSizes.field,
                            color: mode == current ? c.brand : c.muted,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Fila de preferencia "Apariencia" con el [ThemeSegmented]: una fila de
/// ajuste de 56 dp. El tema activo lo dice el control, no un subtítulo
/// (P25-M3).
class ThemeToggleTile extends StatelessWidget {
  const ThemeToggleTile({super.key});

  @override
  Widget build(BuildContext context) => const SettingsRow(
    icon: AppIcons.appearance,
    title: 'Apariencia',
    trailing: ThemeSegmented(),
  );
}
