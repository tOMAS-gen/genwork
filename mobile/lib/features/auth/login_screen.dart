import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../data/repositories/auth_repository.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_inline_notice.dart';
import '../../shared/widgets/auth_card.dart';
import '../../shared/widgets/state_views.dart';

/// Login: abre el login web del servidor en el navegador del sistema (Google +
/// lista de acceso) y vuelve a la app por deep link.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Al agregar o elegir un servidor sin sesión el login abre solo, una vez:
    // tanto si esta pantalla recién se monta como si ya estaba abierta.
    ref.listenManual(sessionProvider, (_, next) {
      final s = next.value;
      if (s is SignedOut && s.autoLogin) _maybeAutoLogin();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAutoLogin());
  }

  void _maybeAutoLogin() {
    if (!mounted || _busy) return;
    // Consumir limpia el flag, así que esto no puede volver a dispararse.
    if (ref.read(sessionProvider.notifier).consumeAutoLogin()) _login();
  }

  Future<void> _login() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).login();
    } on LoginCancelled {
      // el usuario cerró el navegador
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).value;
    final server = session is SignedOut ? session.serverUrl.host : '';
    // Con el login automático pendiente ya se ve "Abriendo sesión…" (sin parpadeo).
    final busy = _busy || (session is SignedOut && session.autoLogin);

    return AuthCard(
      children: [
        FilledButton(
          key: const ValueKey('login_google'),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(AppSpacing.xxxl),
          ),
          onPressed: busy ? null : _login,
          child: Text(busy ? 'Abriendo sesión…' : 'Ingresar con Google'),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.sm),
          AppInlineNotice.error(message: _error!),
        ],
        const SizedBox(height: AppSpacing.md),
        const Divider(),
        const SizedBox(height: AppSpacing.xs),
        Text(
          server,
          textAlign: TextAlign.center,
          style: AppTextStyles.supporting.copyWith(color: context.colors.muted),
        ),
        TextButton(
          key: const ValueKey('login_change_server'),
          onPressed: busy ? null : () => context.push(Routes.servers),
          child: const Text('Cambiar servidor'),
        ),
      ],
    );
  }
}
