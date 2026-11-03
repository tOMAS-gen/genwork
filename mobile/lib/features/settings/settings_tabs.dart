import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/repositories/catalogs_repository.dart';
import '../../data/repositories/settings_repository.dart';
import '../../shared/widgets/gen_tab_bar.dart';

/// Barra única de configuración, como `SettingsNav` de la web: las secciones
/// de la cuenta para todos y, para quien administra el sistema, las del
/// sistema. [current] es la sección activa (la clave de la tabla de abajo).
class SettingsTabs extends ConsumerWidget {
  const SettingsTabs({super.key, required this.current});

  final String current;

  /// Cada pestaña lleva el mismo nombre que el título de su pantalla
  /// (P25-M4): por eso salen de las mismas fuentes.
  static List<(String, String, String)> _items(bool admin) => [
    ('account', 'Mi cuenta', Routes.account),
    (
      SettingsSection.mcp.name,
      SettingsSection.mcp.title,
      Routes.setting(SettingsSection.mcp.name),
    ),
    ('mobile', 'App móvil', Routes.mobileApp),
    if (admin) ...[
      ('home', 'Configuración', Routes.settings),
      for (final s in [
        SettingsSection.access,
        SettingsSection.users,
        SettingsSection.clients,
      ])
        (s.name, s.title, Routes.setting(s.name)),
      for (final k in CatalogKind.values)
        (k.name, k.title, Routes.catalog(k.name)),
      (
        SettingsSection.storage.name,
        SettingsSection.storage.title,
        Routes.setting(SettingsSection.storage.name),
      ),
      ('genstock', 'Integración con Genstock', Routes.genstock),
      for (final s in [SettingsSection.reminders, SettingsSection.errors])
        (s.name, s.title, Routes.setting(s.name)),
    ],
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final admin = ref.watch(currentUserProvider)?.isSuperAdmin == true;
    final items = _items(admin);
    return ColoredBox(
      key: const ValueKey('settings_tabs'),
      color: context.colors.page,
      child: GenTabBar(
        // Activa al centro y un degradado del lado con más pestañas
        // (P27-M2, P28L-M1).
        centerActive: true,
        edgeFadeColor: context.colors.page,
        activeIndex: items.indexWhere((i) => i.$1 == current),
        tabs: [for (final i in items) GenTabItem(label: i.$2)],
        onSelect: (index) {
          final target = items[index];
          if (target.$1 == current) return;
          // Pestañas: se reemplaza la sección, no se apila.
          context.pushReplacement(target.$3);
        },
      ),
    );
  }
}
