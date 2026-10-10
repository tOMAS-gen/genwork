import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../core/theme/app_icons.dart';
import 'reminders_providers.dart';

/// Campanita con la cantidad de notificaciones pendientes; lleva a Recordatorios.
class DeliveriesButton extends ConsumerWidget {
  const DeliveriesButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(deliveriesProvider).value?.length ?? 0;
    return IconButton(
      key: const ValueKey('deliveries_button'),
      tooltip: 'Notificaciones',
      onPressed: () {
        ref.invalidate(deliveriesProvider);
        context.push(Routes.dueToday);
      },
      icon: Badge(
        isLabelVisible: count > 0,
        label: Text('$count'),
        child: const Icon(AppIcons.bell),
      ),
    );
  }
}
