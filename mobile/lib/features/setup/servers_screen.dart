import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/auth/session_controller.dart';
import '../../core/auth/token_store.dart';
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
import 'servers_providers.dart';

/// Servidores guardados en este teléfono, cada uno con su estado de sesión.
/// Tocar uno con sesión entra directo; sin sesión abre el login del navegador
/// de ese servidor en el lugar. «Agregar servidor» pide otro QR. Es también
/// donde cae la app sin sesión (arranque sin token, 401, cerrar sesión).
class ServersScreen extends ConsumerStatefulWidget {
  const ServersScreen({super.key});

  @override
  ConsumerState<ServersScreen> createState() => _ServersScreenState();
}

class _ServersScreenState extends ConsumerState<ServersScreen> {
  /// Servidor cuyo login está en curso: bloquea los toques (sin doble lanzamiento).
  String? _busyId;

  @override
  void initState() {
    super.initState();
    // Arranque sin token o 401: el login del servidor activo abre solo, una vez,
    // tanto si esta pantalla recién se monta como si ya estaba abierta.
    ref.listenManual(sessionProvider, (_, next) {
      final s = next.value;
      if (s is SignedOut && s.autoLogin) _maybeAutoLogin();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAutoLogin());
  }

  void _maybeAutoLogin() {
    if (!mounted || _busyId != null) return;
    final s = ref.read(sessionProvider).value;
    if (s is! SignedOut) return;
    final notifier = ref.read(sessionProvider.notifier);
    // Consumir limpia el flag, así que esto no puede volver a dispararse.
    if (notifier.consumeAutoLogin()) {
      _run(ServerProfile.idFor(s.serverUrl), notifier.loginActive);
    }
  }

  Future<void> _run(String id, Future<ConnectResult> Function() action) async {
    if (_busyId != null) return;
    setState(() => _busyId = id);
    try {
      final result = await action();
      if (result != ConnectResult.signedIn) return;
      // Deja que el router procese el cambio de sesión antes de navegar. Si se
      // recreó (otra sesión), este contexto ya no existe y él mismo entra.
      await WidgetsBinding.instance.endOfFrame;
      if (mounted) context.go(Routes.myDay);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Uri? _activeUrl(SessionState? s) => switch (s) {
    SignedIn(:final serverUrl) => serverUrl,
    SignedOut(:final serverUrl) => serverUrl,
    _ => null,
  };

  void _tap(ServerProfile p, SessionState? session) {
    // El servidor en uso, con sesión: solo volver a la app.
    if (session is SignedIn && session.serverUrl == p.url) {
      context.canPop() ? context.pop() : context.go(Routes.myDay);
      return;
    }
    _run(p.id, () => ref.read(sessionProvider.notifier).select(p.id));
  }

  Future<void> _remove(ServerProfile p) => confirmAction(
    context,
    title: 'Quitar servidor',
    message:
        'Se cierra la sesión en este teléfono y se olvida «${p.name}». '
        'Podés volver a vincularlo con su QR.',
    confirmLabel: 'Quitar',
    danger: true,
    onConfirm: () => ref.read(sessionProvider.notifier).removeServer(p.id),
  );

  String? _sessionLabel(
    ServerProfile p,
    Map<String, StoredSession?>? sessions,
  ) {
    if (_busyId == p.id) return 'Abriendo el navegador…';
    if (sessions == null || !sessions.containsKey(p.id)) return null;
    final stored = sessions[p.id];
    return stored == null
        ? 'Sin sesión'
        : 'Sesión iniciada · ${stored.user.email}';
  }

  Widget _tile(
    ServerProfile p,
    SessionState? session,
    Uri? activeUrl,
    Map<String, StoredSession?>? sessions,
  ) {
    final c = context.colors;
    final busy = _busyId != null;
    final label = _sessionLabel(p, sessions);
    final signedIn = sessions?[p.id] != null && _busyId != p.id;
    final active = p.url == activeUrl;
    return ListTile(
      key: ValueKey('server_${p.id}'),
      leading: Icon(
        active ? AppIcons.success : AppIcons.server,
        color: active ? c.brand : c.muted,
      ),
      title: Text(p.name),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            p.url.toString(),
            style: AppTextStyles.technical.copyWith(color: c.muted),
          ),
          if (label != null)
            Text(
              label,
              key: ValueKey('server_session_${p.id}'),
              style: AppTextStyles.supporting.copyWith(
                color: signedIn ? c.text : c.muted,
              ),
            ),
        ],
      ),
      trailing: IconButton(
        key: ValueKey('server_remove_${p.id}'),
        tooltip: 'Quitar ${p.name}',
        icon: const Icon(AppIcons.delete),
        onPressed: busy ? null : () => _remove(p),
      ),
      onTap: busy ? null : () => _tap(p, session),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profiles = ref.watch(serverListProvider);
    final session = ref.watch(sessionProvider).value;
    final sessions = ref.watch(serverSessionsProvider).value;
    final activeUrl = _activeUrl(session);
    final busy = _busyId != null;

    return Scaffold(
      appBar: AppBar(title: const Text('Servidores')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            WorkspaceListPanel(
              children: [
                for (final p in profiles)
                  _tile(p, session, activeUrl, sessions),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            FilledButton.icon(
              key: const ValueKey('servers_add'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(AppSpacing.xxxl),
              ),
              onPressed: busy ? null : () => context.push(Routes.addServer),
              icon: const Icon(AppIcons.qrScanner),
              label: const Text('Agregar servidor'),
            ),
          ],
        ),
      ),
    );
  }
}
