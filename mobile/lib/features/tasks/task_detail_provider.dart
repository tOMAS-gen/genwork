import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/task.dart';
import '../my_day/my_day_providers.dart';
import '../sectors/sectors_providers.dart';
import '../works/works_providers.dart';

typedef TaskDetailQuery = ({String id, String? workId, String? sectorId});
typedef TaskDetailData = ({Task? task, bool canOperate, bool canManageMyDay});

Task? findTask(Iterable<Task> tasks, String id) {
  for (final task in tasks) {
    if (task.id == id) return task;
    final child = findTask(task.subtasks, id);
    if (child != null) return child;
  }
  return null;
}

/// Sigue el mismo contexto que abrió la hoja, sin pedir acceso al proyecto de
/// una referencia que el usuario solo puede consultar desde su sector/Mi día.
final taskDetailProvider = FutureProvider.autoDispose
    .family<TaskDetailData, TaskDetailQuery>((ref, query) async {
      if (query.sectorId case final String sectorId) {
        final board = await ref.watch(
          sectorBoardProvider((id: sectorId, done: null)).future,
        );
        final task = findTask([
          ...board.loose,
          ...board.byWork.expand((group) => group.tasks),
          ...board.refs,
        ], query.id);
        return (
          task: task,
          canOperate: board.canOperate && task?.canToggle != false,
          canManageMyDay: task?.canManageMyDay == true,
        );
      }
      if (query.workId case final String workId) {
        final work = await ref.watch(workDetailProvider(workId).future);
        final task = findTask(work.tasks, query.id);
        return (
          task: task,
          canOperate:
              work.canOperate && !work.isArchived && task?.canToggle != false,
          canManageMyDay: task?.canManageMyDay ?? work.canManageMyDay,
        );
      }
      final lists = await Future.wait([
        ref.watch(myDayProvider.future),
        ref.watch(openReferencesProvider.future),
      ]);
      final task = findTask(lists.expand((list) => list), query.id);
      return (
        task: task,
        canOperate: task?.canToggle == true,
        canManageMyDay: task?.canManageMyDay == true,
      );
    });
