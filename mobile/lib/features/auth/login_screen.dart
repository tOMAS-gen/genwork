import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../data/repositories/auth_repository.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/page_intro.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/error_text.dart';

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

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AppSpace.contentMax),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpace.xl),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const BrandHeader(
                    title: 'Tu equipo,\na mano.',
                    subtitle:
                        'Proyectos, tareas y recordatorios. Todo listo para seguir tu día.',
                  ),
                  const SizedBox(height: AppSpace.sm),
                  Text(server, textAlign: TextAlign.center),
                  const SizedBox(height: AppSpace.xl),
                  FilledButton.icon(
                    key: const ValueKey('login_google'),
                    onPressed: _busy ? null : _login,
                    icon: const Icon(Icons.login),
                    label: Text(
                      _busy ? 'Abriendo sesión…' : 'Ingresar con Google',
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: AppSpace.md),
                    ErrorText(_error!, textAlign: TextAlign.center),
                  ],
                  const SizedBox(height: AppSpace.xl),
                  TextButton(
                    key: const ValueKey('login_change_server'),
                    onPressed: _busy
                        ? null
                        : () =>
                              ref.read(sessionProvider.notifier).changeServer(),
                    child: const Text('Cambiar servidor'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
