// El nombre como título de la card de entidad (spec 066, tarea 16, D4): 15/600
// en su caja original, hasta dos líneas, con el color como punto de 8 dp.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_text_styles.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/entity_card_title.dart';

Future<void> _mount(WidgetTester t, Widget child) {
  t.view.physicalSize = const Size(360, 640);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  return t.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      home: Scaffold(body: SizedBox(width: 200, child: child)),
    ),
  );
}

void main() {
  testWidgets('título 15/600 en su caja original, hasta dos líneas', (t) async {
    await _mount(t, const EntityCardTitle(name: 'Cartelería del local'));
    final text = t.widget<Text>(find.text('Cartelería del local'));
    expect(text.style!.fontSize, AppTextStyles.cardTitle.fontSize);
    expect(text.style!.fontWeight, FontWeight.w600);
    expect(text.style!.color, GenColors.light.text);
    expect(text.maxLines, 2);
    expect(find.text('CARTELERÍA DEL LOCAL'), findsNothing);
    // Sin color, sin punto ni fondo de píldora.
    expect(find.byKey(const ValueKey('entity_dot')), findsNothing);
    expect(
      find.ancestor(
        of: find.text('Cartelería del local'),
        matching: find.byType(DecoratedBox),
      ),
      findsNothing,
    );
  });

  testWidgets('con color, un punto de 8 dp antes del nombre', (t) async {
    await _mount(
      t,
      const EntityCardTitle(name: 'Impresión', color: Color(0xFF3B5BFA)),
    );
    final dot = find.byKey(const ValueKey('entity_dot'));
    expect(t.getSize(dot), const Size.square(8));
    expect(
      t.getTopLeft(dot).dx,
      lessThan(t.getTopLeft(find.text('Impresión')).dx),
    );
  });

  testWidgets('se anuncia como encabezado', (t) async {
    await _mount(t, const EntityCardTitle(name: 'Impresión'));
    expect(
      find.ancestor(
        of: find.text('Impresión'),
        matching: find.byWidgetPredicate(
          (w) => w is Semantics && w.properties.header == true,
        ),
      ),
      findsOneWidget,
    );
  });
}
