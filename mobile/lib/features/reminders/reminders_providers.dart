import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/util/system_timezone.dart';
import '../../data/models/reminder.dart';
import '../../data/repositories/reminders_repository.dart';

final reminderClockProvider = Provider<DateTime Function()>(
  (ref) => DateTime.now,
);

final reminderTimezoneProvider = FutureProvider.autoDispose<SystemTimezone>((
  ref,
) async {
  final name = await ref.watch(remindersRepositoryProvider).timezone();
  return SystemTimezone(name);
});

/// Recordatorios y ocurrencias de hoy a 60 días.
final upcomingRemindersProvider = FutureProvider.autoDispose<RemindersPage>((
  ref,
) async {
  final repo = ref.watch(remindersRepositoryProvider);
  final clock = ref.watch(reminderClockProvider);
  final timezone = await ref.watch(reminderTimezoneProvider.future);
  final today = timezone.today(clock());
  return repo.list(from: today, to: today.add(const Duration(days: 60)));
});

/// Notificaciones pendientes (campanita).
final deliveriesProvider = FutureProvider.autoDispose<List<ReminderDelivery>>(
  (ref) => ref.watch(remindersRepositoryProvider).deliveries(),
);

/// Mes calendario, inclusive; el servidor calcula las recurrencias.
final monthRemindersProvider = FutureProvider.autoDispose
    .family<RemindersPage, DateTime>((ref, month) async {
      final repo = ref.watch(remindersRepositoryProvider);
      await ref.watch(reminderTimezoneProvider.future);
      return repo.list(
        from: DateTime.utc(month.year, month.month),
        to: DateTime.utc(month.year, month.month + 1, 0),
      );
    });
