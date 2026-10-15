import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/session_controller.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/app_router.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/board.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/data/models/live_event.dart';
import 'package:genwork_mobile/features/board/board_providers.dart';
import 'package:genwork_mobile/features/my_day/my_day_progress.dart';
import 'package:genwork_mobile/features/reminders/reminders_providers.dart';
import 'package:genwork_mobile/features/shell/live_refresher.dart';
import 'package:genwork_mobile/shared/widgets/count_badge.dart';
import 'package:genwork_mobile/features/tasks/task_actions.dart';
import 'package:genwork_mobile/features/sectors/sector_actions_menu.dart';
import 'package:genwork_mobile/features/works/work_actions_menu.dart';
import 'daily_parity_test.dart' show taskJson;
import 'resource_operations_test.dart' show user, tap, Json;

Json boardTask(
  String id, {
  bool done = false,
  int children = 0,
  int finished = 0,
  String? parent,
}) => {
  'id': id,
  'text': 'Tarea $id',
  'status': {
    'id': done ? 'done' : 'open',
    'name': done ? 'Finalizada' : 'Produciendo',
    'type': done ? 'FINAL' : 'IN_PROGRESS',
    'color': '#22c55e',
  },
  'workName': 'Proyecto ejemplo',
  'workColor': '#8b5cf6',
  'objectiveTitle': 'Entrega',
  'subtaskCount': children,
  'subtaskDone': finished,
  'parentId': parent,
  'parentText': parent == null ? null : 'Tarea principal',
};

class Fixture {
  final requests = <RequestOptions>[];
  final events = StreamController<LiveEvent>.broadcast();
  bool failBoard = false,
      failDelivery = false,
      failAction = false,
      failLogout = false;
  int logoutCalls = 0;
  Completer<void>? gate;
  List<Json> day = [
    {
      ...taskJson(
        'root',
        children: [
          taskJson('a', canToggle: true),
          {
            ...taskJson('b'),
            'status': {'id': 'done', 'name': 'Hecha', 'type': 'FINAL'},
          },
        ],
      ),
      'work': {'id': 'w', 'name': 'Proyecto ejemplo'},
      'objective': {'id': 'o', 'title': 'Entrega'},
      'myDayAt': '2026-10-09T12:00:00Z',
    },
    {
      ...taskJson('loose', canToggle: false),
      'homeSector': {'id': 's', 'name': 'Diseño'},
      'myDayAt': '2026-10-09T12:00:00Z',
    },
  ];
  List<Json> refs = [
    taskJson('a', canToggle: true),
    taskJson('reference', canToggle: false),
  ];
  List<Json> columns = [
    {
      'sector': {'id': 's', 'name': 'Diseño', 'color': '#8b5cf6'},
      'tasks': [
        boardTask('parent', done: true, children: 2, finished: 1),
        boardTask('a', parent: 'parent'),
        boardTask('b', done: true, parent: 'parent'),
      ],
    },
    {
      'sector': {'id': 's2', 'name': 'Impresión', 'color': '#22c55e'},
      'tasks': [boardTask('a'), boardTask('c')],
    },
  ];
  List<Json> deliveries = [
    {
      'id': 'd',
      'title': 'Entrega de prueba',
      'description': 'Revisar antes de entregar',
      'occurrenceDate': '2026-10-08T00:00:00Z',
      'firedAt': '2026-10-09T10:00:00Z',
      'linkAvailable': true,
      'linkPath': '/works/w',
      'linkLabel': 'Proyecto ejemplo',
    },
  ];
  late final api = _client();
  ApiClient _client() {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) async {
          requests.add(r);
          if (r.method != 'GET') await gate?.future;
          final fail =
              (failBoard && r.path == '/api/board') ||
              (failDelivery && r.path == '/api/reminders/deliveries') ||
              (failAction && r.method != 'GET');
          if (fail) {
            h.reject(
              DioException(
                requestOptions: r,
                type: DioExceptionType.badResponse,
                response: Response(
                  requestOptions: r,
                  statusCode: 503,
                  data: {
                    'error': {
                      'code': 'UNAVAILABLE',
                      'message': 'No se pudo actualizar',
                    },
                  },
                ),
              ),
            );
          } else {
            h.resolve(
              Response(requestOptions: r, statusCode: 200, data: respond(r)),
            );
          }
        },
      ),
    );
    return ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio);
  }

  Object? respond(RequestOptions r) {
    if (r.path == '/api/board') return columns;
    if (r.path == '/api/me/my-day') return day;
    if (r.path == '/api/me/references') return refs;
    if (r.path == '/api/reminders/deliveries') {
      return {'deliveries': deliveries};
    }
    if (r.path.startsWith('/api/reminders/deliveries/')) {
      deliveries = [];
      return {};
    }
    if (r.path == '/api/reminders/timezone') {
      return {'timezone': 'America/Argentina/Mendoza'};
    }
    if (r.path == '/api/reminders') return {'reminders': [], 'occurrences': []};
    if (r.path == '/api/works/w') {
      return {
        'id': 'w',
        'name': 'Proyecto ejemplo',
        'status': 'ACTIVE',
        'access': 'read',
        'tasks': [],
        'objectives': [],
      };
    }
    if (r.path == '/api/sectors/s/tasks') {
      return {
        'sector': {'id': 's', 'name': 'Diseño'},
        'level': 'read',
        'loose': [],
        'byWork': [],
        'refs': [],
      };
    }
    if (r.path.endsWith('/status')) {
      final id = r.path.split('/')[3];
      for (final task in day) {
        for (final sub in task['subtasks'] as List) {
          if (sub['id'] == id) {
            sub['status'] = {'id': 'done', 'name': 'Hecha', 'type': 'FINAL'};
          }
        }
      }
      return {};
    }
    return [];
  }
}

