import 'package:genwork_mobile/features/documents/document_screen.dart';
import '../rich_editor_fake.dart';
import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/util/format.dart';
import 'package:genwork_mobile/core/util/system_timezone.dart';
import 'package:genwork_mobile/data/models/json.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/data/models/reminder.dart';
import 'package:genwork_mobile/data/repositories/reminders_repository.dart';
import 'package:genwork_mobile/features/my_day/merge_my_day_and_references.dart';
import 'package:genwork_mobile/features/my_day/my_day_providers.dart';
import 'package:genwork_mobile/shared/widgets/workspace_panel.dart';
import 'package:genwork_mobile/features/my_day/my_day_screen.dart';
import 'package:genwork_mobile/features/notes/note_detail_screen.dart';
import 'package:genwork_mobile/features/notes/notes_providers.dart';
import 'package:genwork_mobile/features/reminders/reminder_form_screen.dart';
import 'package:genwork_mobile/features/reminders/reminders_providers.dart';
import 'package:genwork_mobile/features/reminders/reminders_screen.dart';
import 'package:genwork_mobile/features/sectors/sector_detail_screen.dart';
import 'package:genwork_mobile/features/shell/live_refresher.dart';
import 'package:genwork_mobile/features/tasks/task_detail_sheet.dart';
import 'package:intl/date_symbol_data_local.dart';

Json taskJson(String id, {List<Json> children = const [], bool? canToggle}) => {
  'id': id,
  'rawText': 'Tarea $id',
  'displayText': 'Tarea $id',
  'status': {'id': 'open', 'name': 'Pendiente', 'type': 'IN_PROGRESS'},
  'statusOptions': [
    {'id': 'open', 'name': 'Pendiente', 'type': 'IN_PROGRESS'},
    {'id': 'done', 'name': 'Hecha', 'type': 'FINAL'},
  ],
  'canToggle': canToggle,
  'canManageMyDay': true,
  'subtasks': children,
  'subtaskCount': children.length,
};

class ApiHarness {
  ApiHarness(this.respond) {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) {
          requests.add(request);
          try {
            handler.resolve(
              Response(
                requestOptions: request,
                data: respond(request),
                statusCode: 200,
              ),
            );
          } catch (error) {
            handler.reject(DioException(requestOptions: request, error: error));
          }
        },
      ),
    );
    api = ApiClient(
      baseUrl: Uri.parse('https://test.invalid'),
      token: 'test',
      dio: dio,
    );
  }
  final Object? Function(RequestOptions) respond;
  final requests = <RequestOptions>[];
  late final ApiClient api;
}

