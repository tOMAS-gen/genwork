import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/data/models/app_notification.dart';
import 'package:genwork_mobile/features/notifications/notifications_providers.dart';
import 'package:genwork_mobile/features/reminders/deliveries_button.dart';

Future<void> pumpBell(WidgetTester tester, int unread) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        notificationsProvider(
          null,
        ).overrideWith((ref) async => NotificationPage(const [], unread, null)),
      ],
      child: MaterialApp(
        home: Scaffold(appBar: AppBar(actions: const [DeliveriesButton()])),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('la campana con contador anuncia qué es y cuántos avisos hay', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await pumpBell(tester, 19);
    expect(
      find.bySemanticsLabel('Notificaciones, 19 sin leer'),
      findsOneWidget,
    );
    expect(find.bySemanticsLabel('19'), findsNothing);
    semantics.dispose();
  });

  testWidgets(
    'sin avisos pendientes la campana se anuncia solo por su nombre',
    (tester) async {
      final semantics = tester.ensureSemantics();
      await pumpBell(tester, 0);
      expect(find.bySemanticsLabel('Notificaciones'), findsOneWidget);
      semantics.dispose();
    },
  );
}
