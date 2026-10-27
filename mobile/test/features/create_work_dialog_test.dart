// "Nuevo proyecto" como CreateProjectDialog.tsx de la web (P06).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart' hide group;
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/models/group.dart';
import 'package:genwork_mobile/features/works/create_work_dialog.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';

import 'qa10_roles_a11y_test.dart' as qa10;
import 'resource_operations_test.dart' show user;

void main() {
  testWidgets(
    'campos con rótulo arriba, en el orden y con el texto de la web',
    (t) async {
      await qa10.pump(
        t,
        Builder(
          builder: (context) => TextButton(
            onPressed: () => showCreateWorkDialog(context),
            child: const Text('abrir'),
          ),
        ),
        overrides: [
          currentUserProvider.overrideWithValue(user('MEMBER')),
          groupsProvider.overrideWith(
            (ref) async => [
              GroupSummary.fromJson(
                qa10.group('mio', members: [qa10.membership('me', 'MEMBER')]),
              ),
            ],
          ),
        ],
      );
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();

      final scope = t.getRect(find.text('Ámbito'));
      final name = t.getRect(find.text('Nombre'));
      final description = t.getRect(find.text('Descripción (opcional)'));
      expect(scope.top, lessThan(name.top));
      expect(name.top, lessThan(description.top));
      // Rótulo arriba del campo, no dentro del borde.
      expect(
        name.bottom,
        lessThanOrEqualTo(
          t.getRect(find.byKey(const ValueKey('create_work_name'))).top,
        ),
      );
      expect(find.text('Para mí (personal)'), findsOneWidget);
      expect(find.text('Ej.: Tina – Remodelación de paneles'), findsOneWidget);
      expect(find.text('De qué se trata el proyecto'), findsOneWidget);
      expect(find.text('0 / 2.000'), findsOneWidget);
      expect(find.text('0/120'), findsNothing);
    },
  );

  // T1: TalkBack dice qué campo es cada uno.
  testWidgets('cada campo del alta se anuncia con su rótulo', (t) async {
    final handle = t.ensureSemantics();
    await qa10.pump(
      t,
      Builder(
        builder: (context) => TextButton(
          onPressed: () => showCreateWorkDialog(context),
          child: const Text('abrir'),
        ),
      ),
      overrides: [
        currentUserProvider.overrideWithValue(user('MEMBER')),
        groupsProvider.overrideWith(
          (ref) async => [
            GroupSummary.fromJson(
              qa10.group('mio', members: [qa10.membership('me', 'MEMBER')]),
            ),
          ],
        ),
      ],
    );
    await t.tap(find.text('abrir'));
    await t.pumpAndSettle();
    expect(
      t.getSemantics(find.byKey(const ValueKey('create_work_name'))).label,
      contains('Nombre'),
    );
    await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
    handle.dispose();
  });
}
