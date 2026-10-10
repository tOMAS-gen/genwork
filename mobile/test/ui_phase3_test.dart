import 'package:genwork_mobile/features/documents/document_screen.dart';
import 'rich_editor_fake.dart';
import 'dart:io';
import 'package:genwork_mobile/core/util/system_timezone.dart';
import 'dart:async';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/session_controller.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/features/account/account_screen.dart';
import 'package:genwork_mobile/data/repositories/notes_repository.dart';
import 'dart:ui' as ui;
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:genwork_mobile/features/shell/home_shell.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/features/shell/live_refresher.dart';
import 'package:genwork_mobile/features/tasks/task_actions.dart';
import 'package:genwork_mobile/features/account/more_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/data/models/sector.dart';
import 'package:genwork_mobile/data/models/note.dart';
import 'package:genwork_mobile/data/models/reminder.dart';
import 'package:genwork_mobile/data/repositories/reminders_repository.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/features/my_day/my_day_screen.dart';
import 'package:genwork_mobile/features/my_day/my_day_providers.dart';
import 'package:genwork_mobile/features/works/work_summary.dart';
import 'package:genwork_mobile/shared/widgets/gen_tab_bar.dart';
import 'package:genwork_mobile/features/works/works_list_screen.dart';
import 'package:genwork_mobile/features/works/work_detail_screen.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';
import 'package:genwork_mobile/features/sectors/sectors_list_screen.dart';
import 'package:genwork_mobile/features/sectors/sector_detail_screen.dart';
import 'package:genwork_mobile/features/sectors/sectors_providers.dart';
import 'package:genwork_mobile/features/notes/notes_list_screen.dart';
import 'package:genwork_mobile/features/notes/note_detail_screen.dart';
import 'package:genwork_mobile/features/notes/notes_providers.dart';
import 'package:genwork_mobile/features/reminders/reminders_screen.dart';
import 'package:genwork_mobile/features/reminders/reminder_form_screen.dart';
import 'package:genwork_mobile/features/reminders/reminders_providers.dart';
import 'package:genwork_mobile/features/tasks/task_detail_sheet.dart';
import 'package:genwork_mobile/shared/widgets/app_work_section.dart';
import 'package:genwork_mobile/shared/widgets/task_tile.dart';
import 'package:genwork_mobile/shared/widgets/state_views.dart';
import 'package:genwork_mobile/shared/widgets/brand_name.dart';
import 'package:intl/date_symbol_data_local.dart';

final _task = Task.fromJson({
  'id': 't1',
  'displayText': 'Preparar originales para impresión',
  'rawText': 'Preparar originales para impresión',
  'status': {
    'id': 'open',
    'name': 'En curso',
    'type': 'IN_PROGRESS',
    'color': '#3b5bfa',
  },
  'statusOptions': [
    {'id': 'open', 'name': 'En curso', 'type': 'IN_PROGRESS'},
    {'id': 'done', 'name': 'Terminada', 'type': 'FINAL'},
  ],
  'work': {'id': 'w1', 'name': 'Señalética · Local Mendoza'},
  'canToggle': true,
  'canManageMyDay': true,
});
final _works = [
  WorkSummary.fromJson({
    'id': 'w1',
    'name': 'Señalética · Local Mendoza',
    'groupName': 'Producción',
    'groupId': 'g-production',
    'isFavorite': true,
    'taskCounts': {'done': 4, 'total': 9},
    'stage': {'name': 'En producción', 'color': '#3b5bfa'},
  }),
  WorkSummary.fromJson({
    'id': 'w2',
    'name': 'Cartelería de recepción',
    'groupName': 'Diseño',
    'groupId': 'g-design',
    'taskCounts': {'done': 1, 'total': 3},
  }),
];
final _work = WorkDetail.fromJson({
  'id': 'w1',
  'name': 'Señalética · Local Mendoza',
  'code': 'GW-024',
  'access': 'operate',
  'canManageMyDay': true,
  'objectives': [
    {'id': 'o1', 'title': 'Preparación de originales'},
  ],
});
final _note = Note.fromJson({
  'id': 'n1',
  'title': 'Reunión de producción',
  'content': {
    'type': 'doc',
    'content': [
      {
        'type': 'paragraph',
        'content': [
          {
            'type': 'text',
            'text': 'Confirmar medidas antes de enviar a impresión.',
          },
        ],
      },
    ],
  },
});
final _sector = SectorSummary.fromJson({
  'id': 's1',
  'name': 'Impresión y terminaciones',
  'metrics': {'pending': 8, 'total': 12, 'done': 4},
});
final _board = SectorBoard.fromJson({
  'sector': {'id': 's1', 'name': 'Impresión'},
  'level': 'operate',
});

