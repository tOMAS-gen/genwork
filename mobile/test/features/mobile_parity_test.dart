import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/session_controller.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/app_router.dart';
import 'package:genwork_mobile/core/router/auth_redirect.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/models/json.dart';
import 'package:genwork_mobile/data/models/live_event.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/features/portal/portal_providers.dart';
import 'package:genwork_mobile/features/board/board_providers.dart';
import 'package:genwork_mobile/features/shell/live_refresher.dart';
import 'package:genwork_mobile/features/works/works_dashboard.dart';
import 'package:genwork_mobile/features/works/works_filter.dart';
import 'package:genwork_mobile/features/works/works_filters_dialog.dart';
import 'package:genwork_mobile/shared/widgets/state_views.dart';

AppUser identity(String role) => AppUser.fromJson({
  'id': 'me',
  'email': 'a@test.local',
  'name': 'Ana',
  'globalRole': role,
});
SignedIn session(String role) => SignedIn(
  serverUrl: Uri.parse('https://test.invalid'),
  token: 'token',
  user: identity(role),
);

class TestSession extends SessionController {
  TestSession(this.role);
  final String role;
  @override
  Future<SessionState> build() async => session(role);
  @override
  Future<void> refreshUser() async {}
  void changeRole(String role) => state = AsyncData(session(role));
}

Json portalWork() => {
  'id': 'w',
  'name': 'Cartelería',
  'description': 'Descripción '.padRight(500, 'larga '),
  'taskCounts': {'done': 1, 'total': 2},
  'labels': [],
  'tasks': [],
  'objectives': [
    {
      'id': 'o',
      'title': 'Imprimir',
      'taskCounts': {'done': 1, 'total': 2},
      'tasks': [
        {
          'id': 't',
          'displayText': 'Controlar color',
          'status': {'name': 'En curso', 'type': 'IN_PROGRESS'},
          'subtasks': [
            {
              'id': 'sub',
              'displayText': 'Controlar medida',
              'status': {'name': 'Hecha', 'type': 'FINAL'},
            },
          ],
        },
      ],
    },
  ],
};

class Fixture {
  final requests = <RequestOptions>[];
  final events = StreamController<LiveEvent>.broadcast();
  int? failure;
  bool allowed = true;
  late final api = _api();
  ApiClient _api() {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) {
          requests.add(r);
          if (failure != null &&
              (r.path.startsWith('/api/portal/works') ||
                  r.path == '/api/board')) {
            h.reject(
              DioException(
                requestOptions: r,
                type: DioExceptionType.badResponse,
                response: Response(
                  requestOptions: r,
                  statusCode: failure,
                  data: {
                    'error': {
                      'code': 'TEST',
                      'message': 'Proyecto no disponible',
                    },
                  },
                ),
              ),
            );
            return;
          }
          final Object data = switch (r.path) {
            '/api/portal/works' => [portalWork()],
            '/api/portal/works/w' => portalWork(),
            '/api/portal/works/w/activity' => {
              'entries': r.queryParameters['cursor'] == null
                  ? [
                      {
                        'id': 'a',
                        'taskText': 'Controlar color',
                        'from': null,
                        'to': {'name': 'Hecha'},
                        'at': '2026-10-14T12:00:00Z',
                      },
                    ]
                  : [],
              'nextCursor': r.queryParameters['cursor'] == null ? 'a' : null,
            },
            '/api/board' => [
              {
                'sector': {'id': 's', 'name': 'Impresión'},
                'tasks': [],
              },
            ],
            '/api/works/w' => {
              'id': 'w',
              'name': 'Cartelería',
              'access': 'operate',
              'canManageClients': allowed,
              'tasks': [],
              'objectives': [],
            },
            '/api/works/w/client-grants' => [],
            _ => <Object>[],
          };
          h.resolve(Response(requestOptions: r, statusCode: 200, data: data));
        },
      ),
    );
    return ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio);
  }
}

