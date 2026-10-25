import '../../core/auth/session.dart';
import '../../core/providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/util/format.dart';
import '../../data/models/app_notification.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import '../reminders/reminders_providers.dart';
import '../tasks/task_detail_sheet.dart';
import 'notifications_providers.dart';

Future<void> openNotification(
  BuildContext context,
  WidgetRef ref,
  String id,
) async {
  final session = ref.read(sessionProvider).value;
  final repo = ref.read(notificationsRepositoryProvider);
  final target = await repo.target(id);
  if (!context.mounted ||
      ref.read(sessionProvider).value is! SignedIn ||
      !identical(session, ref.read(sessionProvider).value)) {
    return;
  }
  await repo.action(id, 'READ');
  if (!context.mounted || !identical(session, ref.read(sessionProvider).value)) {
    return;
  }
  ref.invalidate(notificationsProvider);
  if (!context.mounted) return;
  if (target['task'] is Map) {
    final task = Task.fromJson(
      Map<String, dynamic>.from(target['task'] as Map),
    );
    await Navigator.of(context, rootNavigator: true).push<void>(
      MaterialPageRoute(
        builder: (_) => TaskDetailSheet(
          task: task,
          canEdit: task.canToggle == true,
          canManageMyDay: task.canManageMyDay == true,
          fromSector: task.workId == null,
          notificationContext: true,
        ),
      ),
    );
  } else {
    final type = target['linkType'];
    final link = target['linkId'] as String?;
    context.go(
      type == 'WORK' && link != null
          ? Routes.work(link)
          : type == 'SECTOR' && link != null
          ? Routes.sector(link)
          : Routes.reminders,
    );
  }
}

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key, this.openId});
  final String? openId;
  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  String? _kind;
  bool _busy = false;
  final _extra = <AppNotification>[];
  String? _cursor;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.openId != null) {
        _run(() => openNotification(context, ref, widget.openId!));
      }
    });
  }

  @override
  void didUpdateWidget(covariant NotificationsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.openId != null && widget.openId != oldWidget.openId) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _run(() => openNotification(context, ref, widget.openId!));
      });
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _extra.clear();
      _cursor = null;
    });
    ref.invalidate(notificationsProvider);
    await ref.read(notificationsProvider(_kind).future);
  }

  @override
  Widget build(BuildContext context) {
    final page = ref.watch(notificationsProvider(_kind));
    return GenPageScaffold(
      title: 'Notificaciones',
      icon: AppIcons.reminders,
      onRefresh: _refresh,
      actions: [
        IconButton(
          key: const ValueKey('notifications_settings'),
          tooltip: 'Preferencias de notificaciones',
          onPressed: () => context.push(Routes.notificationSettings),
          icon: const Icon(AppIcons.settings),
        ),
      ],
      body: Column(
        children: [
          Wrap(
            spacing: AppSpacing.sm,
            children: [
              for (final entry in const {
                '': 'Todas',
                'REMINDER': 'Recordatorios',
                'URGENT': 'Urgentes',
              }.entries)
                ChoiceChip(
                  key: ValueKey('notifications_filter_${entry.key}'),
                  label: Text(entry.value),
                  selected: (_kind ?? '') == entry.key,
                  onSelected: _busy
                      ? null
                      : (_) => setState(() {
                          _kind = entry.key.isEmpty ? null : entry.key;
                          _extra.clear();
                          _cursor = null;
                        }),
                ),
            ],
          ),
          if (_busy) const LinearProgressIndicator(),
          Expanded(
            child: page.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => ErrorView(error: e, onRetry: _refresh),
              data: (p) {
                final items = {
                  for (final n in [...p.items, ..._extra]) n.id: n,
                }.values.toList();
                final cursor = _extra.isEmpty ? p.nextCursor : _cursor;
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    if (items.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(AppSpacing.lg),
                        child: Text('No tenés avisos pendientes.'),
                      ),
                    for (final n in items)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              ListTile(
                                key: ValueKey('notification_${n.id}'),
                                leading: Icon(
                                  n.urgent
                                      ? AppIcons.priority
                                      : AppIcons.reminders,
                                ),
                                title: Text(n.title),
                                subtitle: Text(
                                  '${n.urgent ? 'Urgente' : 'Recordatorio'} · ${formatDateTime(n.dueAt)}${n.readAt == null ? ' · Sin leer' : ''}',
                                ),
                                onTap: _busy
                                    ? null
                                    : () => _run(
                                        () => openNotification(
                                          context,
                                          ref,
                                          n.id,
                                        ),
                                      ),
                              ),
                              Wrap(
                                spacing: AppSpacing.sm,
                                children: [
                                  if (n.readAt == null)
                                    TextButton(
                                      key: ValueKey(
                                        'notification_read_${n.id}',
                                      ),
                                      onPressed: _busy
                                          ? null
                                          : () => _run(() async {
                                              await ref
                                                  .read(
                                                    notificationsRepositoryProvider,
                                                  )
                                                  .action(n.id, 'READ');
                                              await _refresh();
                                            }),
                                      child: const Text('Marcar como leída'),
                                    ),
                                  TextButton(
                                    key: ValueKey(
                                      'notification_dismiss_${n.id}',
                                    ),
                                    onPressed: _busy
                                        ? null
                                        : () => _run(() async {
                                            await ref
                                                .read(
                                                  notificationsRepositoryProvider,
                                                )
                                                .action(n.id, 'DISMISS');
                                            ref.invalidate(deliveriesProvider);
                                            await _refresh();
                                          }),
                                    child: const Text('Descartar'),
                                  ),
                                  if (n.deliveryId != null)
                                    PopupMenuButton<String>(
                                      key: ValueKey(
                                        'notification_snooze_${n.id}',
                                      ),
                                      enabled: !_busy,
                                      tooltip: 'Posponer',
                                      onSelected: (preset) => _run(() async {
                                        await ref
                                            .read(
                                              notificationsRepositoryProvider,
                                            )
                                            .snooze(n.deliveryId!, preset);
                                        ref.invalidate(deliveriesProvider);
                                        await _refresh();
                                      }),
                                      itemBuilder: (_) => const [
                                        PopupMenuItem(
                                          value: '1h',
                                          child: Text('Una hora'),
                                        ),
                                        PopupMenuItem(
                                          value: 'tomorrow',
                                          child: Text('Mañana a las 9'),
                                        ),
                                      ],
                                      child: const Padding(
                                        padding: EdgeInsets.all(AppSpacing.md),
                                        child: Text('Posponer'),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (cursor != null)
                      TextButton(
                        key: const ValueKey('notifications_more'),
                        onPressed: _busy
                            ? null
                            : () => _run(() async {
                                final next = await ref
                                    .read(notificationsRepositoryProvider)
                                    .list(kind: _kind, cursor: cursor);
                                if (mounted) {
                                  setState(() {
                                    _extra.addAll(next.items);
                                    _cursor = next.nextCursor;
                                  });
                                }
                              }),
                        child: const Text('Cargar más'),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