Future<void> _pump(
  WidgetTester tester,
  Widget screen, {
  bool dark = false,
  double scale = 1.5,
  bool shell = false,
  bool readOnly = false,
  TaskActions? actions,
  NotesRepository? notesRepository,
}) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final router = shell
      ? GoRouter(
          initialLocation: '/works',
          routes: [
            StatefulShellRoute.indexedStack(
              builder: (_, _, navigationShell) =>
                  HomeShell(navigationShell: navigationShell),
              branches: [
                for (final entry in <String, Widget>{
                  Routes.myDay: const MyDayScreen(),
                  '/works': const WorksListScreen(),
                  '/sectors': const SectorsListScreen(),
                  '/notes': const NotesListScreen(),
                  '/more': const MoreScreen(),
                }.entries)
                  StatefulShellBranch(
                    routes: [
                      GoRoute(
                        path: entry.key,
                        builder: (_, _) => entry.value,
                        routes: [
                          if (entry.key == Routes.more) ...[
                            GoRoute(
                              path: 'reminders',
                              builder: (_, _) => const RemindersScreen(),
                            ),
                            GoRoute(
                              path: 'account',
                              builder: (_, _) => const AccountScreen(),
                            ),
                          ],
                          if (entry.key == Routes.works)
                            GoRoute(
                              path: ':id',
                              builder: (_, state) => WorkDetailScreen(
                                workId: state.pathParameters['id']!,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
              ],
            ),
          ],
        )
      : null;
  if (router != null) addTearDown(router.dispose);
  Widget builder(BuildContext context, Widget? child) => RepaintBoundary(
    key: const ValueKey('preview'),
    child: MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale), disableAnimations: true),
      child: child!,
    ),
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
        sessionProvider.overrideWith(_TestSession.new),
        if (notesRepository != null)
          notesRepositoryProvider.overrideWithValue(notesRepository),
        liveRefresherProvider.overrideWith((ref) {}),
        if (actions != null) taskActionsProvider.overrideWithValue(actions),
        apiClientProvider.overrideWithValue(
          ApiClient(
            baseUrl: Uri.parse('https://test.invalid'),
            token: 'test',
            onUnauthorized: () {},
          ),
        ),
        myDayProvider.overrideWith((ref) async => [_task]),
        openReferencesProvider.overrideWith((ref) async => []),
        worksListProvider.overrideWith((ref, archived) async => _works),
        workDetailProvider.overrideWith(
          (ref, id) async => readOnly
              ? WorkDetail.fromJson({'id': 'w1', 'name': 'Lectura'})
              : _work,
        ),
        groupsProvider.overrideWith((ref) async => []),
        sectorsProvider.overrideWith((ref) async => [_sector]),
        sectorBoardProvider.overrideWith((ref, q) async => _board),
        notesProvider.overrideWith((ref) async => [_note]),
        noteProvider.overrideWith((ref, id) async => _note),
        deliveriesProvider.overrideWith((ref) async => []),
        reminderTimezoneProvider.overrideWith(
          (ref) async => SystemTimezone('America/Argentina/Mendoza'),
        ),
        upcomingRemindersProvider.overrideWith(
          (ref) async => RemindersPage(
            reminders: [],
            occurrences: [
              ReminderOccurrence(
                reminderId: 'r1',
                date: DateTime(2026, 10, 12),
                title: 'Revisar entrega de señalética',
              ),
            ],
          ),
        ),
      ],
      child: router == null
          ? MaterialApp(
              theme: dark ? AppTheme.dark() : AppTheme.light(),
              locale: const Locale('es'),
              supportedLocales: const [Locale('es')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              builder: builder,
              home: screen,
            )
          : MaterialApp.router(
              theme: dark ? AppTheme.dark() : AppTheme.light(),
              locale: const Locale('es'),
              supportedLocales: const [Locale('es')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              builder: builder,
              routerConfig: router,
            ),
    ),
  );
  await tester.pumpAndSettle();
}

/// Desplaza la lista de proyectos hasta que [finder] sea visible (con las
/// estadísticas arriba, controles y cards quedan bajo el pliegue).
Future<void> _scrollWorks(WidgetTester tester, Finder finder) async {
  final list = find
      .descendant(
        of: find.byKey(const ValueKey('works_list')),
        matching: find.byType(Scrollable),
      )
      .first;
  await tester.scrollUntilVisible(finder.hitTestable(), 200, scrollable: list);
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('es');
    final loader = FontLoader('Montserrat')
      ..addFont(rootBundle.load('assets/fonts/Montserrat.ttf'));
    await loader.load();
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });
  for (final dark in [false, true]) {
    testWidgets(
      'pantallas a 360 dp / 150 % sin overflow (${dark ? "oscuro" : "claro"})',
      (tester) async {
        for (final screen in <Widget>[
          const MyDayScreen(),
          const AccountScreen(),
          const MoreScreen(),
          const WorksListScreen(),
          const WorkDetailScreen(workId: 'w1'),
          const SectorsListScreen(),
          const SectorDetailScreen(sectorId: 's1'),
          const NotesListScreen(),
          const NoteDetailScreen(noteId: 'n1'),
          const RemindersScreen(),
          const ReminderFormScreen(),
          Scaffold(
            body: TaskDetailSheet(
              task: _task,
              canEdit: true,
              canManageMyDay: true,
              fromSector: false,
            ),
          ),
          const Scaffold(body: LoadingView()),
        ]) {
          await _pump(tester, screen, dark: dark);
          expect(
            tester.takeException(),
            isNull,
            reason: '${screen.runtimeType}',
          );
        }
      },
    );
  }
  for (final dark in [false, true]) {
    testWidgets('detalle de tarea en pantalla completa, sin bottom sheet '
        '(${dark ? "oscuro" : "claro"})', (tester) async {
      await _pump(
        tester,
        Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showTaskDetail(
                context,
                _task,
                canEdit: true,
                canManageMyDay: true,
              ),
              child: const Text('abrir detalle'),
            ),
          ),
        ),
        dark: dark,
      );
      await tester.tap(find.text('abrir detalle'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      // Ruta a pantalla completa: ni hoja inferior ni arrastre.
      expect(find.byType(BottomSheet), findsNothing);
      expect(find.byType(DraggableScrollableSheet), findsNothing);
      final route = ModalRoute.of(
        tester.element(find.byKey(const ValueKey('task_detail_list'))),
      )!;
      expect(route, isA<MaterialPageRoute<void>>());
      expect((route as MaterialPageRoute<void>).fullscreenDialog, isTrue);
      // AppBar de 48 con el cierre y la tarea como título.
      expect(
        tester
            .getSize(
              find.descendant(
                of: find.byType(TaskDetailSheet),
                matching: find.byType(AppBar),
              ),
            )
            .height,
        48,
      );
      expect(
        find.descendant(
          of: find.byType(AppBar),
          matching: find.text('Preparar originales para impresión'),
        ),
        findsOneWidget,
      );
      // Secciones con AppWorkSection y borrar con estilo destructivo.
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('task_delete')),
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('task_detail_list')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      // Secciones: la lista es perezosa, el historial aparece al llegar al final.
      expect(
        tester
            .widgetList<AppWorkSection>(find.byType(AppWorkSection))
            .map((w) => w.title)
            .toSet(),
        containsAll(['Subtareas', 'Historial']),
      );
      final delete = tester.widget<OutlinedButton>(
        find.byKey(const ValueKey('task_delete')),
      );
      final danger = (dark ? GenColors.dark : GenColors.light).danger;
      expect(delete.style!.foregroundColor!.resolve({}), danger);
      // El estado vigente se ve habilitado (no atenuado).
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('task_status_open')),
        -200,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('task_detail_list')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(
        tester
            .widget<ChoiceChip>(find.byKey(const ValueKey('task_status_open')))
            .onSelected,
        isNotNull,
      );
      // Cerrar vuelve a la pantalla de origen.
      await tester.tap(find.byKey(const ValueKey('task_close')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('task_detail_list')), findsNothing);
      expect(find.text('abrir detalle'), findsOneWidget);
    });
  }
  testWidgets('búsqueda y grupo combinan filtros de proyectos', (tester) async {
    await _pump(tester, const WorksListScreen());
    await _scrollWorks(
      tester,
      find.byKey(const ValueKey('works_group_filter')),
    );
    await tester.tap(find.byKey(const ValueKey('works_group_filter')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Diseño').last);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('work_w1')), findsNothing);
    expect(find.byKey(const ValueKey('work_w2')), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('works_search')),
      'no existe',
    );
    await tester.pumpAndSettle();
    expect(
      find.text('No hay resultados. Probá otra búsqueda o grupo.'),
      findsOneWidget,
    );
  });
  testWidgets('swipes ejecutan completar y Mi día sin descartar la fila', (
    tester,
  ) async {
    var done = 0, day = 0;
    await _pump(
      tester,
      Scaffold(
        body: ListView(
          children: [
            TaskTile(
              task: _task,
              onTap: () {},
              onToggleDone: () => done++,
              onToggleMyDay: () => day++,
            ),
          ],
        ),
      ),
    );
    final tile = find.byKey(const ValueKey('task_swipe_t1'));
    await tester.drag(tile, const Offset(300, 0));
    await tester.pumpAndSettle();
    expect(done, 1);
    expect(tile, findsOneWidget);
    await tester.drag(tile, const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(day, 1);
  });
  testWidgets('tarea sin permiso no habilita checkbox ni swipe', (
    tester,
  ) async {
    final task = Task.fromJson({
      'id': 'read',
      'displayText': 'Solo lectura',
      'canToggle': false,
      'canManageMyDay': false,
    });
    await _pump(
      tester,
      Scaffold(
        body: TaskTile(
          task: task,
          onTap: () {},
          onToggleDone: () => fail('sin permiso'),
          onToggleMyDay: () => fail('sin permiso'),
        ),
      ),
    );
    expect(find.byType(Dismissible), findsNothing);
    expect(tester.widget<Checkbox>(find.byType(Checkbox)).onChanged, isNull);
  });
  testWidgets(
    'el drawer conserva la búsqueda al recorrer todas las secciones',
    (tester) async {
      await _pump(tester, const WorksListScreen(), shell: true);
      await tester.enterText(
        find.byKey(const ValueKey('works_search')),
        'Cartelería',
      );
      for (final key in [
        'nav_day',
        'nav_sectors',
        'nav_notes',
        'nav_reminders',
        'nav_account',
        'nav_works',
      ]) {
        await tester.tap(find.byKey(const ValueKey('drawer_open')));
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.byKey(ValueKey(key)).hitTestable(),
          220,
          scrollable: find
              .descendant(
                of: find.byKey(const ValueKey('drawer_list')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await tester.tap(find.byKey(ValueKey(key)));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byType(NavigationBar), findsNothing);
        expect(
          tester.state<ScaffoldState>(find.byType(Scaffold).first).isDrawerOpen,
          false,
        );
      }
      expect(
        tester
                .widget<TextField>(find.byKey(const ValueKey('works_search')))
                .controller
                ?.text ??
            (tester.widget<EditableText>(
              find.byType(EditableText),
            )).controller.text,
        'Cartelería',
      );
      expect(find.byKey(const ValueKey('work_w1')), findsNothing);
    },
  );
  for (final dark in [false, true]) {
    testWidgets('drawer accesible y seleccionado a 150 %, tema $dark', (
      tester,
    ) async {
      await _pump(tester, const WorksListScreen(), shell: true, dark: dark);
      await tester.tap(find.byKey(const ValueKey('drawer_open')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(
        tester
            .widget<ListTile>(find.byKey(const ValueKey('nav_works')))
            .selected,
        true,
      );
      expect(find.text('Tomás'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('nav_account')).hitTestable(),
        220,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('drawer_list')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('nav_account'))).height,
        greaterThanOrEqualTo(48),
      );
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(
        tester.state<ScaffoldState>(find.byType(Scaffold).first).isDrawerOpen,
        false,
      );
      expect(find.byKey(const ValueKey('works_search')), findsOneWidget);
    });
  }
  for (final dark in [false, true]) {
    testWidgets(
      'DS-17 detalle de proyecto como la web: migas, resumen y pestañas '
      '(${dark ? "oscuro" : "claro"})',
      (tester) async {
        await _pump(tester, const WorkDetailScreen(workId: 'w1'), dark: dark);
        expect(tester.takeException(), isNull);
        final c = dark ? GenColors.dark : GenColors.light;
        // Migas «Todos los proyectos / Nombre».
        expect(
          find.byKey(const ValueKey('work_breadcrumb_root')),
          findsOneWidget,
        );
        expect(find.text('Todos los proyectos'), findsOneWidget);
        // Card de resumen con sus rótulos.
        expect(find.byType(WorkSummaryPanel), findsOneWidget);
        expect(
          find.descendant(
            of: find.byType(WorkSummaryPanel),
            matching: find.text('Señalética · Local Mendoza'),
          ),
          findsOneWidget,
        );
        for (final label in [
          'Avance',
          'Fecha límite',
          'Etiquetas',
          'Código / carpeta',
        ]) {
          expect(find.text(label), findsOneWidget, reason: label);
        }
        expect(find.text('Espacio personal'), findsOneWidget);
        expect(find.text('Activo'), findsOneWidget);
        expect(find.text('Sin fecha'), findsOneWidget);
        expect(find.text('GW-024'), findsOneWidget);
        // Nombre 20/700 y avance en brand.
        final name = tester.widget<Text>(
          find.descendant(
            of: find.byType(WorkSummaryPanel),
            matching: find.text('Señalética · Local Mendoza'),
          ),
        );
        expect(
          (name.style!.fontSize, name.style!.fontWeight),
          (20, FontWeight.w700),
        );
        expect(
          tester
              .widget<LinearProgressIndicator>(
                find.descendant(
                  of: find.byType(WorkSummaryPanel),
                  matching: find.byType(LinearProgressIndicator),
                ),
              )
              .color,
          c.brand,
        );
        // Pestañas (la lista es perezosa a 1.5×: se baja hasta ellas).
        await tester.scrollUntilVisible(
          find.byType(GenTabBar).hitTestable(),
          200,
          scrollable: find
              .descendant(
                of: find.byKey(const ValueKey('work_detail_list')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        expect(find.byType(GenTabBar), findsOneWidget);
        for (final tab in ['Tareas', 'Documentos', 'Archivos']) {
          expect(
            find.descendant(
              of: find.byType(GenTabBar),
              matching: find.text(tab),
            ),
            findsOneWidget,
            reason: tab,
          );
        }
        // Sección general con su rótulo.
        await tester.scrollUntilVisible(
          find.text('TAREAS GENERALES').hitTestable(),
          200,
          scrollable: find
              .descendant(
                of: find.byKey(const ValueKey('work_detail_list')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        expect(find.text('TAREAS GENERALES'), findsOneWidget);
      },
    );
  }
  testWidgets('DS-17 copiar código de carpeta usa el portapapeles', (
    tester,
  ) async {
    String? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          copied = (call.arguments as Map)['text'] as String?;
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    await _pump(tester, const WorkDetailScreen(workId: 'w1'), scale: 1);
    await tester.tap(find.byKey(const ValueKey('work_copy_code')));
    await tester.pump();
    expect(copied, 'GW-024');
    expect(find.text('Código copiado'), findsOneWidget);
  });
  testWidgets('volver a Proyectos conserva el detalle y su retroceso', (
    tester,
  ) async {
    await _pump(tester, const WorksListScreen(), shell: true);
    await _scrollWorks(tester, find.byKey(const ValueKey('work_w1')));
    await tester.tap(find.byKey(const ValueKey('work_w1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('work_detail_list')), findsOneWidget);
    tester.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nav_notes')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('drawer_open')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nav_works')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('work_detail_list')), findsOneWidget);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('works_search')), findsOneWidget);
  });
  testWidgets('crear tarea usa la sección elegida y respeta solo lectura', (
    tester,
  ) async {
    final actions = _TaskActionsFake();
    await _pump(tester, const WorkDetailScreen(workId: 'w1'), actions: actions);
    await tester.tap(
      find.byKey(const ValueKey('work_composer_section_general')),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Preparación de originales').last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('task_composer_field')),
      'Revisar medidas',
    );
    await tester.tap(find.byKey(const ValueKey('task_composer_send')));
    await tester.pumpAndSettle();
    expect(actions.objective, 'o1');
    await tester.pumpWidget(const SizedBox());
    await _pump(tester, const WorkDetailScreen(workId: 'w1'), readOnly: true);
    expect(find.byKey(const ValueKey('task_composer_field')), findsNothing);
  });
  testWidgets(
    'mención de sector no habilita edición aunque la tarea tenga permisos',
    (tester) async {
      await _pump(
        tester,
        Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showTaskDetail(
                context,
                _task,
                canEdit: false,
                readOnly: true,
              ),
              child: const Text('Abrir'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Abrir'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('task_text_field')))
            .enabled,
        false,
      );
      expect(find.byKey(const ValueKey('task_my_day_switch')), findsNothing);
    },
  );
  testWidgets(
    'salir de una nota espera el guardado y conserva cambios si falla',
    (tester) async {
      final repo = _NotesRepositoryFake();
      await _pump(
        tester,
        Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => const NoteDetailScreen(noteId: 'n1'),
                ),
              ),
              child: const Text('Abrir nota'),
            ),
          ),
        ),
        notesRepository: repo,
      );
      await tester.tap(find.text('Abrir nota'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('note_body')),
        'Medidas confirmadas',
      );
      await tester.pump();
      await tester.tap(find.byType(BackButton));
      await tester.pump();
      expect(find.byKey(const ValueKey('note_body')), findsOneWidget);
      repo.save.completeError(Exception('sin conexión'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('note_body')), findsOneWidget);
      expect(find.text('Medidas confirmadas'), findsOneWidget);
      repo.save = Completer<void>();
      await tester.pump();
      await tester.tap(find.byType(BackButton));
      await tester.pump();
      repo.save.complete();
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('note_body')), findsNothing);
    },
  );
  if (const bool.fromEnvironment('UI_PREVIEWS')) {
    for (final dark in [false, true]) {
      testWidgets('captura ${dark ? 'oscuro' : 'claro'}', (tester) async {
        debugDisableShadows = false;
        await _pump(
          tester,
          const WorksListScreen(),
          dark: dark,
          scale: 1,
          shell: true,
        );
        await tester.tap(find.byKey(const ValueKey('drawer_open')));
        await tester.pumpAndSettle();
        await tester.pumpAndSettle();
        expect(
          find.descendant(
            of: find.byType(Drawer),
            matching: find.byType(BrandName),
          ),
          findsOneWidget,
        );
        await tester.runAsync(() async {
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const ValueKey('preview')),
          );
          final picture = await boundary.toImage(pixelRatio: 2);
          final bytes = await picture.toByteData(
            format: ui.ImageByteFormat.png,
          );
          await File(
            '../.context/drawer-${dark ? 'dark' : 'light'}.png',
          ).writeAsBytes(bytes!.buffer.asUint8List());
          picture.dispose();
        });
        debugDisableShadows = true;
      });
    }
  }
  test('contraste AA en ambos temas', () {
    double contrast(Color a, Color b) {
      final x = a.computeLuminance(), y = b.computeLuminance();
      return ((x > y ? x : y) + .05) / ((x < y ? x : y) + .05);
    }

    for (final theme in [AppTheme.light(), AppTheme.dark()]) {
      final c = theme.colorScheme;
      for (final pair in [
        (c.onSurface, c.surface),
        (c.onSurfaceVariant, c.surface),
        (c.onPrimary, c.primary),
        (c.onPrimaryContainer, c.primaryContainer),
      ]) {
        expect(contrast(pair.$1, pair.$2), greaterThanOrEqualTo(4.5));
      }
    }
  });
}

class _TaskActionsFake implements TaskActions {
  String? objective;
  @override
  Future<Task> create(
    String text, {
    String? workId,
    String? sectorId,
    String? parentId,
    String? objectiveId,
  }) async {
    objective = objectiveId;
    return _task;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _NotesRepositoryFake implements NotesRepository {
  Completer<void> save = Completer<void>();
  @override
  Future<Note> update(String id, {String? title, Object? content}) async {
    await save.future;
    return _note;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _TestSession extends SessionController {
  @override
  Future<SessionState> build() async => SignedIn(
    serverUrl: Uri.parse('https://work.empresa.com'),
    token: 'test',
    user: AppUser.fromJson({
      'id': 'u1',
      'name': 'Tomás',
      'email': 'tomas@empresa.com',
      'role': 'MEMBER',
    }),
  );
}
