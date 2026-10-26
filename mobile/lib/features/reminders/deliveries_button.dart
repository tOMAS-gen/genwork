import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../core/theme/app_icons.dart';
import '../notifications/notifications_providers.dart';

/// Campana de avisos sin leer; abre la bandeja unificada.
class DeliveriesButton extends ConsumerWidget {
  const DeliveriesButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count =
        ref.watch(notificationsProvider(null)).value?.unreadCount ?? 0;
    return IconButton(
      key: const ValueKey('deliveries_button'),
      tooltip: 'Notificaciones',
      onPressed: () {
        ref.invalidate(notificationsProvider);
        context.push(Routes.notifications);
      },
      icon: Badge(
        isLabelVisible: count > 0,
        label: Text('$count'),
        child: const Icon(AppIcons.bell),
      ),
    );
  }
}
