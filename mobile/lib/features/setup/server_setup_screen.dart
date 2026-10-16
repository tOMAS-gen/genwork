import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session_controller.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/servers/connect_payload.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_inline_notice.dart';
import '../../shared/widgets/auth_card.dart';
import '../../shared/widgets/state_views.dart';
import 'qr_scanner_view.dart';

/// Cómo mostrar el QR en la web. Se ve debajo del visor de cámara.
class _QrInstructions extends StatelessWidget {
  const _QrInstructions();

  static const _steps = [
    'En una computadora, abrí genwork e ingresá a tu sistema.',
    'Andá a Configuración › App móvil.',
    'Apuntá la cámara al código QR que aparece en pantalla.',
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      key: const ValueKey('setup_qr_instructions'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Cómo conseguir el código',
          style: AppTextStyles.supporting.copyWith(
            color: c.text,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: AppSpacing.xxs),
        for (var i = 0; i < _steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.xxs),
            child: Text(
              '${i + 1}. ${_steps[i]}',
              style: AppTextStyles.supporting.copyWith(color: c.muted),
            ),
          ),
      ],
    );
  }
}

/// Alta de servidor. Primer inicio (`/setup`) o «Agregar servidor» (`/servers/add`):
/// se escanea el QR de «Configuración › App móvil» de la web, o se escribe la
/// dirección a mano. Se valida contra `/api/auth/mobile/info`, se guarda y se abre
/// directo el login del navegador de ese servidor (sin pantalla intermedia).
/// Cancelado o fallido, el servidor queda guardado «Sin sesión» en la lista.
class ServerSetupScreen extends ConsumerStatefulWidget {
  const ServerSetupScreen({super.key, this.canGoBack = false});

  /// True cuando ya hay servidores guardados y se puede volver a la lista.
  final bool canGoBack;

  @override
  ConsumerState<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends ConsumerState<ServerSetupScreen> {
  final _controller = TextEditingController();
  bool _manual = false;
  bool _checking = false;
  String? _error;
  String? _connectingTo;
  bool _openingBrowser = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _connect(Uri url) async {
    if (_checking) return; // el escáner dispara la misma lectura varias veces
    setState(() {
      _checking = true;
      _openingBrowser = false;
      _error = null;
      _connectingTo = url.host;
    });
    final messenger = ScaffoldMessenger.maybeOf(context);
    final colors = context.colors;
    var browser = false; // ya validado y guardado: se abrió el navegador
    try {
      final result = await ref
          .read(sessionProvider.notifier)
          .connect(
            url.toString(),
            onBrowser: () {
              browser = true;
              if (mounted) setState(() => _openingBrowser = true);
            },
          );
      // Deja que el router procese el cambio de sesión antes de navegar: si no,
      // su refresco pendiente vuelve a apilar esta pantalla.
      await WidgetsBinding.instance.endOfFrame;
      if (!mounted) return;
      if (result == ConnectResult.signedIn) {
        // En el primer inicio redirige el router; desde «Agregar servidor» se
        // entra a la app.
        if (widget.canGoBack) context.go(Routes.myDay);
      } else if (widget.canGoBack) {
        // Navegador cancelado: el servidor quedó guardado, volver a la lista.
        context.canPop() ? context.pop() : context.go(Routes.servers);
      }
      // En el primer inicio, cancelar deja SignedOut y el router lleva a la lista.
    } catch (e) {
      if (!browser) {
        // No se pudo validar el servidor: nada guardado, el aviso va acá.
        if (mounted) setState(() => _error = errorMessage(e));
      } else {
        // Falló el login: el servidor quedó guardado y se termina en la lista.
        messenger?.showSnackBar(errorSnackBar(colors, e));
        await WidgetsBinding.instance.endOfFrame;
        if (mounted && widget.canGoBack) {
          context.canPop() ? context.pop() : context.go(Routes.servers);
        }
      }
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  void _onCode(String raw) {
    if (_checking) return;
    final url = parseConnectPayload(raw);
    if (url == null) {
      setState(() => _error = 'No es un QR de genwork.');
      return;
    }
    _connect(url);
  }

  void _submitManual() {
    final url = parseConnectPayload(_controller.text);
    if (url == null) {
      setState(
        () => _error = 'Ingresá una dirección válida, ej. work.empresa.com',
      );
      return;
    }
    _connect(url);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Con el escáner va justo debajo del visor; escribiendo, debajo del botón.
    final modeToggle = TextButton.icon(
      key: ValueKey(_manual ? 'setup_scan_toggle' : 'setup_manual_toggle'),
      onPressed: _checking
          ? null
          : () => setState(() {
              _manual = !_manual;
              _error = null;
            }),
      icon: Icon(_manual ? AppIcons.qrScanner : AppIcons.keyboard),
      label: Text(_manual ? 'Escanear QR' : 'Escribir dirección a mano'),
    );
    return AuthCard(
      children: [
        Text(
          _manual
              ? 'Ingresá la dirección de tu sistema'
              : 'Escaneá el QR de tu sistema',
          textAlign: TextAlign.center,
          style: AppTextStyles.body.copyWith(color: c.text),
        ),
        if (_manual) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            'La encontrás en Configuración › App móvil de la web, o en la barra del navegador.',
            textAlign: TextAlign.center,
            style: AppTextStyles.supporting.copyWith(color: c.muted),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        if (_manual) ...[
          TextField(
            key: const ValueKey('setup_url_field'),
            controller: _controller,
            enabled: !_checking,
            enableSuggestions: false,
            keyboardType: TextInputType.url,
            autocorrect: false,
            textInputAction: TextInputAction.go,
            onSubmitted: (_) => _submitManual(),
            decoration: const InputDecoration(
              labelText: 'URL del sistema',
              hintText: 'work.empresa.com',
            ),
          ),
        ] else ...[
          ref.watch(qrScannerBuilderProvider)(context, _onCode),
          const SizedBox(height: AppSpacing.xs),
          modeToggle,
          const SizedBox(height: AppSpacing.xs),
          const _QrInstructions(),
        ],
        if (_checking && _connectingTo != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            _openingBrowser
                ? 'Abriendo el navegador…'
                : 'Conectando con $_connectingTo…',
            key: const ValueKey('setup_busy'),
            textAlign: TextAlign.center,
            style: AppTextStyles.supporting.copyWith(color: c.muted),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.sm),
          AppInlineNotice.error(message: _error!),
        ],
        const SizedBox(height: AppSpacing.md),
        if (_manual)
          FilledButton(
            key: const ValueKey('setup_continue'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(AppSpacing.xxxl),
            ),
            onPressed: _checking ? null : _submitManual,
            child: _checking
                ? const Text('Verificando conexión…')
                : const Text('Continuar'),
          ),
        if (_manual) modeToggle,
        if (widget.canGoBack)
          TextButton(
            key: const ValueKey('setup_back'),
            onPressed: _checking ? null : () => context.pop(),
            child: const Text('Cancelar'),
          ),
      ],
    );
  }
}
