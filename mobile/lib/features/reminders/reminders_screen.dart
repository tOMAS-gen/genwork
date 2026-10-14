import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/workspace_panel.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'delivery_tile.dart';
import 'reminder_calendar.dart';
import 'reminder_scope_color.dart';
import '../../core/router/routes.dart';
import '../../core/util/format.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
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

    final c = context.colors;
    Widget section(String title, String subtitle, IconData icon) => Padding(
      padding: const EdgeInsets.only(top: AppSpacing.md, bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: AppIconSizes.field, color: c.muted),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: AppTextStyles.dialogTitle.copyWith(color: c.text),
                  ),
                ),
                Text(
                  subtitle,
                  style: AppTextStyles.body.copyWith(color: c.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    return GenPageScaffold(
      title: deliveriesOnly ? 'Vence hoy' : 'Recordatorios',
      subtitle: deliveriesOnly
          ? null
          : 'Fechas, avisos y compromisos del equipo.',
      icon: AppIcons.bell,
      actions: [
        if (!deliveriesOnly)
          IconButton.filled(
            key: const ValueKey('reminders_create'),
            tooltip: 'Crear recordatorio',
            icon: const Icon(AppIcons.reminderAdd),
            onPressed: () => context.push(Routes.newReminder),
          ),
      ],
      bodyPadding: EdgeInsets.zero,
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
      body: ListView(
        key: ValueKey(deliveriesOnly ? 'due_today_list' : 'reminders_list'),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        children: [
          if (timezone?.hasValue == true)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.md),
              child: Text(
                'Zona horaria del sistema: ${timezone!.requireValue.name}',
                style: AppTextStyles.body.copyWith(color: c.muted),
              ),
            ),
          section(
            deliveriesOnly ? 'Avisos pendientes' : 'Notificaciones',
            'Avisos que necesitan tu atención.',
            AppIcons.bell,
          ),
          if (deliveries.isLoading && !deliveries.hasValue) const LoadingView(),
          if (deliveries.hasError)
            ErrorView(
              error: deliveries.error!,
              onRetry: () => ref.invalidate(deliveriesProvider),
            ),
          if (deliveries.hasValue && deliveries.requireValue.isEmpty)
            const WorkspacePanel(
              child: ListTile(
                title: Text('Estás al día'),
                subtitle: Text('No tenés avisos pendientes.'),
              ),
            ),
          if (deliveries.hasValue && deliveries.requireValue.isNotEmpty)
            WorkspaceListPanel(
              children: [
                for (final d in deliveries.requireValue)
                  DeliveryTile(
                    key: ValueKey('delivery_row_${d.id}'),
                    delivery: d,
                    dayLabel: dayLabel(d.occurrenceDate),
                  ),
              ],
            ),
          if (!deliveriesOnly) ...[
            const SizedBox(height: AppSpacing.md),
            SegmentedButton<bool>(
              key: const ValueKey('reminders_view'),
              segments: const [
                ButtonSegment(
                  value: false,
                  label: Text('Próximos'),
                  icon: Icon(AppIcons.list),
                ),
                ButtonSegment(
                  value: true,
                  label: Text('Calendario'),
                  icon: Icon(AppIcons.calendarMonth),
                ),
              ],
              selected: {_calendar},
              onSelectionChanged: (v) => setState(() => _calendar = v.single),
            ),
            if (_calendar && today != null) ...[
              const SizedBox(height: AppSpacing.md),
              ReminderCalendar(today: today),
            ],
            if (!_calendar || today == null) ...[
              section(
                'Próximos 60 días',
                'Tu agenda de recordatorios.',
                AppIcons.reminders,
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
                  return WorkspaceListPanel(
                    children: [
                      for (final o in page.occurrences)
                        ListTile(
                          key: ValueKey(
                            'occurrence_${o.reminderId}_${o.date.toIso8601String()}',
                          ),
                          leading: Icon(
                            AppIcons.reminders,
                            color: reminderScopeColor(context, o.scope),
                          ),
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
    );
  }
}
