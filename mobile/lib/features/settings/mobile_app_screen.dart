import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/panel_section.dart';
import 'settings_tabs.dart';

/// "App móvil", como `/settings/movil` de la web: la dirección de este
/// sistema para vincular otro teléfono, con Copiar y los pasos. La web suma el
/// código QR; acá falta (pide una dependencia nueva, ver spec 066).
class MobileAppScreen extends ConsumerWidget {
  const MobileAppScreen({super.key});

  /// Como `isLocalOrigin` de la web: un teléfono no alcanza esta dirección.
  static bool isLocal(Uri uri) =>
      uri.host == 'localhost' ||
      uri.host == '127.0.0.1' ||
      uri.host == '10.0.2.2' ||
      uri.host.endsWith('.local');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final session = ref.watch(sessionProvider).value;
    final server = session is SignedIn ? session.serverUrl : null;
    final origin = server == null
        ? ''
        : server.toString().replaceAll(RegExp(r'/$'), '');
    final muted = AppTextStyles.body.copyWith(color: c.muted);
    return GenPageScaffold(
      title: 'App móvil',
      subtitle:
          'Escaneá este código con la app de Genwork para conectarla a este sistema.',
      icon: AppIcons.settings,
      showBack: true,
      top: const SettingsTabs(current: 'mobile'),
      body: ListView(
        key: const ValueKey('mobile_app'),
        children: [
          if (server != null && isLocal(server)) ...[
            Text(
              'La dirección configurada ($origin) es local: un teléfono no podrá alcanzarla. '
              'Definí NEXTAUTH_URL con la dirección pública del sistema.',
              key: const ValueKey('mobile_app_local'),
              style: muted,
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          Text('Dirección de este sistema', style: muted),
          const SizedBox(height: AppSpacing.xs),
          CopyField(
            value: origin,
            buttonKey: const ValueKey('mobile_app_copy'),
            onCopy: () {
              Clipboard.setData(ClipboardData(text: origin));
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('Copiado')));
            },
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            '1. Instalá la app de Genwork en el teléfono.\n'
            '2. En el primer inicio, elegí «Escanear QR» y apuntá a este código.\n'
            '3. Ingresá con tu cuenta de Google. Para sumar otro sistema, usá «Agregar servidor» en la app.',
            style: muted,
          ),
        ],
      ),
    );
  }
}
