import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/json.dart';
import '../../data/repositories/settings_repository.dart';
import '../works/works_providers.dart';
import '../groups/groups_providers.dart';
import '../sectors/sectors_providers.dart';
import '../my_day/my_day_providers.dart';
import '../board/board_providers.dart';
import '../reminders/reminders_providers.dart';

final settingsRepositoryProvider = Provider(
  (ref) => SettingsRepository(ref.watch(apiClientProvider)),
);
final settingsDataProvider = FutureProvider.autoDispose
    .family<Object?, SettingsQuery>((ref, query) {
      if (query.section.adminOnly &&
          ref.watch(currentUserProvider)?.isSuperAdmin != true) {
        throw StateError(
          'Esta sección requiere permiso de administrador del sistema.',
        );
      }
      return ref.watch(settingsRepositoryProvider).read(query);
    });
final settingsErrorProvider = FutureProvider.autoDispose.family<Json, String>((
  ref,
  id,
) {
  if (ref.watch(currentUserProvider)?.isSuperAdmin != true) {
    throw StateError('No tenés permiso para ver este registro.');
  }
  return ref.watch(settingsRepositoryProvider).error(id);
});

void refreshSettings(WidgetRef ref) {
  ref.invalidate(settingsDataProvider);
  ref.invalidate(settingsErrorProvider);
  ref.invalidate(reminderTimezoneProvider);
  ref.invalidate(upcomingRemindersProvider);
  ref.invalidate(monthRemindersProvider);
}

void refreshCatalogs(WidgetRef ref) {
  ref.invalidate(workLabelsProvider);
  ref.invalidate(workStagesProvider);
  ref.invalidate(groupLabelsProvider);
  ref.invalidate(workDetailProvider);
  ref.invalidate(worksListProvider);
  ref.invalidate(sectorsProvider);
  ref.invalidate(sectorBoardProvider);
  ref.invalidate(myDayProvider);
  ref.invalidate(openReferencesProvider);
  ref.invalidate(boardProvider);
}
