import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_icons.dart';
import '../../data/models/reminder.dart';
import '../../shared/widgets/state_views.dart';
import 'reminders_providers.dart';

/// Misma acción en Recordatorios y Vence hoy, con un solo envío mientras guarda.
class DeliveryTile extends ConsumerStatefulWidget {
  const DeliveryTile({
    super.key,
    required this.delivery,
    required this.dayLabel,
  });
  final ReminderDelivery delivery;
  final String dayLabel;
  @override
  ConsumerState<DeliveryTile> createState() => _DeliveryTileState();
}

class _DeliveryTileState extends ConsumerState<DeliveryTile> {
  bool _busy = false;
  Future<void> _act(String action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(remindersRepositoryProvider);
      if (action == 'dismiss') {
        await repo.dismiss(widget.delivery.id);
      } else {
        await repo.snooze(widget.delivery.id, action);
      }
      if (mounted) ref.invalidate(deliveriesProvider);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.delivery;
    final route = d.linkAvailable ? Routes.fromWebPath(d.linkPath) : null;
    return ListTile(
      key: ValueKey('delivery_${d.id}'),
      leading: const Icon(AppIcons.bellActive),
      title: Text(d.title),
      subtitle: Text(
        [
          widget.dayLabel,
          if (d.description?.isNotEmpty == true) d.description!,
          if (d.linkLabel != null) d.linkLabel!,
          if (!d.linkAvailable && d.linkLabel != null) 'Recurso no disponible',
        ].join('\n'),
      ),
      onTap: route == null ? null : () => context.push(route),
      trailing: PopupMenuButton<String>(
        key: ValueKey('delivery_menu_${d.id}'),
        enabled: !_busy,
        tooltip: _busy ? 'Guardando aviso' : 'Opciones del aviso',
        onSelected: _act,
        itemBuilder: (_) => const [
          PopupMenuItem(value: '1h', child: Text('Posponer 1 hora')),
          PopupMenuItem(value: 'tomorrow', child: Text('Posponer a mañana')),
          PopupMenuDivider(),
          PopupMenuItem(value: 'dismiss', child: Text('Descartar')),
        ],
      ),
    );
  }
}
