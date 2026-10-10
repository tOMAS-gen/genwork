// Portado de genstock: frontend/lib/shared/widgets/theme_toggle.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_icons.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/theme/theme_preference.dart';
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

/// Fila de preferencia "Apariencia": título, tema activo y el [ThemeToggle].
class ThemeToggleTile extends ConsumerWidget {
  const ThemeToggleTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(themePreferenceProvider);
    return ListTile(
      title: const Text('Apariencia'),
      subtitle: Text('Tema: ${_labelFor(current)}'),
      trailing: const ThemeToggle(),
    );
  }
}