class TestSession extends SessionController {
  TestSession(this.f);
  final Fixture f;
  @override
  Future<SessionState> build() async => SignedIn(
    serverUrl: Uri.parse('https://test.invalid'),
    token: 'test',
    user: user(),
  );
  @override
  Future<void> logout() async {
    f.logoutCalls++;
    await f.gate?.future;
    if (f.failLogout) throw StateError('No se pudo salir');
    state = AsyncData(SignedOut(Uri.parse('https://test.invalid')));
  }
}

Future<({GoRouter router, ProviderContainer container})> mount(
  WidgetTester t,
  Fixture f, {
  String path = '/board',
  bool dark = false,
  double scale = 1,
}) async {
  t.view.physicalSize = const Size(360, 800);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  final c = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      sessionProvider.overrideWith(() => TestSession(f)),
      apiClientProvider.overrideWithValue(f.api),
      liveEventsProvider.overrideWithValue(f.events.stream),
    ],
  );
  addTearDown(c.dispose);
  addTearDown(f.events.close);
  await c.read(sessionProvider.future);
  final router = c.read(routerProvider);
  // routerProvider es dueño del router y lo dispone junto al container.
  router.go(path);
  await t.pumpWidget(
    UncontrolledProviderScope(
      container: c,
      child: MaterialApp.router(
        routerConfig: router,
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
  await t.pumpAndSettle();
  return (router: router, container: c);
}

Future<void> drawer(WidgetTester t, String key) async {
  t.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
  await t.pumpAndSettle();
  final scroll = find
      .descendant(
        of: find.byKey(const ValueKey('drawer_list')),
        matching: find.byType(Scrollable),
      )
      .first;
  t.state<ScrollableState>(scroll).position.jumpTo(0);
  await t.pumpAndSettle();
  await t.scrollUntilVisible(
    find.byKey(ValueKey(key)).hitTestable(),
    200,
    scrollable: scroll,
  );
  await tap(t, key);
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));
  test(
    'progreso del panorama excluye contenedoras y deduplica entre sectores',
    () {
      final columns = Fixture().columns.map(BoardColumn.fromJson).toList();
      expect(
        columns.first.tasks.first.isDone,
        isFalse,
      ); // Estado espejo se ignora.
      expect(columns.first.progress.total, 2);
      expect(columns.first.progress.done, 1);
      final all = boardProgress(columns);
      expect(all.total, 3);
      expect(all.done, 1);
      final complete = BoardTask.fromJson(
        boardTask('parent', children: 2, finished: 2),
      );
      expect(complete.isDone, isTrue);
      expect(
        BoardTask.fromJson({...boardTask('x'), 'workName': null}).contextLabel,
        'Sin proyecto',
      );
      expect(
        columns.first.tasks.first.contextLabel,
        'Proyecto ejemplo › Entrega',
      );
    },
  );
  test(
    'Mi día cuenta hijas, conserva contexto y no usa conteos de otros ámbitos',
    () {
      final f = Fixture();
      final tasks = f.day.map(Task.fromJson).toList();
      final p = myDayProgress(tasks);
      expect(p.total, 3);
      expect(p.done, 1);
      expect(myDaySourceLabel(tasks.first), 'Proyecto ejemplo › Entrega');
      expect(myDaySourceLabel(tasks.last), 'Diseño');
      final standalone = Task.fromJson({
        ...taskJson('sub'),
        'parentText': 'Principal',
      });
      expect(myDaySourceLabel(standalone), 'Principal');
      expect(
        myDayProgress([
          Task.fromJson({...taskJson('root'), 'subtaskCount': 8}),
        ]).total,
        1,
      );
    },
  );
  testWidgets(
    'panorama muestra contexto y estado, oculta finalizadas y no expone edición',
    (t) async {
      await mount(t, Fixture());
      expect(find.text('2 tareas pendientes · 2 sectores'), findsOneWidget);
      expect(find.byKey(const ValueKey('board_task_s_parent')), findsOneWidget);
      expect(find.byKey(const ValueKey('board_task_s_b')), findsNothing);
      expect(find.text('1/2 subtareas'), findsOneWidget);
      expect(find.text('Subtarea de: Tarea principal'), findsOneWidget);
      expect(find.byType(Checkbox), findsNothing);
      expect(find.byType(TextField), findsNothing);
      await tap(t, 'board_open_sector_s');
      expect(find.text('Diseño'), findsWidgets);
    },
  );
  testWidgets('borrar sector desde panorama no deja un detalle obsoleto', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f);
    await tap(t, 'board_open_sector_s');
    f.columns = [];
    t.widget<SectorActionsMenu>(find.byType(SectorActionsMenu)).onDeleted();
    await t.pumpAndSettle();
    await drawer(t, 'nav_board');
    expect(find.byKey(const ValueKey('board_list')), findsOneWidget);
    expect(find.byKey(const ValueKey('sector_board_list')), findsNothing);
  });
  testWidgets('borrar proyecto desde Mi día no deja un detalle obsoleto', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, path: Routes.myDay);
    await tap(t, 'my_day_source_root');
    f.day = [];
    t.widget<WorkActionsMenu>(find.byType(WorkActionsMenu)).onDeleted();
    await t.pumpAndSettle();
    await drawer(t, 'nav_day');
    expect(find.byKey(const ValueKey('my_day_list')), findsOneWidget);
    expect(find.byType(WorkActionsMenu), findsNothing);
  });
  testWidgets(
    'DS-19 Vista de tareas como la web: encabezado, resumen y cards',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      expect(find.text('Vista de tareas'), findsOneWidget);
      expect(find.text('Avance y pendientes de cada sector.'), findsOneWidget);
      // Resumen en una línea + «D de T finalizadas» (sin barra global).
      expect(find.byKey(const ValueKey('board_summary')), findsOneWidget);
      expect(find.textContaining('finalizadas'), findsWidgets);
      // Card por sector con acento, conteo y avance.
      final card = find.byKey(const ValueKey('board_sector_s'));
      expect(card, findsOneWidget);
      expect(
        find.descendant(
          of: card,
          matching: find.byType(LinearProgressIndicator),
        ),
        findsOneWidget,
      );
      // Las tareas pendientes viven en el pie sobre `field`.
      expect(find.byKey(const ValueKey('board_task_s_a')), findsOneWidget);
      expect(
        find.byKey(const ValueKey('board_task_s_b')),
        findsNothing,
      ); // hecha
    },
  );
  testWidgets(
    'sector con solo contenedoras no inventa progreso ni tareas completas',
    (t) async {
      final f = Fixture()
        ..columns = [
          {
            'sector': {'id': 's', 'name': 'Diseño'},
            'tasks': [boardTask('p', children: 3, finished: 1)],
          },
        ];
      await mount(t, f);
      expect(find.text('Avance en las subtareas'), findsOneWidget);
      expect(find.text('0 tareas pendientes · 1 sector'), findsOneWidget);
      expect(find.text('Tarea p'), findsOneWidget);
    },
  );
  testWidgets(
    'carga, error inicial, reintento y error de actualización conserva snapshot',
    (t) async {
      final f = Fixture()..failBoard = true;
      final app = await mount(t, f);
      expect(find.text('No se pudo actualizar'), findsOneWidget);
      f.failBoard = false;
      await t.tap(find.text('Reintentar'));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('board_summary')), findsOneWidget);
      f.failBoard = true;
      app.container.invalidate(boardProvider);
      await t.pumpAndSettle();
      expect(
        find.text('Se muestran los últimos datos recibidos.'),
        findsOneWidget,
      );
      expect(find.text('Tarea parent'), findsOneWidget);
    },
  );
  testWidgets('SSE, mutación local y reanudar actualizan el panorama', (
    t,
  ) async {
    final f = Fixture();
    final app = await mount(t, f);
    int calls() => f.requests.where((r) => r.path == '/api/board').length;
    final initial = calls();
    f.events.add(const TaskChanged(taskId: 'a', workId: null, sectorIds: []));
    await t.pumpAndSettle();
    expect(calls(), greaterThan(initial));
    final after = calls();
    app.container.read(taskActionsProvider).refreshAll();
    await t.pumpAndSettle();
    expect(calls(), greaterThan(after));
    final beforeResume = calls();
    for (final state in [
      AppLifecycleState.inactive,
      AppLifecycleState.hidden,
      AppLifecycleState.paused,
    ]) {
      t.binding.handleAppLifecycleStateChanged(state);
    }
    await t.pump();
    for (final state in [
      AppLifecycleState.hidden,
      AppLifecycleState.inactive,
      AppLifecycleState.resumed,
    ]) {
      t.binding.handleAppLifecycleStateChanged(state);
    }
    await t.pumpAndSettle();
    expect(calls(), greaterThan(beforeResume));
  });
  testWidgets(
    'Mi día muestra progreso hoja, conserva permisos, enlaza origen y refresca al completar',
    (t) async {
      final f = Fixture();
      final app = await mount(t, f, path: Routes.myDay);
      expect(find.text('Mi día: 1 de 3 completadas hoy'), findsOneWidget);
      expect(find.byKey(const ValueKey('task_a')), findsOneWidget);
      expect(
        t
            .widget<Checkbox>(find.byKey(const ValueKey('task_toggle_loose')))
            .onChanged,
        isNull,
      );
      await tap(t, 'task_toggle_a');
      final scroll = find
          .descendant(
            of: find.byKey(const ValueKey('my_day_list')),
            matching: find.byType(Scrollable),
          )
          .first;
      t.state<ScrollableState>(scroll).position.jumpTo(0);
      await t.pumpAndSettle();
      expect(find.text('Mi día: 2 de 3 completadas hoy'), findsOneWidget);
      await tap(t, 'my_day_source_root');
      expect(find.text('Proyecto ejemplo'), findsWidgets);
      app.router.pop();
      await t.pumpAndSettle();
      await t.scrollUntilVisible(
        find.byKey(const ValueKey('my_day_source_loose')),
        200,
        scrollable: find.byType(Scrollable).last,
      );
      await tap(t, 'my_day_source_loose');
      expect(find.text('Diseño'), findsWidgets);
    },
  );
  testWidgets(
    'Vence hoy usa avisos pendientes sin filtrar por fecha ni cargar agenda',
    (t) async {
      final f = Fixture();
      final app = await mount(t, f);
      await drawer(t, 'nav_due_today');
      expect(
        app.router.routeInformationProvider.value.uri.path,
        Routes.dueToday,
      );
      expect(find.text('Entrega de prueba'), findsOneWidget);
      expect(find.textContaining('Revisar antes de entregar'), findsOneWidget);
      expect(find.text('Próximos 60 días'), findsNothing);
      expect(f.requests.where((r) => r.path == '/api/reminders'), isEmpty);
      await tap(t, 'delivery_d');
      expect(find.text('Proyecto ejemplo'), findsWidgets);
    },
  );
  testWidgets(
    'avisos: posponer y descartar, errores conservan aviso y bloqueo durante envío',
    (t) async {
      final f = Fixture();
      final app = await mount(t, f, path: Routes.dueToday);
      await tap(t, 'delivery_menu_d');
      await t.tap(find.text('Descartar'));
      f.failAction = true;
      await t.pumpAndSettle();
      expect(find.text('Entrega de prueba'), findsOneWidget);
      f.failAction = false;
      f.gate = Completer<void>();
      await tap(t, 'delivery_menu_d');
      await t.tap(find.text('Posponer 1 hora'));
      await t.pump();
      expect(
        t
            .widget<PopupMenuButton<String>>(
              find.byKey(const ValueKey('delivery_menu_d')),
            )
            .enabled,
        isFalse,
      );
      f.gate!.complete();
      await t.pumpAndSettle();
      expect(f.requests.lastWhere((r) => r.method == 'PATCH').data, {
        'action': 'SNOOZE',
        'preset': '1h',
      });
      expect(find.text('No tenés avisos pendientes.'), findsOneWidget);
      expect(app.container.read(deliveriesProvider).value, isEmpty);
    },
  );
  testWidgets(
    'contador de Vence hoy sigue los avisos al posponer y descartar',
    (t) async {
      final f = Fixture();
      final original = {...f.deliveries.single};
      final app = await mount(t, f);
      await drawer(t, 'nav_due_today');
      for (final action in ['Posponer a mañana', 'Descartar']) {
        f.deliveries = [original];
        app.container.invalidate(deliveriesProvider);
        await t.pumpAndSettle();
        await drawer(t, 'nav_board');
        t.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
        await t.pumpAndSettle();
        final scroll = find
            .descendant(
              of: find.byKey(const ValueKey('drawer_list')),
              matching: find.byType(Scrollable),
            )
            .first;
        await t.scrollUntilVisible(
          find.byKey(const ValueKey('nav_due_today')).hitTestable(),
          200,
          scrollable: scroll,
        );
        expect(
          t
              .widget<CountBadge>(
                find.byKey(const ValueKey('nav_due_today_total')),
              )
              .count,
          1,
        );
        await tap(t, 'nav_due_today');
        await tap(t, 'delivery_menu_d');
        await t.tap(find.text(action));
        await t.pumpAndSettle();
        expect(
          f.requests.lastWhere((r) => r.method == 'PATCH').data,
          action == 'Descartar'
              ? {'action': 'DISMISS'}
              : {'action': 'SNOOZE', 'preset': 'tomorrow'},
        );
        await drawer(t, 'nav_board');
        t.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
        await t.pumpAndSettle();
        await t.scrollUntilVisible(
          find.byKey(const ValueKey('nav_due_today')).hitTestable(),
          200,
          scrollable: find
              .descendant(
                of: find.byKey(const ValueKey('drawer_list')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        expect(find.byKey(const ValueKey('nav_due_today_total')), findsNothing);
        await tap(t, 'nav_due_today');
      }
    },
  );

  testWidgets(
    'poll de avisos se pausa en segundo plano y refresca al reanudar',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      int calls() =>
          f.requests.where((r) => r.path == '/api/reminders/deliveries').length;
      final first = calls();
      await t.pump(const Duration(seconds: 61));
      await t.pumpAndSettle();
      expect(calls(), greaterThan(first));
      for (final state in [
        AppLifecycleState.inactive,
        AppLifecycleState.hidden,
        AppLifecycleState.paused,
      ]) {
        t.binding.handleAppLifecycleStateChanged(state);
      }
      await t.pump();
      final paused = calls();
      await t.pump(const Duration(seconds: 61));
      expect(calls(), paused);
      for (final state in [
        AppLifecycleState.hidden,
        AppLifecycleState.inactive,
        AppLifecycleState.resumed,
      ]) {
        t.binding.handleAppLifecycleStateChanged(state);
      }
      await t.pumpAndSettle();
      expect(calls(), greaterThan(paused));
    },
  );
  testWidgets(
    'menú navega a panorama y cerrar sesión bloquea doble envío y redirige',
    (t) async {
      final f = Fixture();
      final app = await mount(t, f, path: Routes.myDay);
      await drawer(t, 'nav_board');
      expect(app.router.routeInformationProvider.value.uri.path, Routes.board);
      f.failLogout = true;
      await drawer(t, 'nav_logout');
      expect(f.logoutCalls, 1);
      expect(app.container.read(sessionProvider).value, isA<SignedIn>());
      f.failLogout = false;
      f.gate = Completer<void>();
      // El drawer permanece abierto cuando falla.
      await t.tap(find.byKey(const ValueKey('nav_logout')));
      await t.pump();
      expect(
        t.widget<ListTile>(find.byKey(const ValueKey('nav_logout'))).onTap,
        isNull,
      );
      f.gate!.complete();
      await t.pumpAndSettle();
      expect(f.logoutCalls, 2);
      expect(app.router.routeInformationProvider.value.uri.path, Routes.login);
    },
  );
  for (final dark in [false, true]) {
    testWidgets('panorama, Mi día y Vence hoy 360dp / 1.5x tema $dark', (
      t,
    ) async {
      final f = Fixture();
      final app = await mount(t, f, dark: dark, scale: 1.5);
      expect(t.takeException(), isNull);
      app.router.go(Routes.myDay);
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      await drawer(t, 'nav_due_today');
      expect(t.takeException(), isNull);
      await tap(t, 'delivery_menu_d');
      expect(t.takeException(), isNull);
    });
  }
}
