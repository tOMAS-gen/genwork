import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/shared/widgets/workspace_panel.dart';

void main() {
  testWidgets('T2: con 300 filas solo se construyen las visibles', (t) async {
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    final built = <int>{};
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              SliverListPanel(
                itemCount: 300,
                itemBuilder: (_, i) {
                  built.add(i);
                  return SizedBox(height: 56, child: Text('Fila $i'));
                },
              ),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Fila 0'), findsOneWidget);
    // 844 dp de alto: unas 15 filas más el área de precarga, nunca las 300.
    expect(built.length, lessThan(40));
    expect(find.text('Fila 299'), findsNothing);
    await t.scrollUntilVisible(find.text('Fila 299'), 2000);
    expect(find.text('Fila 299'), findsOneWidget);
    expect(find.text('Fila 0'), findsNothing);
  });
}
