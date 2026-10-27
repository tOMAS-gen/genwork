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
import '../../shared/widgets/settings_rows.dart';
import 'logout_tile.dart';
import '../../data/repositories/settings_repository.dart';
import '../settings/settings_tabs.dart';

/// Radio del avatar de la cuenta: 40 dp, la columna de íconos de las filas.
const double _avatarRadius = 20;

/// Versión que muestra la app (como `pubspec.yaml`).
const String _version = '1.0.0 (1)';

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
      subtitle: 'Almacenamiento vinculado, versión y estado del sistema.',
      top: user.isWriter ? const SettingsTabs(current: 'account') : null,
      showThemeToggle: user.isClient || user.isReader,
      bodyPadding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          // Perfil, servidor y versión en un solo grupo de filas de 56–64 dp,
          // con el texto en la misma columna (P23-M1, P23-M3).
          SettingsGroup(
            children: [
              SettingsRow(
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
                title: user.name,
                subtitle: user.email,
              ),
              SettingsRow(
                icon: AppIcons.server,
                title: 'Servidor',
                subtitle: session.serverUrl.toString(),
                technicalSubtitle: true,
              ),
              SettingsRow(
                key: const ValueKey('account_servers'),
                icon: AppIcons.qrScanner,
                title: 'Servidores',
                subtitle: () {
                  final n = ref.watch(serverListProvider).length;
                  return '$n ${n == 1 ? 'vinculado' : 'vinculados'} · cambiar o agregar';
                }(),
                onTap: () => context.push(Routes.servers),
              ),
              // La versión una sola vez: con Sistema si se puede abrir
              // (P23-M4).
              if (user.isWriter)
                SettingsRow(
                  key: ValueKey('account_${SettingsSection.system.name}'),
                  icon: AppIcons.info,
                  title: '${SettingsSection.system.title} · v$_version',
                  subtitle: 'Entorno y estado de la nube',
                  onTap: () =>
                      context.push(Routes.setting(SettingsSection.system.name)),
                )
              else
                const SettingsRow(
                  icon: AppIcons.info,
                  title: 'genwork',
                  subtitle: 'Versión $_version',
                ),
            ],
          ),
          // Como la web: Cuenta de almacenamiento dentro de Mi cuenta.
          if (user.isWriter) ...[
            const SizedBox(height: AppSpacing.md),
            SettingsGroup(
              children: [
                SettingsRow(
                  key: ValueKey('account_${SettingsSection.storageLink.name}'),
                  icon: AppIcons.cloud,
                  title: SettingsSection.storageLink.title,
                  subtitle:
                      'Vinculá tu cuenta de Nextcloud para acceder a tus archivos con tus propios permisos.',
                  onTap: () => context.push(
                    Routes.setting(SettingsSection.storageLink.name),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          SettingsGroup(
            children: [
              if (user.isWriter)
                SettingsRow(
                  key: const ValueKey('account_settings'),
                  icon: AppIcons.settings,
                  title: 'Configuración',
                  subtitle: 'Tema, almacenamiento y opciones del sistema',
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
