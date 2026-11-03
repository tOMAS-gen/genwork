import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/panel_section.dart';
import 'settings_tabs.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/servers/connect_payload.dart';
import '../../shared/widgets/app_inline_notice.dart';
import '../../shared/widgets/numbered_steps.dart';
import '../../shared/widgets/workspace_panel.dart';

/// "App móvil", como `/settings/movil` de la web: el QR con la dirección de
/// este sistema para vincular otro teléfono, Copiar y los pasos.
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
    return GenPageScaffold(
      title: 'App móvil',
      subtitle:
          'Escaneá este código con la app de Genwork para conectarla a este sistema.',
      showBack: true,
      top: const SettingsTabs(current: 'mobile'),
      body: ListView(
        key: const ValueKey('mobile_app'),
        children: [
          if (server != null && isLocal(server)) ...[
            AppInlineNotice.warning(
              key: const ValueKey('mobile_app_local'),
              message:
                  'La dirección configurada ($origin) es local: un teléfono no podrá alcanzarla. '
                  'Definí NEXTAUTH_URL con la dirección pública del sistema.',
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          // QR, dirección y pasos en una sola card (P24b-M2, P24b-M3).
          WorkspacePanel(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (origin.isNotEmpty) ...[
                  Center(
                    child: Semantics(
                      label: 'Código QR para conectar la app a $origin',
                      image: true,
                      child: ConnectQr(
                        key: const ValueKey('mobile_app_qr'),
                        origin: origin,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
                Text(
                  'DIRECCIÓN DE ESTE SISTEMA',
                  style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
                ),
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
                Divider(height: 1, thickness: 1, color: c.border),
                const SizedBox(height: AppSpacing.md),
                const NumberedSteps(
                  keyPrefix: 'mobile_app_step',
                  steps: [
                    'Instalá la app de Genwork en el teléfono.',
                    'En el primer inicio, elegí «Escanear QR» y apuntá a este código.',
                    'Ingresá con tu cuenta de Google. Para sumar otro sistema, usá «Agregar servidor» en la app.',
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Lado del código QR (P24b-M3).
const double _qrSize = 200;

/// QR de vínculo: `genwork://connect?server=<origen>`, con corrección de
/// errores media como la web. Oscuro sobre claro también en el tema oscuro:
/// así lo leen todas las cámaras.
class ConnectQr extends StatelessWidget {
  const ConnectQr({super.key, required this.origin});

  final String origin;

  /// Lo que codifica el QR.
  String get payload => buildConnectPayload(origin);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(AppSpacing.xs),
    decoration: BoxDecoration(
      color: GenColors.light.surface,
      borderRadius: AppGeometry.control,
    ),
    child: QrImageView(
      data: payload,
      size: _qrSize,
      padding: EdgeInsets.zero,
      errorCorrectionLevel: QrErrorCorrectLevel.M,
      backgroundColor: GenColors.light.surface,
      eyeStyle: QrEyeStyle(
        eyeShape: QrEyeShape.square,
        color: GenColors.light.text,
      ),
      dataModuleStyle: QrDataModuleStyle(
        dataModuleShape: QrDataModuleShape.square,
        color: GenColors.light.text,
      ),
    ),
  );
}
