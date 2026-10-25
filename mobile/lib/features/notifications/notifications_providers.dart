import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/app_notification.dart';
import '../../data/models/task.dart';
import '../../data/repositories/notifications_repository.dart';
import '../tasks/task_detail_provider.dart';

final notificationsRepositoryProvider = Provider(
  (ref) => NotificationsRepository(ref.watch(apiClientProvider)),
);
final notificationsProvider = FutureProvider.autoDispose
    .family<NotificationPage, String?>(
      (ref, kind) =>
          ref.watch(notificationsRepositoryProvider).list(kind: kind),
    );
final notificationPreferencesProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(notificationsRepositoryProvider).preferences(),
);
final taskNotificationInfoProvider = FutureProvider.autoDispose
    .family<({Task task, int recipientCount}), String>((ref, id) async {
      final json = await ref.watch(notificationsRepositoryProvider).task(id);
      return (
        task: Task.fromJson(Map<String, dynamic>.from(json['task'] as Map)),
        recipientCount: json['recipientCount'] as int,
      );
    });
final notificationTaskDetailProvider = FutureProvider.autoDispose
    .family<TaskDetailData, String>((ref, id) async {
      final info = await ref.watch(taskNotificationInfoProvider(id).future);
      return (
        task: info.task,
        canOperate: info.task.canToggle == true,
        canManageMyDay: info.task.canManageMyDay == true,
      );
    });
