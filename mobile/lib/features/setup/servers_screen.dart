import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/servers/server_profile.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';

/// Servidores guardados en este teléfono: tocar uno cambia a ese sistema (con su
/// propia sesión, sin volver a ingresar); «Agregar servidor» pide otro QR.
class ServersScreen extends ConsumerWidget {
  const ServersScreen({super.key});

  Uri? _activeUrl(SessionState? s) => switch (s) {
    SignedIn(:final serverUrl) => serverUrl,
    SignedOut(:final serverUrl) => serverUrl,
    _ => null,
  };

  Future<void> _switch(BuildContext context, WidgetRef ref, ServerProfile p) async {
    try {
      await ref.read(sessionProvider.notifier).switchServer(p.id);
      // Si el router se recreó (otra sesión), este contexto ya no existe.
      if (context.mounted) context.go(Routes.myDay);
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _remove(BuildContext context, WidgetRef ref, ServerProfile p) =>
      confirmAction(
        context,
        title: 'Quitar servidor',
        message:
            'Se cierra la sesión en este teléfono y se olvida «${p.name}». '
            'Podés volver a vincularlo con su QR.',
        confirmLabel: 'Quitar',
        danger: true,
        onConfirm: () => ref.read(sessionProvider.notifier).removeServer(p.id),
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profiles = ref.watch(serverListProvider);
    final activeUrl = _activeUrl(ref.watch(sessionProvider).value);
    final c = context.colors;

    return Scaffold(
      appBar: AppBar(title: const Text('Servidores')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            WorkspaceListPanel(
              children: [
                for (final p in profiles)
                  ListTile(
                    key: ValueKey('server_${p.id}'),
                    leading: Icon(
                      p.url == activeUrl ? AppIcons.success : AppIcons.server,
                      color: p.url == activeUrl ? c.brand : c.muted,
                    ),
                    title: Text(p.name),
                    subtitle: Text(
                      p.url.toString(),
                      style: AppTextStyles.technical.copyWith(color: c.muted),
                    ),
                    trailing: IconButton(
                      key: ValueKey('server_remove_${p.id}'),
                      tooltip: 'Quitar ${p.name}',
                      icon: const Icon(AppIcons.delete),
                      onPressed: () => _remove(context, ref, p),
                    ),
                    onTap: p.url == activeUrl
                        ? () => context.canPop() ? context.pop() : context.go(Routes.myDay)
                        : () => _switch(context, ref, p),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            FilledButton.icon(
              key: const ValueKey('servers_add'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(AppSpacing.xxxl),
              ),
              onPressed: () => context.push(Routes.addServer),
              icon: const Icon(AppIcons.qrScanner),
              label: const Text('Agregar servidor'),
            ),
          ],
        ),
      ),
    );
  }
}
