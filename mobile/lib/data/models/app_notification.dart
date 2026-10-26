import 'json.dart';

class AppNotification {
  const AppNotification({
    required this.id,
    required this.kind,
    required this.title,
    required this.dueAt,
    this.readAt,
    this.deliveryId,
  });
  final String id, kind, title;
  final DateTime dueAt;
  final DateTime? readAt;
  final String? deliveryId;
  bool get urgent => kind == 'URGENT';
  factory AppNotification.fromJson(Json j) => AppNotification(
    id: j['id'] as String,
    kind: j['kind'] as String,
    title: j['title'] as String,
    dueAt: DateTime.parse(j['dueAt'] as String),
    readAt: j['readAt'] == null ? null : DateTime.parse(j['readAt'] as String),
    deliveryId: j['deliveryId'] as String?,
  );
}

class NotificationPage {
  const NotificationPage(this.items, this.unreadCount, this.nextCursor);
  final List<AppNotification> items;
  final int unreadCount;
  final String? nextCursor;
  factory NotificationPage.fromJson(Json j) => NotificationPage(
    (j['notifications'] as List)
        .map(
          (v) => AppNotification.fromJson(Map<String, dynamic>.from(v as Map)),
        )
        .toList(),
    j['unreadCount'] as int,
    j['nextCursor'] as String?,
  );
}
