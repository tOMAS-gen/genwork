import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import 'logout_tile.dart';
import 'package:flutter/material.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider).value;
    if (session is! SignedIn) return const SizedBox.shrink();
    final user = session.user;

    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: const Text('Mi cuenta'),
      ),
      body: ListView(
        padding: AppSpace.page,
        children: [
          ListTile(
            // Decorativo: el nombre se lee al lado.
            leading: ExcludeSemantics(
              child: CircleAvatar(
                foregroundImage: user.image == null
                    ? null
                    : NetworkImage(user.image!),
                onForegroundImageError: user.image == null ? null : (_, _) {},
                child: Text(
                  user.name.isEmpty ? '?' : user.name[0].toUpperCase(),
                ),
              ),
            ),
            title: Text(user.name),
            subtitle: Text(user.email),
          ),
          ListTile(
            leading: const Icon(Icons.dns_outlined),
            title: const Text('Servidor'),
            subtitle: Text(session.serverUrl.toString()),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('genwork'),
            subtitle: Text('Versión 1.0.0 (1)'),
          ),
          ListTile(
            key: const ValueKey('account_settings'),
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Configuración'),
            subtitle: const Text('Tema, almacenamiento y opciones del sistema'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(Routes.settings),
          ),
          const SizedBox(height: AppSpace.xl),
          const LogoutTile(actionKey: 'account_logout'),
        ],
      ),
    );
  }
}
