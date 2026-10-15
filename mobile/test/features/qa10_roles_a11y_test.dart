import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/util/format.dart';
import 'package:genwork_mobile/data/models/common.dart';
import 'package:genwork_mobile/data/models/group.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/features/works/create_work_dialog.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';
import 'package:genwork_mobile/shared/widgets/progress_line.dart';
import 'package:genwork_mobile/shared/widgets/task_tile.dart';
import 'daily_parity_test.dart' show taskJson;
import 'resource_operations_test.dart' show user, Json;

/// QA10 (cierre posible del punto 10): matriz de roles y recorrido TalkBack.
Json group(
  String id, {
  List<Json> members = const [],
  bool publicRead = false,
}) => {
  'id': id,
  'name': 'Grupo $id',
  'publicRead': publicRead,
  'memberships': members,
};

Json membership(String userId, String role) => {
  'userId': userId,
  'role': role,
  'user': {'id': userId, 'name': userId, 'email': '$userId@test.local'},
};

Future<void> pump(
  WidgetTester t,
  Widget child, {
  List overrides = const [],
}) async {
  await t.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [...overrides],
      child: MaterialApp(
        theme: AppTheme.light(),
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: Scaffold(body: child),
      ),
    ),
  );
  await t.pumpAndSettle();
}

void main() {
  test('crear en un grupo: miembro o SA; lectura pública no alcanza', () {
    final mine = GroupSummary.fromJson(
      group('mio', members: [membership('me', 'MEMBER')]),
    );
    final public = GroupSummary.fromJson(group('publico', publicRead: true));
    expect(mine.canOperate(user('MEMBER')), isTrue);
    expect(public.canOperate(user('MEMBER')), isFalse);
    expect(public.canOperate(user('SUPERADMIN')), isTrue);
    expect(public.canOperate(null), isFalse);
  });

  for (final role in ['MEMBER', 'SUPERADMIN']) {
    testWidgets(
      'crear proyecto ofrece solo grupos donde se puede crear ($role)',
      (t) async {
        await pump(
          t,
          Builder(
            builder: (context) => TextButton(
              onPressed: () => showCreateWorkDialog(context),
              child: const Text('abrir'),
            ),
          ),
          overrides: [
            currentUserProvider.overrideWithValue(user(role)),
            groupsProvider.overrideWith(
              (ref) async => [
                GroupSummary.fromJson(
                  group('mio', members: [membership('me', 'MEMBER')]),
                ),
                GroupSummary.fromJson(group('publico', publicRead: true)),
              ],
            ),
          ],
        );
        await t.tap(find.text('abrir'));
        await t.pumpAndSettle();
        await t.tap(find.byKey(const ValueKey('create_work_group')));
        await t.pumpAndSettle();
        expect(find.text('Grupo mio'), findsWidgets);
        expect(
          find.text('Grupo publico'),
          role == 'SUPERADMIN' ? findsWidgets : findsNothing,
        );
      },
    );
  }

  testWidgets('la barra de progreso se lee una sola vez', (t) async {
    final handle = t.ensureSemantics();
    await pump(t, const ProgressLine(progress: Progress(done: 2, total: 5)));
    final node = t.getSemantics(find.byType(ProgressLine));
    expect(node.label, '2 de 5 tareas completadas');
    expect(node.childrenCount, 0); // Sin el valor crudo de la barra ni "2/5".
    handle.dispose();
  });

  testWidgets('la casilla de una tarea dice cuál completa', (t) async {
    final handle = t.ensureSemantics();
    await pump(
      t,
      TaskTile(
        task: Task.fromJson(taskJson('a')),
        onTap: () {},
        onToggleDone: () {},
      ),
    );
    expect(find.bySemanticsLabel('Completar tarea: Tarea a'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('sin permiso la casilla no repite el texto de la tarjeta', (
    t,
  ) async {
    final handle = t.ensureSemantics();
    await pump(
      t,
      TaskTile(
        task: Task.fromJson(taskJson('a', canToggle: false)),
        onTap: () {},
        onToggleDone: () {},
      ),
    );
    expect(find.bySemanticsLabel(RegExp('Completar tarea: ')), findsNothing);
    expect(find.bySemanticsLabel(RegExp('^Completar tarea')), findsOneWidget);
    handle.dispose();
  });

  test('countLabel concuerda en número', () {
    expect(countLabel(1, 'proyecto', 'proyectos'), '1 proyecto');
    expect(countLabel(0, 'proyecto', 'proyectos'), '0 proyectos');
    expect(countLabel(3, 'recordatorio', 'recordatorios'), '3 recordatorios');
  });
}