Future<ProviderContainer> mount(
  WidgetTester t,
  Fixture f, {
  String role = 'CLIENT',
  String path = '/portal',
  bool dark = false,
  double scale = 1,
  double width = 360,
  double height = 800,
}) async {
  t.view.physicalSize = Size(width, height);
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues({
    'themeMode': dark ? 'dark' : 'light',
  });
  final prefs = await SharedPreferences.getInstance();
  final c = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      sessionProvider.overrideWith(() => TestSession(role)),
      apiClientProvider.overrideWithValue(f.api),
      liveEventsProvider.overrideWithValue(f.events.stream),
    ],
  );
  await c.read(sessionProvider.future);
  c.read(routerProvider).go(path);
  await t.pumpWidget(
    UncontrolledProviderScope(
      container: c,
      child: MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(scale)),
        child: const GenworkApp(),
      ),
    ),
  );
  await t.pumpAndSettle();
  addTearDown(() async {
    await t.pumpWidget(const SizedBox.shrink());
    c.dispose();
    await f.events.close();
  });
  return c;
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));
  test('destinos por rol y límites de navegación', () {
    expect(authRedirect(session('CLIENT'), '/works/w'), Routes.portal);
    expect(authRedirect(session('CLIENT'), '/portal/works/w'), isNull);
    expect(authRedirect(session('READER'), '/login'), Routes.tv);
    expect(authRedirect(session('READER'), '/more/settings'), Routes.tv);
    expect(authRedirect(session('MEMBER'), '/portal'), Routes.myDay);
    expect(authRedirect(session('SUPERADMIN'), '/works/w'), isNull);
  });
  test(
    'traduce filtros, administración, objetivos y portal sin aceptar otros orígenes',
    () {
      expect(Routes.fromWebPath('/?filter=templates'), Routes.templates);
      expect(Routes.fromWebPath('/?filter=mine'), '/works?filter=mine');
      expect(
        Routes.fromWebPath('/works/w#objetivo-o'),
        '/works/w?objectiveId=o',
      );
      expect(
        Routes.fromWebPath('/admin/task-statuses'),
        Routes.catalog('statuses'),
      );
      expect(Routes.fromWebPath('/admin/errors/e'), Routes.settingsError('e'));
      expect(Routes.fromWebPath('/portal/works/w'), Routes.portalWork('w'));
      expect(Routes.fromWebPath('https://other.test/works/w'), isNull);
      expect(Routes.fromWebPath('//other.test/works/w'), isNull);
    },
  );
  test(
    'combina grupos, sector, etiqueta y avance; ordena sin mutar la fuente',
    () {
      WorkSummary work(String id, String name, String group, int done) =>
          WorkSummary.fromJson({
            'id': id,
            'name': name,
            'groupId': group,
            'sectorIds': ['s'],
            'labels': [
              {'valueId': 'v'},
            ],
            'taskCounts': {'done': done, 'total': 2},
          });
      final works = [
        work('a', 'Zeta', 'g1', 0),
        work('b', 'Álamos', 'g2', 1),
        work('c', 'Beta', 'g3', 2),
      ];
      final found = filterWorks(
        works,
        view: WorksView.all,
        groupIds: {'g1', 'g2'},
        sectorId: 's',
        labelValueId: 'v',
        status: ProjectStatus.inProgress,
        sort: WorksSort.name,
      );
      expect(found.map((w) => w.id), ['b']);
      expect(
        filterWorks(
          works,
          view: WorksView.all,
          sort: WorksSort.progress,
        ).map((w) => w.id),
        ['c', 'b', 'a'],
      );
      expect(works.map((w) => w.id), ['a', 'b', 'c']);
    },
  );
  testWidgets(
    'cliente consulta objetivos y subtareas sin montar endpoints internos ni controles de escritura',
    (t) async {
      final f = Fixture();
      final c = await mount(t, f, path: Routes.portalWork('w'));
      expect(find.byKey(const ValueKey('portal_task_t')), findsOneWidget);
      expect(find.byKey(const ValueKey('portal_task_sub')), findsOneWidget);
      expect(find.byType(Checkbox), findsNothing);
      expect(
        f.requests.every((r) => r.path.startsWith('/api/portal/')),
        isTrue,
      );
      expect(
        c.read(routerProvider).routeInformationProvider.value.uri.path,
        Routes.portalWork('w'),
      );
    },
  );
  testWidgets('portal pagina actividad y refresca por SSE', (t) async {
    final f = Fixture();
    await mount(t, f, path: Routes.portalWork('w'));
    final more = find.byKey(const ValueKey('portal_activity_more'));
    await t.ensureVisible(more);
    await t.tap(more);
    await t.pumpAndSettle();
    expect(f.requests.any((r) => r.queryParameters['cursor'] == 'a'), isTrue);
    final before = f.requests
        .where((r) => r.path == '/api/portal/works/w')
        .length;
    f.events.add(const WorkChanged(workId: 'w'));
    await t.pumpAndSettle();
    expect(
      f.requests.where((r) => r.path == '/api/portal/works/w').length,
      greaterThan(before),
    );
  });
  testWidgets(
    'un 404 del portal retira el contenido anterior y permite reintentar',
    (t) async {
      final f = Fixture();
      final c = await mount(t, f, path: Routes.portalWork('w'));
      f.failure = 404;
      c.invalidate(portalWorkProvider('w'));
      await t.pumpAndSettle();
      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.byKey(const ValueKey('portal_task_t')), findsNothing);
      f.failure = null;
      await t.tap(find.byKey(const ValueKey('error_retry')));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('portal_task_t')), findsOneWidget);
    },
  );
  testWidgets('lector consulta solo el tablero y no accede a rutas internas', (
    t,
  ) async {
    final f = Fixture();
    final c = await mount(t, f, role: 'READER', path: '/works/w');
    expect(
      c.read(routerProvider).routeInformationProvider.value.uri.path,
      Routes.tv,
    );
    expect(f.requests.every((r) => r.path == '/api/board'), isTrue);
    expect(find.byKey(const ValueKey('works_create')), findsNothing);
  });
  testWidgets('cambiar de cliente a lector destruye el recorrido anterior', (
    t,
  ) async {
    final f = Fixture();
    final c = await mount(t, f, path: Routes.portalWork('w'));
    (c.read(sessionProvider.notifier) as TestSession).changeRole('READER');
    await t.pumpAndSettle();
    expect(
      c.read(routerProvider).routeInformationProvider.value.uri.path,
      Routes.tv,
    );
    expect(find.byKey(const ValueKey('portal_task_t')), findsNothing);
  });
  testWidgets(
    'acceso de clientes usa canManageClients y no solicita la lista sin permiso',
    (t) async {
      final f = Fixture()..allowed = false;
      await mount(t, f, role: 'MEMBER', path: '/works/w/clients');
      expect(find.byKey(const ValueKey('work_clients_add')), findsNothing);
      expect(f.requests.any((r) => r.path.endsWith('/client-grants')), isFalse);
    },
  );
  testWidgets('tablero retira sectores anteriores después de un 403', (
    t,
  ) async {
    final f = Fixture();
    final c = await mount(t, f, role: 'READER', path: '/tv');
    expect(find.byKey(const ValueKey('board_sector_s')), findsOneWidget);
    f.failure = 403;
    c.invalidate(boardProvider);
    await t.pumpAndSettle();
    expect(find.byKey(const ValueKey('board_sector_s')), findsNothing);
    expect(find.byType(ErrorView), findsOneWidget);
  });
  for (final dark in [false, true]) {
    for (final width in [360.0, 390.0, 430.0]) {
      testWidgets('portal $width dp con texto 150%, oscuro=$dark', (t) async {
        await mount(
          t,
          Fixture(),
          dark: dark,
          scale: 1.5,
          path: Routes.portalWork('w'),
        );
        expect(t.takeException(), isNull);
      });
      testWidgets('filtros se aplican en $width dp, oscuro=$dark', (t) async {
        final c = await mount(
          t,
          Fixture(),
          dark: dark,
          width: width,
          scale: 1.5,
        );
        final context = t.element(find.byKey(const ValueKey('portal_work_w')));
        final future = showWorksFilters(
          context,
          works: [
            WorkSummary.fromJson({
              'id': 'w',
              'name': 'Proyecto',
              'groupId': 'g',
              'groupName': 'Producción',
            }),
          ],
          sectors: {'s': 'Impresión'},
          current: emptyWorkFilters,
        );
        await t.pumpAndSettle();
        await t.tap(find.byKey(const ValueKey('works_filter_group_g')));
        await t.tap(find.byKey(const ValueKey('works_filters_apply')));
        await t.pumpAndSettle();
        expect((await future)!.groups, {'g'});
        expect(c.read(routerProvider), isNotNull);
        expect(t.takeException(), isNull);
      });
    }
  }
  testWidgets('portal horizontal con texto ampliado', (t) async {
    await mount(
      t,
      Fixture(),
      width: 844,
      height: 390,
      scale: 1.5,
      path: Routes.portalWork('w'),
    );
    expect(t.takeException(), isNull);
  });
}
