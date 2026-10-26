import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/notifications/push_service.dart';
import '../../core/theme/app_icons.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import 'notifications_providers.dart';

class NotificationSettingsScreen extends ConsumerStatefulWidget {
  const NotificationSettingsScreen({super.key});
  @override
  ConsumerState<NotificationSettingsScreen> createState() => _State();
}

class _State extends ConsumerState<NotificationSettingsScreen> {
  bool _busy = false;
  bool? _permission;
  late final AppLifecycleListener _lifecycle;
  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(onResume: _loadPermission);
    _loadPermission();
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  Future<void> _loadPermission() async {
    final service = ref.read(pushServiceProvider);
    final granted = await service?.permitted() ?? false;
    await service?.sync();
    if (mounted) setState(() => _permission = granted);
  }

  Future<void> _run(Future<void> Function() f) async {
    setState(() => _busy = true);
    try {
      await f();
      ref.invalidate(notificationPreferencesProvider);
      await _loadPermission();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final service = ref.watch(pushServiceProvider);
    final data = ref.watch(notificationPreferencesProvider);
    return GenPageScaffold(
      title: 'Notificaciones',
      icon: AppIcons.reminders,
      showBack: true,
      body: ListView(
        children: [
          if (_busy) const LinearProgressIndicator(),
          Text(
            service?.available != true
                ? 'Las notificaciones al teléfono no están configuradas en esta versión. La bandeja sigue disponible.'
                : _permission == true
                ? 'Notificaciones permitidas en este teléfono.'
                : 'Activá las notificaciones para recibir avisos con la app cerrada.',
          ),
          if (service?.available == true)
            TextButton(
              key: const ValueKey('push_permission'),
              onPressed: _busy
                  ? null
                  : () => _run(() async {
                      if (service!.hasAsked) {
                        await service.openSettings();
                      } else {
                        await service.requestPermission();
                      }
                    }),
              child: Text(
                service!.hasAsked
                    ? 'Abrir ajustes del teléfono'
                    : 'Activar notificaciones',
              ),
            ),
          data.when(
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => ErrorView(
              error: e,
              onRetry: () => ref.invalidate(notificationPreferencesProvider),
            ),
            data: (p) => Column(
              children: [
                if (p['configured'] != true)
                  const Text(
                    'El servidor todavía no tiene habilitado el envío al teléfono.',
                  ),
                SwitchListTile(
                  key: const ValueKey('push_reminders'),
                  title: const Text('Recordatorios'),
                  subtitle: const Text(
                    'Recibir avisos en los horarios configurados.',
                  ),
                  value: p['reminders'] == true,
                  onChanged: _busy
                      ? null
                      : (v) => _run(
                          () => ref
                              .read(notificationsRepositoryProvider)
                              .savePreferences(v, p['urgent'] == true),
                        ),
                ),
                SwitchListTile(
                  key: const ValueKey('push_urgent'),
                  title: const Text('Tareas urgentes'),
                  subtitle: const Text(
                    'Recibir un aviso cuando se activa la urgencia.',
                  ),
                  value: p['urgent'] == true,
                  onChanged: _busy
                      ? null
                      : (v) => _run(
                          () => ref
                              .read(notificationsRepositoryProvider)
                              .savePreferences(p['reminders'] == true, v),
                        ),
                ),
                const Text(
                  'Estas preferencias corresponden a tu cuenta en el servidor actual. Los avisos se conservan en la bandeja.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
