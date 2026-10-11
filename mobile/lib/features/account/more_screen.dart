import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/workspace_panel.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget chevron() =>
        Icon(AppIcons.chevronRight, size: AppIconSizes.action, color: c.muted);
    return GenPageScaffold(
      title: 'Todo en su lugar',
      subtitle: 'Tus avisos y los datos de tu cuenta.',
      icon: AppIcons.settings,
      bodyPadding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          WorkspaceListPanel(
            children: [
              ListTile(
                key: const ValueKey('more_reminders'),
                leading: const Icon(AppIcons.alarm),
                title: const Text('Recordatorios'),
                subtitle: const Text('Avisos y próximas fechas'),
                trailing: chevron(),
                onTap: () => context.push(Routes.reminders),
              ),
              ListTile(
                key: const ValueKey('more_account'),
                leading: const Icon(AppIcons.person),
                title: const Text('Mi cuenta'),
                subtitle: const Text('Perfil, servidor y sesión'),
                trailing: chevron(),
                onTap: () => context.push(Routes.account),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
