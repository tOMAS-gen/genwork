import '../objectives/objectives_providers.dart';
import '../board/board_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../my_day/my_day_providers.dart';
import '../reminders/reminders_providers.dart';
import '../sectors/sectors_providers.dart';
import '../works/works_providers.dart';
import '../groups/groups_providers.dart';

/// Las mutaciones de proyectos/sectores afectan también referencias y contadores.
void refreshResources(WidgetRef ref) {
  ref.invalidate(groupsProvider);
  ref.invalidate(groupWorksProvider);
  ref.invalidate(groupClientsProvider);
  ref.invalidate(worksListProvider);
  ref.invalidate(workDetailProvider);
  ref.invalidate(sectorsProvider);
  ref.invalidate(boardProvider);
  ref.invalidate(templatesProvider);
  ref.invalidate(sectorBoardProvider);
  ref.invalidate(myDayProvider);
  ref.invalidate(openReferencesProvider);
  ref.invalidate(upcomingRemindersProvider);
  ref.invalidate(deliveriesProvider);
}

void refreshGroups(WidgetRef ref) {
  ref.invalidate(groupLabelsProvider);
  ref.invalidate(memberSearchProvider);
  ref.invalidate(workLabelsProvider);
  ref.invalidate(workStagesProvider);
  refreshResources(ref);
}
