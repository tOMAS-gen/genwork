import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/notifications/push_service.dart';
import '../../core/router/app_router.dart';
import '../../core/router/routes.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import 'notifications_providers.dart';

// With an action, Flutter keeps a SnackBar until dismissed; a notice must not
// outlive a logout or a server switch.
SnackBar newNoticeSnackBar(String serverName, VoidCallback onView) => SnackBar(
  content: Text('Nuevo aviso · $serverName'),
  action: SnackBarAction(label: 'Ver', onPressed: onView),
  persist: false,
);

class PushListener extends ConsumerStatefulWidget {
  const PushListener({super.key, required this.child});
  final Widget child;
  @override
  ConsumerState<PushListener> createState() => _State();
}

class _State extends ConsumerState<PushListener> {
  StreamSubscription<PushEvent>? _subscription;
  AppLifecycleListener? _lifecycle;
  final _seen = <String>{};
  bool _prompting = false;
  @override
  void initState() {
    super.initState();
    final service = ref.read(pushServiceProvider);
    _subscription = service?.events.listen(_event);
    _lifecycle = AppLifecycleListener(
      onResume: () {
        unawaited(service?.sync());
        _refresh();
      },
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final initial = service?.initialEvent;
      if (initial != null) {
        service!.initialEvent = null;
        unawaited(_event(initial));
      }
    });
  }

  void _refresh() {
    if (ref.read(sessionProvider).value is SignedIn) {
      ref.invalidate(notificationsProvider);
    }
  }

  Future<void> _event(PushEvent event) async {
    await ref.read(sessionProvider.future);
    if (!mounted) return;
    final profile = ref.read(serverRegistryProvider).byId(event.serverId);
    final stored = await ref.read(tokenStoreProvider).read(event.serverId);
    if (!mounted || profile == null || stored?.user.id != event.userId) return;
    if (event.open) {
      await ref.read(sessionProvider.notifier).select(event.serverId);
      if (!mounted) return;
      final current = ref.read(sessionProvider).value;
      if (current is! SignedIn ||
          current.user.id != event.userId ||
          current.serverUrl != profile.url) {
        return;
      }
      ref
          .read(routerProvider)
          .go(
            '${Routes.notifications}?open=${Uri.encodeQueryComponent(event.notificationId)}',
          );
      return;
    }
    if (!_seen.add('${event.serverId}:${event.eventId}')) return;
    if (_seen.length > 200) _seen.remove(_seen.first);
    _refresh();
    ScaffoldMessenger.of(context).showSnackBar(
      newNoticeSnackBar(
        profile.name,
        () => _event(
          PushEvent(
            event.serverId,
            event.userId,
            event.notificationId,
            event.eventId,
            true,
          ),
        ),
      ),
    );
  }

  Future<void> _prompt() async {
    final service = ref.read(pushServiceProvider);
    final session = ref.read(sessionProvider).value;
    if (_prompting ||
        service?.available != true ||
        (service!.prefs.getBool('push_explained') ?? false) ||
        session is! SignedIn ||
        session.user.isClient ||
        session.user.isReader) {
      return;
    }
    final navigator = ref
        .read(routerProvider)
        .routerDelegate
        .navigatorKey
        .currentContext;
    if (navigator == null) return;
    _prompting = true;
    try {
      // Remember the explanation too, so declining it doesn't prompt on every login.
      await service.prefs.setBool('push_explained', true);
      if (!navigator.mounted) return;
      final accepted = await showAppFormDialog<bool>(
        navigator,
        builder: (ctx) => AppWorkDialog(
          title: 'Recibí tus avisos',
          onClose: () => Navigator.pop(ctx, false),
          actions: [
            TextButton(
              key: const ValueKey('push_later'),
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Ahora no'),
            ),
            FilledButton(
              key: const ValueKey('push_enable'),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Activar'),
            ),
          ],
          child: const Text(
            'Genwork puede avisarte sobre recordatorios y tareas urgentes aunque la app esté cerrada.',
          ),
        ),
      );
      if (accepted == true) await service.requestPermission();
    } catch (_) {
      // Preferences provide an explicit retry if the platform is not ready.
    } finally {
      _prompting = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(sessionProvider, (_, next) {
      if (next.value is SignedIn) {
        unawaited(ref.read(pushServiceProvider)?.sync());
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) unawaited(_prompt());
        });
      }
    });
    return widget.child;
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _lifecycle?.dispose();
    super.dispose();
  }
}
