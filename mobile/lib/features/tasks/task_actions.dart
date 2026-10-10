import '../objectives/objectives_providers.dart';
import '../board/board_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/task.dart';
import '../my_day/my_day_providers.dart';
import '../sectors/sectors_providers.dart';
import '../works/works_providers.dart';

/// Mutaciones de tareas. Tras cada una invalida las listas que pueden mostrar la
/// tarea (el SSE también avisa, pero esto da feedback inmediato).
class TaskActions {
  TaskActions(this._ref);

  final Ref _ref;

  Future<Task> create(
    String rawText, {
    String? workId,
    String? sectorId,
    String? parentId,
    String? objectiveId,
  }) async {
    final task = await _ref
        .read(tasksRepositoryProvider)
        .create(
          rawText,
          workId: workId,
          sectorId: sectorId,
          parentId: parentId,
          objectiveId: objectiveId,
        );
    refreshAll();
    return task;
  }

  /// Completa o reabre usando el primer estado final / en curso de sus opciones.
  Future<void> toggleDone(Task task) async {
    final target = task.isDone ? task.openOption : task.finalOption;
    if (target == null) return;
    await setStatus(task, target.id);
  }

  Future<void> setStatus(Task task, String statusId) async {
    await _ref.read(tasksRepositoryProvider).setStatus(task.id, statusId);
    refreshAll();
  }

  Future<void> setMyDay(Task task, bool inMyDay) async {
    await _ref.read(tasksRepositoryProvider).setMyDay(task.id, inMyDay);
    refreshAll();
  }

  Future<void> updateText(
    Task task,
    String rawText, {
    bool fromSector = false,
  }) async {
    await _ref
        .read(tasksRepositoryProvider)
        .updateText(task.id, rawText, fromSector: fromSector);
    refreshAll();
  }

  Future<void> updateDescription(Task task, String? description) async {
    await _ref
        .read(tasksRepositoryProvider)
        .updateDescription(task.id, description);
    refreshAll();
  }

  Future<void> delete(Task task) async {
    await _ref.read(tasksRepositoryProvider).delete(task.id);
    refreshAll();
  }

  Future<void> moveToObjective(Task task, String? objectiveId) async {
    await _ref
        .read(tasksRepositoryProvider)
        .moveToObjective(task.id, objectiveId);
    refreshAll();
  }

  Future<void> setParent(Task task, String? parentId) async {
    await _ref.read(tasksRepositoryProvider).setParent(task.id, parentId);
    refreshAll();
  }

  Future<void> reorder(
    String workId,
    String? objectiveId,
    List<String> ids,
  ) async {
    await _ref.read(tasksRepositoryProvider).reorder(workId, objectiveId, ids);
    refreshAll();
  }

  Future<void> reorderSubtasks(Task task, List<String> ids) async {
    await _ref.read(tasksRepositoryProvider).reorderSubtasks(task.id, ids);
    refreshAll();
  }

  void refreshAll() {
    _ref.invalidate(myDayProvider);
    _ref.invalidate(openReferencesProvider);
    _ref.invalidate(workDetailProvider);
    _ref.invalidate(worksListProvider);
    _ref.invalidate(sectorBoardProvider);
    _ref.invalidate(sectorsProvider);
    _ref.invalidate(boardProvider);
    _ref.invalidate(templatesProvider);
  }
}

final taskActionsProvider = Provider((ref) => TaskActions(ref));
