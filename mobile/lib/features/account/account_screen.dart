import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/workspace_panel.dart';
import 'logout_tile.dart';

/// Radio del avatar de la cuenta (48 px de diámetro).
const double _avatarRadius = 24;

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider).value;
    if (session is! SignedIn) return const SizedBox.shrink();
    final user = session.user;
    final c = context.colors;

    return GenPageScaffold(
      title: 'Mi cuenta',
      subtitle: 'Perfil, servidor y sesión.',
      icon: AppIcons.person,
      showThemeToggle: user.isClient || user.isReader,
      bodyPadding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          WorkspaceListPanel(
            children: [
              ListTile(
                // Decorativo: el nombre se lee al lado.
                leading: ExcludeSemantics(
                  child: CircleAvatar(
                    radius: _avatarRadius,
                    backgroundColor: c.brand,
                    foregroundColor: c.onBrand,
                    foregroundImage: user.image == null
                        ? null
                        : NetworkImage(user.image!),
                    onForegroundImageError: user.image == null
                        ? null
                        : (_, _) {},
                    child: Text(
                      user.name.isEmpty ? '?' : user.name[0].toUpperCase(),
                      style: AppTextStyles.dialogTitle.copyWith(
                        color: c.onBrand,
                      ),
                    ),
                  ),
                ),
                title: Text(user.name),
                subtitle: Text(user.email),
              ),
              ListTile(
                leading: const Icon(AppIcons.server),
                title: const Text('Servidor'),
                subtitle: Text(
                  session.serverUrl.toString(),
                  style: AppTextStyles.technical.copyWith(color: c.muted),
                ),
              ),
              const ListTile(
                leading: Icon(AppIcons.info),
                title: Text('genwork'),
                subtitle: Text('Versión 1.0.0 (1)'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          WorkspaceListPanel(
            children: [
              if (user.isWriter)
                ListTile(
                  key: const ValueKey('account_settings'),
                  leading: const Icon(AppIcons.settings),
                  title: const Text('Configuración'),
                  subtitle: const Text(
                    'Tema, almacenamiento y opciones del sistema',
                  ),
                  trailing: Icon(
                    AppIcons.chevronRight,
                    size: AppIconSizes.action,
                    color: c.muted,
                  ),
                  onTap: () => context.push(Routes.settings),
                ),
              const LogoutTile(actionKey: 'account_logout'),
            ],
          ),
        ],
      ),
    );
  }
}