Future<void> mount(
  WidgetTester tester,
  ProviderContainer container,
  Widget child,
) async {
  tester.view.physicalSize = const Size(900, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light(),
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: child,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  test('CAL-01 conserva permisos de Mi día y deduplica raíces e hijas', () {
    final child = taskJson('child', canToggle: false);
    final root = Task.fromJson(
      taskJson('root', children: [child], canToggle: true),
    );
    final duplicate = Task.fromJson(taskJson('root', canToggle: false));
    final refs = [
      duplicate,
      Task.fromJson(child),
      Task.fromJson(taskJson('other', children: [child])),
    ];
    final merged = mergeMyDayAndReferences([root], refs);
    expect(merged.myDay.single, same(root));
    expect(merged.myDay.single.canToggle, isTrue);
    expect(merged.myDay.single.subtasks.single.canToggle, isFalse);
    expect(merged.references.map((t) => t.id), ['other']);
    expect(merged.references.single.subtasks, isEmpty);
    expect(merged.references.single.subtaskCount, 1); // Conteo global intacto.
    expect(merged.referenceIds, containsAll(['root', 'child', 'other']));
  });

  testWidgets('CAL-01 una mención anidada aparece una vez con su indicador', (
    tester,
  ) async {
    final child = Task.fromJson(taskJson('child', canToggle: false));
    final root = Task.fromJson(
      taskJson('root', children: [taskJson('child', canToggle: false)]),
    );
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
        myDayProvider.overrideWith((ref) async => [root]),
        openReferencesProvider.overrideWith((ref) async => [child]),
        deliveriesProvider.overrideWith((ref) async => []),
      ],
    );
    addTearDown(container.dispose);
    await mount(tester, container, const MyDayScreen());
    expect(find.byKey(const ValueKey('task_child')), findsOneWidget);
    expect(find.text('Te mencionan'), findsOneWidget);
    expect(
      tester
          .widget<Checkbox>(find.byKey(const ValueKey('task_toggle_child')))
          .onChanged,
      isNull,
    );
  });

  testWidgets('QA10 el encabezado de Mi día usa el día del sistema', (
    tester,
  ) async {
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
        // Teléfono en UTC ya en sábado; el sistema (-03) sigue en viernes.
        reminderClockProvider.overrideWithValue(
          () => DateTime.parse('2027-03-06T00:41:00Z'),
        ),
        reminderTimezoneProvider.overrideWith(
          (ref) async => SystemTimezone('America/Argentina/Buenos_Aires'),
        ),
        myDayProvider.overrideWith(
          (ref) async => [Task.fromJson(taskJson('hoy'))],
        ),
        openReferencesProvider.overrideWith((ref) async => []),
        deliveriesProvider.overrideWith((ref) async => []),
      ],
    );
    addTearDown(container.dispose);
    await mount(tester, container, const MyDayScreen());
    expect(find.text('viernes 5 de marzo'), findsOneWidget);
  });

  testWidgets('DS-15 Mi día como la web: header, progreso y una sola card', (
    tester,
  ) async {
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
        myDayProvider.overrideWith(
          (ref) async => [
            Task.fromJson({
              ...taskJson('hoy'),
              'myDayAt': '2026-10-10T00:00:00Z',
              'work': {'id': 'w1', 'name': 'Señalética'},
            }),
          ],
        ),
        openReferencesProvider.overrideWith(
          (ref) async => [Task.fromJson(taskJson('ref'))],
        ),
        deliveriesProvider.overrideWith((ref) async => []),
      ],
    );
    addTearDown(container.dispose);
    await mount(tester, container, const MyDayScreen());
    expect(find.text('Mi día y referencias'), findsOneWidget);
    expect(
      find.text(
        'Primero lo que hay que hacer hoy, después las tareas que necesitan tu aporte.',
      ),
      findsOneWidget,
    );
    expect(find.text('Mi día: 0 de 1 completadas hoy'), findsOneWidget);
    // Una sola card (WorkspaceListPanel) para Mi día + referencias, sin
    // encabezados de sección.
    expect(find.byType(WorkspaceListPanel), findsOneWidget);
    expect(find.text('Pendientes'), findsNothing);
    expect(find.text('Mi día'), findsOneWidget);
    expect(find.text('Referencia'), findsOneWidget);
    expect(find.byKey(const ValueKey('my_day_source_hoy')), findsOneWidget);
    expect(find.byKey(const ValueKey('task_toggle_hoy')), findsOneWidget);
    // La campana va en el AppBar, no en el encabezado.
    expect(
      find.descendant(
        of: find.byType(AppBar),
        matching: find.byKey(const ValueKey('deliveries_button')),
      ),
      findsOneWidget,
    );
  });

  testWidgets('DS-15 Mi día vacío usa el texto de la web', (tester) async {
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
        myDayProvider.overrideWith((ref) async => <Task>[]),
        openReferencesProvider.overrideWith((ref) async => <Task>[]),
        deliveriesProvider.overrideWith((ref) async => []),
      ],
    );
    addTearDown(container.dispose);
    await mount(tester, container, const MyDayScreen());
    expect(
      find.textContaining('No tenés tareas para hoy ni referencias pendientes'),
      findsOneWidget,
    );
    expect(find.byType(WorkspaceListPanel), findsNothing);
  });

  for (final level in ['operate', 'read']) {
    testWidgets('CAL-02 referencias con acceso $level y denegación por tarea', (
      tester,
    ) async {
      final allowed = taskJson('allowed');
      final denied = taskJson('denied', canToggle: false);
      final harness = ApiHarness((r) {
        if (r.path == '/api/sectors/s/tasks') {
          return {
            'sector': {'id': 's', 'name': 'Sector'},
            'level': level,
            'refs': [allowed, denied],
          };
        }
        if (r.path.endsWith('/status')) return {};
        throw StateError('Ruta inesperada ${r.path}');
      });
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
          apiClientProvider.overrideWithValue(harness.api),
        ],
      );
      addTearDown(container.dispose);
      await mount(tester, container, const SectorDetailScreen(sectorId: 's'));
      final toggle = find.byKey(const ValueKey('task_toggle_allowed'));
      expect(
        tester.widget<Checkbox>(toggle).onChanged != null,
        level == 'operate',
      );
      expect(
        tester
            .widget<Checkbox>(find.byKey(const ValueKey('task_toggle_denied')))
            .onChanged,
        isNull,
      );
      if (level == 'operate') {
        await tester.tap(toggle);
        await tester.pumpAndSettle();
        expect(
          harness.requests
              .where((r) => r.path == '/api/tasks/allowed/status')
              .single
              .data,
          {'statusId': 'done'},
        );
      }
      await tester.tap(find.byKey(const ValueKey('task_allowed')));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('task_text_field')))
            .enabled,
        isFalse,
      );
      expect(
        tester
                .widget<ChoiceChip>(
                  find.byKey(const ValueKey('task_status_done')),
                )
                .onSelected !=
            null,
        level == 'operate',
      );
      expect(
        harness.requests.any((r) => r.path.startsWith('/api/works')),
        isFalse,
      );
    });
  }

  test('CAL-02 texto de sector editable solo antes de ser adoptado', () {
    final loose = Task.fromJson({...taskJson('loose'), 'originType': 'SECTOR'});
    final adopted = Task.fromJson({
      ...taskJson('adopted'),
      'originType': 'SECTOR',
      'adoptedAt': '2026-10-09T00:00:00Z',
    });
    expect(loose.canEditText(fromSector: true), isTrue);
    expect(adopted.canEditText(fromSector: true), isFalse);
    expect(adopted.canEditText(fromSector: false), isTrue);
  });

  test('CAL-03 día del sistema a ambos lados de medianoche y durante DST', () {
    final west = SystemTimezone('America/Argentina/Mendoza');
    final east = SystemTimezone('Asia/Tokyo');
    expect(
      west.today(DateTime.parse('2026-10-09T01:00:00Z')),
      DateTime.utc(2026, 10, 8),
    );
    expect(
      east.today(DateTime.parse('2026-10-09T23:00:00Z')),
      DateTime.utc(2026, 10, 10),
    );
    final ny = SystemTimezone('America/New_York');
    expect(
      ny.today(DateTime.parse('2026-03-08T04:59:00Z')),
      DateTime.utc(2026, 3, 7),
    );
    expect(
      ny.today(DateTime.parse('2026-03-08T07:01:00Z')),
      DateTime.utc(2026, 3, 8),
    );
    expect(
      formatDay(DateTime.utc(2026, 3, 9), now: DateTime.utc(2026, 3, 8)),
      'mañana',
    );
    expect(() => SystemTimezone('Invalid/Zone'), throwsA(isA<Exception>()));
  });

  test(
    'CAL-03 consulta timezone y manda rango y fechas sin conversión local',
    () async {
      final harness = ApiHarness(
        (r) => r.path.endsWith('/timezone')
            ? {'timezone': 'America/Argentina/Mendoza'}
            : {'reminders': [], 'occurrences': []},
      );
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
          apiClientProvider.overrideWithValue(harness.api),
          reminderClockProvider.overrideWithValue(
            () => DateTime.parse('2026-10-09T01:00:00Z'),
          ),
        ],
      );
      addTearDown(container.dispose);
      await container.read(upcomingRemindersProvider.future);
      final request = harness.requests.last;
      expect(harness.requests.first.path, '/api/reminders/timezone');
      expect(request.queryParameters, {
        'from': '2026-10-08T00:00:00.000Z',
        'to': '2026-12-07T00:00:00.000Z',
      });
      final reminder = Reminder.fromJson({
        'id': 'r',
        'date': '2026-10-09T00:00:00Z',
      });
      expect(
        ReminderInput(title: 'Prueba', date: reminder.date).toJson()['date'],
        '2026-10-09T00:00:00.000Z',
      );
    },
  );

  testWidgets('CAL-03 reintentar agenda vuelve a consultar la zona fallida', (
    tester,
  ) async {
    var fail = true;
    final harness = ApiHarness((r) {
      if (r.path.endsWith('/timezone')) {
        if (fail) throw StateError('Sin conexión');
        return {'timezone': 'UTC'};
      }
      return {'reminders': [], 'occurrences': []};
    });
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
        apiClientProvider.overrideWithValue(harness.api),
        deliveriesProvider.overrideWith((ref) async => []),
      ],
    );
    addTearDown(container.dispose);
    await mount(tester, container, const RemindersScreen());
    fail = false;
    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();
    expect(find.text('Sin recordatorios próximos'), findsOneWidget);
    expect(
      harness.requests.where((r) => r.path.endsWith('/timezone')).length,
      2,
    );
  });

  for (final editing in [false, true]) {
    testWidgets(
      'CAL-03 formulario ${editing ? 'edita sin cambiar fecha/hora' : 'inicia en el día del sistema'}',
      (tester) async {
        final harness = ApiHarness((r) {
          if (r.path.endsWith('/timezone')) {
            return {'timezone': 'America/Argentina/Mendoza'};
          }
          if (r.method == 'GET') {
            return {
              'canMutate': true,
              'reminder': {
                'id': 'r',
                'title': 'Aviso existente',
                'date': '2026-10-10T00:00:00Z',
                'leads': [
                  {'daysBefore': 2, 'minuteOfDay': 570},
                ],
              },
            };
          }
          return {};
        });
        final container = ProviderContainer(
          retry: (_, _) => null,
          overrides: [
            richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
            apiClientProvider.overrideWithValue(harness.api),
            reminderClockProvider.overrideWithValue(
              () => DateTime.parse('2026-10-09T01:00:00Z'),
            ),
          ],
        );
        addTearDown(container.dispose);
        await mount(
          tester,
          container,
          ReminderFormScreen(reminderId: editing ? 'r' : null),
        );
        expect(
          find.text('Zona horaria del sistema: America/Argentina/Mendoza'),
          findsOneWidget,
        );
        if (!editing) {
          expect(find.text('hoy'), findsOneWidget);
          await tester.enterText(
            find.byKey(const ValueKey('reminder_title')),
            'Nuevo aviso',
          );
        } else {
          expect(find.text('09:30'), findsOneWidget);
        }
        await tester.tap(find.byKey(const ValueKey('reminder_save')));
        await tester.pumpAndSettle();
        final body = harness.requests.last.data as Map;
        expect(
          body['date'],
          editing ? '2026-10-10T00:00:00.000Z' : '2026-10-08T00:00:00.000Z',
        );
        if (editing) {
          expect(body['leads'], [
            {'daysBefore': 2, 'minuteOfDay': 570},
          ]);
        }
      },
    );
  }

  testWidgets(
    'CAL-03 error al consultar zona permite reintentar, sin guardar a ciegas',
    (tester) async {
      var fail = true;
      final harness = ApiHarness((r) {
        if (fail) throw StateError('Sin conexión');
        return {'timezone': 'UTC'};
      });
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
          apiClientProvider.overrideWithValue(harness.api),
        ],
      );
      addTearDown(container.dispose);
      await mount(tester, container, const ReminderFormScreen());
      expect(find.byKey(const ValueKey('reminder_save')), findsNothing);
      fail = false;
      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('reminder_save')), findsOneWidget);
    },
  );

  testWidgets(
    'CAL-04 crear subtarea y editar texto actualiza hoja sin reabrir ni pisar borradores',
    (tester) async {
      var root = {...taskJson('root'), 'workId': 'w'};
      final harness = ApiHarness((r) {
        if (r.path == '/api/works/w') {
          return {
            'id': 'w',
            'access': 'operate',
            'tasks': [root],
          };
        }
        if (r.path == '/api/tasks' && r.method == 'POST') {
          final child = {
            ...taskJson('child'),
            'displayText': 'Nueva hija',
            'parentId': 'root',
            'workId': 'w',
          };
          root = {
            ...root,
            'subtasks': [child],
            'subtaskCount': 1,
          };
          return child;
        }
        if (r.path == '/api/tasks/root' && r.method == 'PATCH') {
          root = {
            ...root,
            'rawText': (r.data as Map)['rawText'],
            'labels': [
              {'keyName': 'Prioridad', 'valueName': 'Urgente'},
            ],
          };
          return root;
        }
        throw StateError('Ruta inesperada ${r.path}');
      });
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
          apiClientProvider.overrideWithValue(harness.api),
        ],
      );
      addTearDown(container.dispose);
      await mount(
        tester,
        container,
        Scaffold(
          body: TaskDetailSheet(
            task: Task.fromJson(root),
            canEdit: true,
            canManageMyDay: true,
            fromSector: false,
            workId: 'w',
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const ValueKey('task_description_field')),
        'Borrador sin guardar',
      );
      await tester.enterText(
        find.byKey(const ValueKey('task_composer_field')),
        'Nueva hija',
      );
      await tester.tap(find.byKey(const ValueKey('task_composer_send')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('task_subtask_child')), findsOneWidget);
      expect(find.text('Borrador sin guardar'), findsOneWidget);
      expect(
        tester
            .widget<ChoiceChip>(find.byKey(const ValueKey('task_status_done')))
            .onSelected,
        isNull,
      );
      await tester.enterText(
        find.byKey(const ValueKey('task_text_field')),
        'Tarea actualizada',
      );
      await tester.tap(find.byKey(const ValueKey('task_text_save')));
      await tester.pumpAndSettle();
      expect(find.text('Prioridad: Urgente'), findsOneWidget);
      expect(find.text('Borrador sin guardar'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final dirty in [false, true]) {
    testWidgets(
      'CAL-05 al volver refresca notas/agenda y ${dirty ? 'conserva borrador' : 'actualiza nota abierta'}',
      (tester) async {
        var title = 'Nota inicial';
        var body = 'Texto inicial';
        Object? doc() => {
          'type': 'doc',
          'content': [
            {
              'type': 'paragraph',
              'content': [
                {'type': 'text', 'text': body},
              ],
            },
          ],
        };
        final harness = ApiHarness((r) {
          // An unsaved local draft must survive a failed background autosave.
          if (r.path == '/api/notes/n' && r.method == 'PATCH') {
            throw StateError('Sin conexión para guardar');
          }
          if (r.path == '/api/notes/n') {
            return {'id': 'n', 'title': title, 'content': doc()};
          }
          if (r.path == '/api/notes') {
            return [
              {'id': 'n', 'title': title, 'content': doc()},
            ];
          }
          if (r.path == '/api/reminders/timezone') return {'timezone': 'UTC'};
          if (r.path == '/api/reminders') {
            return {'reminders': [], 'occurrences': []};
          }
          throw StateError('Ruta inesperada ${r.path}');
        });
        final container = ProviderContainer(
          retry: (_, _) => null,
          overrides: [
            richEditorBuilderProvider.overrideWithValue(fakeRichEditor),
            apiClientProvider.overrideWithValue(harness.api),
            liveEventsProvider.overrideWithValue(const Stream.empty()),
          ],
        );
        addTearDown(container.dispose);
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        container.listen(liveRefresherProvider, (_, _) {});
        container.listen(notesProvider, (_, _) {});
        container.listen(upcomingRemindersProvider, (_, _) {});
        await mount(tester, container, const NoteDetailScreen(noteId: 'n'));
        if (dirty) {
          await tester.enterText(
            find.byKey(const ValueKey('note_body')),
            'Borrador local',
          );
        }
        for (final state in [
          AppLifecycleState.inactive,
          AppLifecycleState.hidden,
          AppLifecycleState.paused,
        ]) {
          tester.binding.handleAppLifecycleStateChanged(state);
        }
        title = 'Cambio desde web';
        body = 'Nuevo texto remoto';
        for (final state in [
          AppLifecycleState.hidden,
          AppLifecycleState.inactive,
          AppLifecycleState.resumed,
        ]) {
          tester.binding.handleAppLifecycleStateChanged(state);
        }
        await tester.pumpAndSettle();
        expect(harness.requests.where((r) => r.path == '/api/notes').length, 2);
        expect(
          harness.requests.where((r) => r.path == '/api/reminders').length,
          2,
        );
        expect(
          container.read(notesProvider).requireValue.single.title,
          'Cambio desde web',
        );
        expect(
          find.text(dirty ? 'Borrador local' : 'Nuevo texto remoto'),
          findsOneWidget,
        );
        expect(
          find.text(dirty ? 'Nota inicial' : 'Cambio desde web'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
