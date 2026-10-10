import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'delivery_tile.dart';
import 'reminder_calendar.dart';
import '../../core/router/routes.dart';
import '../../core/util/format.dart';
import '../../data/models/reminder.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/page_intro.dart';
import 'reminders_providers.dart';

/// Notificaciones pendientes (descartar / posponer) y próximas ocurrencias.
class RemindersScreen extends ConsumerStatefulWidget {
  const RemindersScreen({super.key, this.deliveriesOnly = false});
  final bool deliveriesOnly;

  @override
  ConsumerState<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends ConsumerState<RemindersScreen> {
  bool _calendar = false;
  bool get deliveriesOnly => widget.deliveriesOnly;
  @override
  Widget build(BuildContext context) {
    final deliveries = ref.watch(deliveriesProvider);
    final upcoming = deliveriesOnly
        ? null
        : ref.watch(upcomingRemindersProvider);
    final timezone = deliveriesOnly
        ? null
        : ref.watch(reminderTimezoneProvider);
    final today = timezone?.value?.today(ref.watch(reminderClockProvider)());

    String dayLabel(DateTime date) => today == null
        ? DateFormat('d MMM y', 'es').format(date)
        : formatDay(date, now: today);

    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: Text(deliveriesOnly ? 'Vence hoy' : 'Recordatorios'),
      ),
      floatingActionButton: deliveriesOnly
          ? null
          : FloatingActionButton(
              key: const ValueKey('reminders_create'),
              tooltip: 'Crear recordatorio',
              onPressed: () => context.push(Routes.newReminder),
              child: const Icon(Icons.add_alarm),
            ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(deliveriesProvider);
          if (!deliveriesOnly) {
            ref.invalidate(reminderTimezoneProvider);
            ref.invalidate(upcomingRemindersProvider);
            ref.invalidate(monthRemindersProvider);
          }
          await Future.wait([
            ref.read(deliveriesProvider.future),
            if (!deliveriesOnly) ref.read(upcomingRemindersProvider.future),
          ]);
        },
        child: ListView(
          key: ValueKey(deliveriesOnly ? 'due_today_list' : 'reminders_list'),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            if (timezone?.hasValue == true)
              Padding(
                padding: AppSpace.page,
                child: Text(
                  'Zona horaria del sistema: ${timezone!.requireValue.name}',
                ),
              ),
            PageIntro(
              title: deliveriesOnly ? 'Avisos pendientes' : 'Notificaciones',
              subtitle: 'Avisos que necesitan tu atención.',
              icon: Icons.notifications_outlined,
            ),
            if (deliveries.isLoading && !deliveries.hasValue)
              const LoadingView(),
            if (deliveries.hasError)
              ErrorView(
                error: deliveries.error!,
                onRetry: () => ref.invalidate(deliveriesProvider),
              ),
            if (deliveries.hasValue && deliveries.requireValue.isEmpty)
              const ListTile(
                title: Text('Estás al día'),
                subtitle: Text('No tenés avisos pendientes.'),
              ),
            for (final d in deliveries.value ?? const <ReminderDelivery>[])
              DeliveryTile(
                key: ValueKey('delivery_row_${d.id}'),
                delivery: d,
                dayLabel: dayLabel(d.occurrenceDate),
              ),
            if (!deliveriesOnly) ...[
              Padding(
                padding: AppSpace.page,
                child: SegmentedButton<bool>(
                  key: const ValueKey('reminders_view'),
                  segments: const [
                    ButtonSegment(
                      value: false,
                      label: Text('Próximos'),
                      icon: Icon(Icons.list),
                    ),
                    ButtonSegment(
                      value: true,
                      label: Text('Calendario'),
                      icon: Icon(Icons.calendar_month),
                    ),
                  ],
                  selected: {_calendar},
                  onSelectionChanged: (v) =>
                      setState(() => _calendar = v.single),
                ),
              ),
              if (_calendar && today != null) ReminderCalendar(today: today),
              if (!_calendar || today == null) ...[
                const PageIntro(
                  title: 'Próximos 60 días',
                  subtitle: 'Tu agenda de recordatorios.',
                  icon: Icons.event_outlined,
                ),
                AsyncValueView(
                  value: upcoming!,
                  onRetry: () {
                    ref.invalidate(reminderTimezoneProvider);
                    ref.invalidate(upcomingRemindersProvider);
                    ref.invalidate(monthRemindersProvider);
                  },
                  data: (page) {
                    if (page.occurrences.isEmpty) {
                      return const EmptyView(
                        message: 'Sin recordatorios próximos',
                      );
                    }
                    return Column(
                      children: [
                        for (final o in page.occurrences)
                          ListTile(
                            key: ValueKey(
                              'occurrence_${o.reminderId}_${o.date.toIso8601String()}',
                            ),
                            leading: const Icon(Icons.event_outlined),
                            title: Text(o.title),
                            subtitle: Text(dayLabel(o.date)),
                            onTap: () =>
                                context.push(Routes.reminder(o.reminderId)),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ],
            const SizedBox(height: AppSpace.bottomClearance),
          ],
        ),
      ),
    );
  }
}
