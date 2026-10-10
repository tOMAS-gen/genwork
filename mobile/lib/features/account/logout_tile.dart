import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../shared/widgets/state_views.dart';

class LogoutTile extends ConsumerStatefulWidget {
  const LogoutTile({super.key, required this.actionKey});
  final String actionKey;
  @override
  ConsumerState<LogoutTile> createState() => _LogoutTileState();
}

class _LogoutTileState extends ConsumerState<LogoutTile> {
  bool _busy = false;
  @override
  Widget build(BuildContext context) => ListTile(
    key: ValueKey(widget.actionKey),
    leading: Icon(Icons.logout, color: Theme.of(context).colorScheme.error),
    title: Text(_busy ? 'Cerrando sesión…' : 'Cerrar sesión'),
    onTap: _busy
        ? null
        : () async {
            setState(() => _busy = true);
            try {
              await ref.read(sessionProvider.notifier).logout();
            } catch (e) {
              if (context.mounted) showErrorSnack(context, e);
            } finally {
              if (mounted) setState(() => _busy = false);
            }
          },
  );
}
