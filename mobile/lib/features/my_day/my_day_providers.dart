import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/task.dart';
import '../reminders/reminders_providers.dart';

final myDayProvider = FutureProvider.autoDispose<List<Task>>((ref) => ref.watch(meRepositoryProvider).myDay());

/// Menciones abiertas (`@yo`).
final openReferencesProvider = FutureProvider.autoDispose<List<Task>>(
  (ref) => ref.watch(meRepositoryProvider).references(done: false),
);

/// Hoy en la zona del sistema: el servidor arma Mi día ("completadas hoy") con
/// esa zona, no con la del teléfono. Hasta que llega la zona, el día local.
final myDayTodayProvider = Provider.autoDispose<DateTime>((ref) {
  final now = ref.watch(reminderClockProvider)();
  final timezone = ref.watch(reminderTimezoneProvider).value;
  return timezone?.today(now) ?? DateTime.utc(now.year, now.month, now.day);
});
