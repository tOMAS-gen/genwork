import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/features/notifications/notifications_screen.dart';
import 'package:genwork_mobile/features/notifications/notification_settings_screen.dart';
import 'package:genwork_mobile/features/notifications/task_notification_controls.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'daily_parity_test.dart' show ApiHarness, mount, taskJson;

void main() {
  setUpAll(() => initializeDateFormatting('es'));
  testWidgets('bandeja filtra, marca leída y descarta', (tester) async {
    bool read = false, dismissed = false;
    var patches = 0;
    final api = ApiHarness((r) {
      if (r.method == 'PATCH') {
        patches++;
        if (r.data['action'] == 'READ') {
          read = true;
        } else {
          dismissed = true;
        }
        return null;
      }
      return {
        'notifications': dismissed || r.queryParameters['kind'] == 'REMINDER'
            ? []
            : [
                {
                  'id': 'n',
                  'kind': 'URGENT',
                  'title': 'Imprimir carteles',
                  'dueAt': '2026-10-17T10:00:00Z',
                  'readAt': read ? '2026-10-17T10:00:00Z' : null,
                },
              ],
        'unreadCount': read || dismissed ? 0 : 1,
        'nextCursor': null,
      };
    });
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(api.api)],
      retry: (_, _) => null,
    );
    addTearDown(container.dispose);
    await mount(tester, container, const NotificationsScreen());
    expect(find.text('Imprimir carteles'), findsOneWidget);
    await tester.tap(
      find.byKey(const ValueKey('notifications_filter_REMINDER')),
    );
    await tester.pumpAndSettle();
    expect(find.text('No tenés avisos pendientes.'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('notifications_filter_URGENT')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('notification_read_n')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('notification_read_n')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('notification_dismiss_n')));
    await tester.pumpAndSettle();
    expect(patches, 2);
    expect(find.text('No tenés avisos pendientes.'), findsOneWidget);
  });
  testWidgets('recordatorio conserva posponer una hora', (tester) async {
    final api = ApiHarness((r) {
      if (r.method == 'PATCH') return null;
      return {
        'notifications': [
          {
            'id': 'n',
            'kind': 'REMINDER',
            'title': 'Entrega',
            'deliveryId': 'd',
            'dueAt': '2026-10-17T10:00:00Z',
          },
        ],
        'unreadCount': 1,
        'nextCursor': null,
      };
    });
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(api.api)],
      retry: (_, _) => null,
    );
    addTearDown(container.dispose);
    await mount(tester, container, const NotificationsScreen());
    await tester.tap(find.byKey(const ValueKey('notification_snooze_n')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Una hora'));
    await tester.pumpAndSettle();
    expect(api.requests.where((r) => r.method == 'PATCH').single.data, {
      'action': 'SNOOZE',
      'preset': '1h',
    });
  });
  testWidgets('urgencia usa el contexto y explica ausencia de destinatarios', (
    tester,
  ) async {
    bool urgent = false;
    final api = ApiHarness((r) {
      if (r.method == 'PATCH') {
        urgent = r.data['isUrgent'];
        return {'isUrgent': urgent};
      }
      return {
        'task': {...taskJson('t', canToggle: true), 'isUrgent': urgent},
        'recipientCount': 0,
      };
    });
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(api.api)],
      retry: (_, _) => null,
    );
    addTearDown(container.dispose);
    await mount(
      tester,
      container,
      Scaffold(
        body: TaskNotificationControls(
          task: Task.fromJson(taskJson('t')),
          canEdit: true,
          fromSector: true,
        ),
      ),
    );
    expect(find.textContaining('Sin destinatarios'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('task_urgent')));
    await tester.pumpAndSettle();
    expect(api.requests.where((r) => r.method == 'PATCH').single.data, {
      'isUrgent': true,
      'editContext': 'sector',
    });
    expect(
      tester
          .widget<SwitchListTile>(find.byKey(const ValueKey('task_urgent')))
          .value,
      isTrue,
    );
  });
  testWidgets('permisos denegados impiden editar urgencia', (tester) async {
    final api = ApiHarness(
      (_) => {'task': taskJson('t', canToggle: false), 'recipientCount': 1},
    );
    final container = ProviderContainer(
      overrides: [apiClientProvider.overrideWithValue(api.api)],
      retry: (_, _) => null,
    );
    addTearDown(container.dispose);
    await mount(
      tester,
      container,
      Scaffold(
        body: TaskNotificationControls(
          task: Task.fromJson(taskJson('t')),
          canEdit: true,
          fromSector: false,
        ),
      ),
    );
    expect(
      tester
          .widget<SwitchListTile>(find.byKey(const ValueKey('task_urgent')))
          .onChanged,
      isNull,
    );
  });
  testWidgets(
    'sin Firebase conserva preferencias y explica configuración pendiente',
    (tester) async {
      final api = ApiHarness(
        (_) => {'reminders': true, 'urgent': true, 'configured': false},
      );
      final container = ProviderContainer(
        overrides: [apiClientProvider.overrideWithValue(api.api)],
        retry: (_, _) => null,
      );
      addTearDown(container.dispose);
      await mount(tester, container, const NotificationSettingsScreen());
      expect(
        find.textContaining('La bandeja sigue disponible'),
        findsOneWidget,
      );
      expect(find.textContaining('El servidor todavía'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('push_urgent')));
      await tester.pumpAndSettle();
      expect(api.requests.where((r) => r.method == 'PATCH').single.data, {
        'reminders': true,
        'urgent': false,
      });
    },
  );
  for (final dark in [false, true]) {
    testWidgets('bandeja accesible a 360dp y texto 150%, oscuro=$dark', (
      tester,
    ) async {
      final api = ApiHarness(
        (_) => {
          'notifications': [
            {
              'id': 'n',
              'kind': 'REMINDER',
              'title':
                  'Revisar la entrega y confirmar las medidas con producción',
              'deliveryId': 'd',
              'dueAt': '2026-10-17T10:00:00Z',
            },
          ],
          'unreadCount': 1,
          'nextCursor': null,
        },
      );
      final container = ProviderContainer(
        overrides: [apiClientProvider.overrideWithValue(api.api)],
        retry: (_, _) => null,
      );
      addTearDown(container.dispose);
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: dark ? AppTheme.dark() : AppTheme.light(),
            home: const NotificationsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.byKey(const ValueKey('notification_n')), findsOneWidget);
    });
  }
}
