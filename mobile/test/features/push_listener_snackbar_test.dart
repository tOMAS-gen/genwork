import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/features/notifications/push_listener.dart';

void main() {
  testWidgets('aviso en primer plano se cierra solo y conserva Ver', (
    tester,
  ) async {
    var opened = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => ScaffoldMessenger.of(
                context,
              ).showSnackBar(newNoticeSnackBar('one.example', () => opened++)),
              child: const Text('mostrar'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('mostrar'));
    await tester.pumpAndSettle();
    expect(find.text('Nuevo aviso · one.example'), findsOneWidget);

    await tester.tap(find.text('Ver'));
    await tester.pumpAndSettle();
    expect(opened, 1);

    await tester.tap(find.text('mostrar'));
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 10));
    await tester.pumpAndSettle();
    expect(find.text('Nuevo aviso · one.example'), findsNothing);
  });
}
