// Una sola receta de campo (spec 066, tarea 13, PS10 y T1): rótulo arriba en
// 12/600 gris, 6 dp sobre el control, y anunciado por TalkBack como el nombre
// del campo.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_icons.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/app_dropdown_decoration.dart';
import 'package:genwork_mobile/shared/widgets/labeled_field.dart';
import 'package:genwork_mobile/shared/widgets/list_toolbar.dart';
import 'package:genwork_mobile/shared/widgets/panel_section.dart';

Future<void> _mount(WidgetTester t, Widget child) => t.pumpWidget(
  MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(
      body: Padding(padding: const EdgeInsets.all(16), child: child),
    ),
  ),
);

void main() {
  testWidgets('LabeledField: rótulo 12/600 gris, 6 dp arriba del campo', (
    t,
  ) async {
    await _mount(
      t,
      const LabeledField(
        label: 'Nombre',
        child: TextField(key: ValueKey('campo')),
      ),
    );
    final label = t.widget<Text>(find.text('Nombre'));
    expect(label.style!.fontSize, 12);
    expect(label.style!.fontWeight, FontWeight.w600);
    expect(label.style!.color, GenColors.light.muted);
    expect(
      t.getTopLeft(find.byKey(const ValueKey('campo'))).dy -
          t.getBottomLeft(find.text('Nombre')).dy,
      6,
    );
  });

  for (final (name, field) in [
    ('texto', const TextField(key: ValueKey('campo'))),
    (
      'desplegable',
      DropdownButtonFormField<String>(
        key: const ValueKey('campo'),
        initialValue: 'a',
        items: const [DropdownMenuItem(value: 'a', child: Text('Uno'))],
        onChanged: (_) {},
      ),
    ),
  ]) {
    testWidgets('LabeledField anuncia el rótulo con el campo ($name, T1)', (
      t,
    ) async {
      final handle = t.ensureSemantics();
      await _mount(t, LabeledField(label: 'Ámbito', child: field));
      // Un solo nodo con el rótulo: el del campo, no el texto suelto.
      expect(find.bySemanticsLabel(RegExp('Ámbito')), findsOneWidget);
      expect(
        t.getSemantics(find.byKey(const ValueKey('campo'))).label,
        contains('Ámbito'),
      );
      await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
      handle.dispose();
    });
  }

  testWidgets('ToolbarFilterField usa la misma receta y anuncia el rótulo', (
    t,
  ) async {
    final handle = t.ensureSemantics();
    await _mount(
      t,
      ToolbarFilterField(
        label: 'Sector',
        child: DropdownButtonFormField<String>(
          key: const ValueKey('campo'),
          initialValue: 'a',
          items: const [DropdownMenuItem(value: 'a', child: Text('Todos'))],
          onChanged: (_) {},
        ),
      ),
    );
    final label = t.widget<Text>(find.text('Sector'));
    expect(label.style!.fontSize, 12);
    expect(label.style!.fontWeight, FontWeight.w600);
    expect(label.style!.color, GenColors.light.muted);
    expect(
      t.getSemantics(find.byKey(const ValueKey('campo'))).label,
      contains('Sector'),
    );
    handle.dispose();
  });

  // P24a-M1: copiar es un ícono dentro del campo, no un botón en otro renglón.
  testWidgets('CopyField: botón de copiar de 20 dp dentro del campo', (t) async {
    final handle = t.ensureSemantics();
    var copies = 0;
    await _mount(
      t,
      CopyField(
        value: 'http://localhost:3010',
        buttonKey: const ValueKey('copiar'),
        onCopy: () => copies++,
      ),
    );
    expect(find.byType(OutlinedButton), findsNothing);
    final field = t.getRect(find.byKey(const ValueKey('copy_field')));
    final button = t.getRect(find.byKey(const ValueKey('copiar')));
    expect(field.contains(button.center), isTrue);
    expect(
      t.widget<Icon>(find.byIcon(AppIcons.copy)).size,
      AppIconSizes.action,
    );
    await t.tap(find.byKey(const ValueKey('copiar')));
    expect(copies, 1);
    await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
    handle.dispose();
  });

  testWidgets('AppDropdownIcon: chevron gris de 20 dp', (t) async {
    await _mount(t, const AppDropdownIcon());
    final icon = t.widget<Icon>(find.byIcon(AppIcons.expandMore));
    expect(icon.size, AppIconSizes.action);
    expect(icon.color, GenColors.light.muted);
  });

  test('todos los desplegables usan el mismo chevron', () {
    final missing = <String>[];
    for (final f in Directory('lib').listSync(recursive: true)) {
      if (f is! File || !f.path.endsWith('.dart')) continue;
      final src = f.readAsStringSync();
      final dropdowns = RegExp(
        r'\bDropdownButton(?:FormField)?<',
      ).allMatches(src).length;
      final icons = 'icon: const AppDropdownIcon()'.allMatches(src).length;
      if (dropdowns != icons) missing.add('${f.path}: $dropdowns ≠ $icons');
    }
    expect(missing, isEmpty);
  });
}
