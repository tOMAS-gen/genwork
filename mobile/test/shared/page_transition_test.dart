import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';

Future<void> _push(WidgetTester t, {bool noAnimations = false}) async {
  final key = GlobalKey<NavigatorState>();
  await t.pumpWidget(
    MaterialApp(
      navigatorKey: key,
      theme: AppTheme.light(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: noAnimations),
        child: child!,
      ),
      home: const Scaffold(body: Text('inicio')),
    ),
  );
  key.currentState!.push(
    MaterialPageRoute<void>(
      builder: (_) => const Scaffold(body: Text('nueva')),
    ),
  );
  await t.pump();
  await t.pump(const Duration(milliseconds: 50));
}

void main() {
  // La plataforma de los tests es Android.
  testWidgets('T5: en Android el push es un fundido y el atrás es predictivo', (
    t,
  ) async {
    await _push(t);
    // Fundido a mitad de camino en la página nueva.
    final fade = t.widget<FadeTransition>(
      find
          .ancestor(
            of: find.text('nueva'),
            matching: find.byType(FadeTransition),
          )
          .first,
    );
    expect(fade.opacity.value, inExclusiveRange(0, 1));
    // El detector del gesto atrás predictivo envuelve la página.
    expect(
      find.ancestor(
        of: find.text('nueva'),
        matching: find.byWidgetPredicate(
          (w) => w.runtimeType.toString() == '_PredictiveBackGestureDetector',
        ),
      ),
      findsOneWidget,
    );
    await t.pumpAndSettle();
  });

  testWidgets('T5: con animaciones desactivadas, corte', (t) async {
    await _push(t, noAnimations: true);
    expect(
      find.ancestor(
        of: find.text('nueva'),
        matching: find.byType(FadeTransition),
      ),
      findsNothing,
    );
    await t.pumpAndSettle();
  });
}
