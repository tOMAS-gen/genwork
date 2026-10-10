import 'package:flutter/material.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../shared/widgets/page_intro.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: const Text('Más'),
      ),
      body: ListView(
        children: [
          const PageIntro(
            title: 'Todo en su lugar',
            subtitle: 'Tus avisos y los datos de tu cuenta.',
          ),
          ListTile(
            key: const ValueKey('more_reminders'),
            leading: const Icon(Icons.alarm),
            title: const Text('Recordatorios'),
            subtitle: const Text('Avisos y próximas fechas'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(Routes.reminders),
          ),
          ListTile(
            key: const ValueKey('more_account'),
            leading: const Icon(Icons.person_outline),
            title: const Text('Mi cuenta'),
            subtitle: const Text('Perfil, servidor y sesión'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(Routes.account),
          ),
        ],
      ),
    );
  }
}
