import '../settings/settings_providers.dart';
import '../settings/catalogs_providers.dart';
import '../objectives/objectives_providers.dart';
import '../board/board_providers.dart';
import 'dart:async';
import 'package:dio/dio.dart';
import '../files/files_providers.dart';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/live/live_events.dart';
import '../../core/providers.dart';
import '../../data/models/live_event.dart';
import '../my_day/my_day_providers.dart';
import '../notes/notes_providers.dart';
import '../reminders/reminders_providers.dart';
import '../sectors/sectors_providers.dart';
import '../works/works_providers.dart';
import '../groups/groups_providers.dart';

final liveEventsProvider = Provider.autoDispose<Stream<LiveEvent>>((ref) {
  final cancel = CancelToken();
  ref.onDispose(cancel.cancel);
  return liveEventStream(ref.watch(apiClientProvider).dio, cancelToken: cancel);
});

/// Escucha el SSE y refresca lo afectado; al volver la app a primer plano
/// refresca todo (el SSE no tiene replay de lo que pasó en segundo plano).
final liveRefresherProvider = Provider.autoDispose<void>((ref) {
  void refreshAll() {
    ref.invalidate(workFilesProvider);
    ref.invalidate(fileSharesProvider);
    ref.invalidate(settingsDataProvider);
    ref.invalidate(settingsErrorProvider);
    ref.invalidate(catalogDataProvider);
    ref.invalidate(myDayProvider);
    ref.invalidate(openReferencesProvider);
    ref.invalidate(worksListProvider);
    ref.invalidate(workDetailProvider);
    ref.invalidate(groupsProvider);
    ref.invalidate(groupWorksProvider);
    ref.invalidate(groupClientsProvider);
    ref.invalidate(groupLabelsProvider);
    ref.invalidate(memberSearchProvider);
    ref.invalidate(workStagesProvider);
    ref.invalidate(workLabelsProvider);
    ref.invalidate(sectorsProvider);
    ref.invalidate(boardProvider);
    ref.invalidate(templatesProvider);
    ref.invalidate(sectorBoardProvider);
    ref.invalidate(deliveriesProvider);
    ref.invalidate(notesProvider);
    ref.invalidate(noteProvider);
    ref.invalidate(reminderTimezoneProvider);
    ref.invalidate(upcomingRemindersProvider);
    ref.invalidate(monthRemindersProvider);
  }

  final subscription = ref.watch(liveEventsProvider).listen((event) {
    switch (event) {
      case LiveConnected():
        refreshAll();
      case TaskChanged():
        ref.invalidate(groupsProvider);
        ref.invalidate(groupWorksProvider);
        ref.invalidate(myDayProvider);
        ref.invalidate(openReferencesProvider);
        ref.invalidate(sectorBoardProvider);
        ref.invalidate(sectorsProvider);
        ref.invalidate(boardProvider);
        ref.invalidate(templatesProvider);
        // El evento puede venir después de sacar una tarea de un proyecto;
        // incluso con workId null, sus contadores anteriores pudieron cambiar.
        ref.invalidate(worksListProvider);
        // El evento solo identifica el destino: también puede haber salido
        // de otro proyecto cuyo detalle sigue abierto en una rama del drawer.
        ref.invalidate(workDetailProvider);
      case WorkChanged(:final workId):
        ref.invalidate(groupsProvider);
        ref.invalidate(groupWorksProvider);
        ref.invalidate(groupClientsProvider);
        if (workId.isEmpty) {
          refreshAll();
        } else {
          ref.invalidate(worksListProvider);
          ref.invalidate(workDetailProvider(workId));
          ref.invalidate(myDayProvider);
          ref.invalidate(openReferencesProvider);
          // Archivar/restaurar un proyecto cambia los pendientes de sus sectores.
          ref.invalidate(sectorsProvider);
          ref.invalidate(boardProvider);
          ref.invalidate(templatesProvider);
          ref.invalidate(sectorBoardProvider);
        }
    }
  });

  final lifecycle = AppLifecycleListener(onResume: refreshAll);

  ref.onDispose(() {
    unawaited(subscription.cancel());
    lifecycle.dispose();
  });
});
