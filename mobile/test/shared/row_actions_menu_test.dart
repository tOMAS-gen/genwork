// Acciones de fila en "⋯" (spec 066, tarea 12, PS5, D6): ícono de 20 dp gris
// con 48 dp táctiles; la acción destructiva va en rojo, separada, adentro.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_icons.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/row_actions_menu.dart';

void main() {
  testWidgets('RowActionsMenu: ⋯ gris de 20 dp, destructiva en rojo y aparte', (
    t,
  ) async {
    final handle = t.ensureSemantics();
    final done = <String>[];
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Center(
            child: RowActionsMenu(
              key: const ValueKey('menu'),
              tooltip: 'Acciones de Ana',
              actions: [
                RowAction(
                  key: 'role',
                  label: 'Cambiar rol',
                  onSelected: () => done.add('role'),
                ),
                RowAction(
                  key: 'remove',
                  label: 'Dar de baja',
                  destructive: true,
                  onSelected: () => done.add('remove'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    final icon = t.widget<Icon>(find.byIcon(AppIcons.moreHorizontal));
    expect(icon.size, AppIconSizes.action);
    expect(icon.color, GenColors.light.muted);
    expect(
      t.getSize(find.byKey(const ValueKey('menu'))).height,
      greaterThanOrEqualTo(kMinInteractiveDimension),
    );
    await expectLater(t, meetsGuideline(androidTapTargetGuideline));
    await expectLater(t, meetsGuideline(labeledTapTargetGuideline));

    await t.tap(find.byKey(const ValueKey('menu')));
    await t.pumpAndSettle();
    expect(find.byType(PopupMenuDivider), findsOneWidget);
    final remove = t.widget<Text>(find.text('Dar de baja'));
    expect(remove.style!.color, GenColors.light.danger);
    expect(
      t.getTopLeft(find.text('Cambiar rol')).dy,
      lessThan(t.getTopLeft(find.text('Dar de baja')).dy),
    );
    await t.tap(find.byKey(const ValueKey('remove')));
    await t.pumpAndSettle();
    expect(done, ['remove']);
    handle.dispose();
  });

  testWidgets('RowActionsMenu sin destructiva no lleva divisor', (t) async {
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: RowActionsMenu(
            key: const ValueKey('menu'),
            tooltip: 'Acciones',
            actions: [RowAction(key: 'a', label: 'Uno', onSelected: () {})],
          ),
        ),
      ),
    );
    await t.tap(find.byKey(const ValueKey('menu')));
    await t.pumpAndSettle();
    expect(find.byType(PopupMenuDivider), findsNothing);
  });
}
