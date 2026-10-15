import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_inline_notice.dart';
import '../../shared/widgets/auth_card.dart';
import '../../shared/widgets/state_views.dart';

/// Primer inicio: el usuario indica la URL de su genwork. Se valida contra
/// `/api/auth/mobile/info` y se guarda; después sigue el login con Google.
class ServerSetupScreen extends ConsumerStatefulWidget {
  const ServerSetupScreen({super.key});

  @override
  ConsumerState<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends ConsumerState<ServerSetupScreen> {
  final _controller = TextEditingController();
  bool _checking = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_checking) return;
    setState(() {
      _checking = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).addServer(_controller.text);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthCard(
      children: [
        Text(
          'Ingresá la dirección de tu sistema',
          textAlign: TextAlign.center,
          style: AppTextStyles.body.copyWith(color: context.colors.text),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          key: const ValueKey('setup_url_field'),
          controller: _controller,
          enabled: !_checking,
          enableSuggestions: false,
          keyboardType: TextInputType.url,
          autocorrect: false,
          textInputAction: TextInputAction.go,
          onSubmitted: (_) => _submit(),
          decoration: const InputDecoration(
            labelText: 'URL del sistema',
            hintText: 'work.empresa.com',
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.sm),
          AppInlineNotice.error(message: _error!),
        ],
        const SizedBox(height: AppSpacing.md),
        FilledButton(
          key: const ValueKey('setup_continue'),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(AppSpacing.xxxl),
          ),
          onPressed: _checking ? null : _submit,
          child: _checking
              ? const Text('Verificando conexión…')
              : const Text('Continuar'),
        ),
      ],
    );
  }
}
