import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/repositories/settings_repository.dart';
import '../../shared/widgets/gen_tab_bar.dart';

/// Barra única de configuración, como `SettingsNav` de la web: las secciones
/// de la cuenta para todos y, para quien administra el sistema, las del
/// sistema. [current] es la sección activa (la clave de la tabla de abajo).
class SettingsTabs extends ConsumerWidget {
  const SettingsTabs({super.key, required this.current});

  final String current;

  static List<(String, String, String)> _items(bool admin) => [
    ('account', 'Mi cuenta', Routes.account),
    (
      SettingsSection.mcp.name,
      'Vincular con Claude',
      Routes.setting(SettingsSection.mcp.name),
    ),
    ('mobile', 'App móvil', Routes.mobileApp),
    if (admin) ...[
      ('home', 'Resumen', Routes.settings),
      (
        SettingsSection.access.name,
        'Acceso',
        Routes.setting(SettingsSection.access.name),
      ),
      (
        SettingsSection.users.name,
        'Usuarios',
        Routes.setting(SettingsSection.users.name),
      ),
      (
        SettingsSection.clients.name,
        'Clientes',
        Routes.setting(SettingsSection.clients.name),
      ),
      ('labels', 'Etiquetas', Routes.catalog('labels')),
      ('stages', 'Producción', Routes.catalog('stages')),
      ('statuses', 'Estados de tarea', Routes.catalog('statuses')),
      (
        SettingsSection.storage.name,
        'Almacenamiento',
        Routes.setting(SettingsSection.storage.name),
      ),
      (
        SettingsSection.reminders.name,
        'Recordatorios',
        Routes.setting(SettingsSection.reminders.name),
      ),
      (
        SettingsSection.errors.name,
        'Errores',
        Routes.setting(SettingsSection.errors.name),
      ),
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
