import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/session_controller.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/app_router.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/models/json.dart';
import 'package:genwork_mobile/data/models/live_event.dart';
import 'package:genwork_mobile/data/models/sector.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/features/shell/drawer_items.dart';
import 'package:genwork_mobile/shared/widgets/count_badge.dart';
import 'package:genwork_mobile/features/shell/live_refresher.dart';
import 'package:genwork_mobile/features/works/works_filter.dart';
import 'package:genwork_mobile/shared/widgets/brand_name.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';

Json project(
  String id,
  String name, {
  String creator = 'other',
  String? owner,
  String? group,
  bool favorite = false,
  bool archived = false,
  int pending = 2,
}) => {
  'id': id,
  'name': name,
  'createdById': creator,
  'ownerId': owner,
  'description': 'Descripción de $name',
  'groupId': group,
  'groupName': group == null ? null : 'Producción',
  'status': archived ? 'ARCHIVED' : 'ACTIVE',
  'isFavorite': favorite,
  'pendingCount': pending,
  'taskCounts': {'total': pending + 1, 'done': 1},
  'createdAt': '2026-10-09T12:00:00Z',
  'labels': [
    {
      'keyId': 'k',
      'valueId': 'v',
      'keyName': 'Cliente',
      'valueName': 'Cuyo',
      'color': '#238b57',
      'isPrimary': true,
    },
  ],
};

class _Session extends SessionController {
  @override
  Future<SessionState> build() async => SignedIn(
    serverUrl: Uri.parse('https://test.invalid'),
    token: 'test',
    user: AppUser.fromJson({
      'id': 'me',
      'name': 'Ana Pérez',
      'email': 'ana@empresa.com',
      'globalRole': 'MEMBER',
    }),
  );
}

class _Fixture {
  final events = StreamController<LiveEvent>.broadcast();
  final requests = <RequestOptions>[];
  bool failWorks = false;
  Completer<void>? worksGate;
  bool failSectors = false;
  List<Json> works = [
    project(
      'own',
      'Cartelería de recepción',
      creator: 'me',
      group: 'g1',
      pending: 5,
    ),
    project(
      'favorite',
      'Señalética del local',
      favorite: true,
      group: 'g2',
      pending: 8,
    ),
    project('other', 'Impresión de folletos', owner: 'me', pending: 1),
    project(
      'archived',
      'Campaña de invierno',
      creator: 'me',
      archived: true,
      pending: 7,
    ),
  ];
  int groupPending = 8;
  List<Json> sectors = [
    {
      'id': 'sg',
      'name': 'Impresión',
      'color': '#805ad5',
      'scope': {'type': 'GROUP', 'groupId': 'g1', 'groupName': 'Producción'},
      'metrics': {'pending': 8, 'total': 10, 'done': 2},
    },
    {
      'id': 'sp',
      'name': 'Diseño',
      'color': '#d17614',
      'scope': {'type': 'PERSONAL', 'ownerId': 'me'},
      'metrics': {'pending': 3, 'total': 3, 'done': 0},
    },
    {
      'id': 'sa',
      'name': 'Coordinación',
      'scope': {'type': 'GLOBAL'},
      'metrics': {'pending': 0, 'total': 0, 'done': 0},
    },
  ];

  late final api = _client();
  ApiClient _client() {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) async {
          requests.add(request);
          if (request.path == '/api/works') await worksGate?.future;
          try {
            handler.resolve(
              Response(
                requestOptions: request,
                statusCode: 200,
                data: _respond(request),
              ),
            );
          } catch (error) {
            handler.reject(DioException(requestOptions: request, error: error));
          }
        },
      ),
    );
    return ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio);
  }

  Object? _respond(RequestOptions r) {
    if (r.path == '/api/groups') {
      return [
        {
          'id': 'g1',
          'name': 'Producción',
          'color': '#22c55e',
          'pendingCount': groupPending,
          'memberships': [],
        },
      ];
    }
    if (r.path == '/api/works') {
      if (failWorks) throw StateError('Sin conexión');
      final archived = r.queryParameters['status'] == 'ARCHIVED';
      return works
          .where((w) => (w['status'] == 'ARCHIVED') == archived)
          .toList();
    }
    if (r.path.startsWith('/api/works/')) {
      final work = works.firstWhere((w) => w['id'] == r.path.split('/').last);
      return {...work, 'access': 'operate', 'tasks': [], 'objectives': []};
    }
    if (r.path == '/api/sectors') {
      if (failSectors) throw StateError('Sin conexión');
      return sectors;
    }
    if (r.path.endsWith('/tasks')) {
      final sector = sectors.firstWhere((s) => s['id'] == r.path.split('/')[3]);
      return {
        'sector': sector,
        'level': 'read',
        'loose': [],
        'byWork': [],
        'refs': [],
      };
    }
    if (r.path == '/api/favorites' || r.path.startsWith('/api/favorites/')) {
      final id = r.method == 'POST'
          ? (r.data as Map)['workId']
          : r.path.split('/').last;
      works = [
        for (final work in works)
          work['id'] == id ? {...work, 'isFavorite': r.method == 'POST'} : work,
      ];
      return {};
    }
    if (r.path == '/api/reminders/deliveries') return {'deliveries': []};
    if (r.path == '/api/notes' || r.path.startsWith('/api/me/')) return [];
    throw StateError('Ruta inesperada ${r.path}');
  }
}

Future<({GoRouter router, ProviderContainer container})> _mount(
  WidgetTester tester,
  _Fixture fixture, {
  String path = Routes.works,
  bool dark = false,
  double scale = 1,
}) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      sessionProvider.overrideWith(_Session.new),
      apiClientProvider.overrideWithValue(fixture.api),
      liveEventsProvider.overrideWithValue(fixture.events.stream),
    ],
  );
  addTearDown(container.dispose);
  addTearDown(fixture.events.close);
  await container.read(sessionProvider.future);
  final router = container.read(routerProvider);
  addTearDown(router.dispose);
  router.go(path);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
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
          child: RepaintBoundary(
            key: const ValueKey('nav_preview'),
            child: child!,
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return (router: router, container: container);
}

Future<void> _open(WidgetTester tester) async {
  tester.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
  await tester.pumpAndSettle();
}

Future<void> _drawerTap(WidgetTester tester, String key) async {
  final scrollable = find
      .descendant(
        of: find.byKey(const ValueKey('drawer_list')),
        matching: find.byType(Scrollable),
      )
      .first;
  // Volver arriba permite buscar elementos que quedaron antes del scroll actual.
  tester.state<ScrollableState>(scrollable).position.jumpTo(0);
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(
    find.byKey(ValueKey(key)).hitTestable(),
    180,
    scrollable: scrollable,
  );
  await tester.tap(find.byKey(ValueKey(key)));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('es');
    final fonts = FontLoader('Montserrat')
      ..addFont(rootBundle.load('assets/fonts/Montserrat.ttf'));
    await fonts.load();
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });

  test(
    'contrato conserva creador, ámbito, IDs, contador canónico y color principal',
    () {
      final work = WorkSummary.fromJson({
        ...project('p', 'Proyecto', creator: 'me', owner: 'other'),
        'pendingCount': 9,
        'sectorIds': ['s1'],
        'labels': [
          {'keyName': 'A', 'color': '#ff0000'},
          {
            'keyId': 'k',
            'valueId': 'v',
            'keyName': 'Z',
            'color': '#00ff00',
            'isPrimary': true,
          },
        ],
      });
      expect(work.createdById, 'me');
      expect(work.ownerId, 'other');
      expect(work.sectorIds, ['s1']);
      expect(work.pendingCount, 9);
      expect(work.color, '#00ff00');
      expect(work.labels.last.valueId, 'v');
      final sector = SectorSummary.fromJson(_Fixture().sectors.first);
      expect(sector.scope.kind, ScopeKind.group);
      expect(sector.scope.groupId, 'g1');
      expect(sector.scope.label, 'Producción');
      final fallback = WorkSummary.fromJson({
        'id': 'p',
        'taskCounts': {'done': 2, 'total': 5},
      });
      expect(fallback.pendingCount, 3);
      expect(fallback.color, isNull);
    },
  );

  test('filtros por creador, favorito, archivo, descripción e ID de grupo', () {
    final works = _Fixture().works.map(WorkSummary.fromJson).toList();
    expect(
      filterWorks(works, view: WorksView.mine, userId: 'me').map((w) => w.id),
      ['own'],
    );
    expect(filterWorks(works, view: WorksView.mine).isEmpty, isTrue);
    expect(filterWorks(works, view: WorksView.favorites).map((w) => w.id), [
      'favorite',
    ]);
    expect(filterWorks(works, view: WorksView.archived).map((w) => w.id), [
      'archived',
    ]);
    expect(
      filterWorks(
        works,
        view: WorksView.all,
        groupId: 'g1',
        query: 'Descripción',
      ).map((w) => w.id),
      ['own'],
    );
    expect(
      filterWorks(works, view: WorksView.all, groupId: 'g2').map((w) => w.id),
      ['favorite'],
    );
    expect(
      filterWorks(works, view: WorksView.all, groupId: '').map((w) => w.id),
      ['other'],
    );
    final template = WorkSummary.fromJson({
      ...project('template', 'Plantilla'),
      'isTemplate': true,
    });
    expect(filterWorks([template], view: WorksView.all), isEmpty);
  });

  test(
    'drawer ordena por pendientes, acentos y ñ; mantiene empates y suma más de diez',
    () {
      final names = ['Ñandú', 'Nube', 'Árbol', 'arbol', 'Zapato'];
      final items = [
        for (var i = 0; i < names.length; i++)
          DrawerItem(id: '$i', name: names[i], pending: 1),
        for (var i = 5; i < 12; i++)
          DrawerItem(id: '$i', name: 'Más $i', pending: 2),
      ];
      final ordered = orderDrawerItems(items);
      expect(ordered.total, 19);
      expect(ordered.items.skip(7).map((i) => i.id), ['2', '3', '1', '0', '4']);
      expect(ordered.items.take(drawerItemLimit).length, 10);
      expect(items.first.name, 'Ñandú');
    },
  );

  testWidgets(
    'drawer aplica filtros, marca selección y conserva filtro al entrar/salir del detalle',
    (tester) async {
      final fixture = _Fixture();
      final app = await _mount(tester, fixture);
      await _open(tester);
      await _drawerTap(tester, 'nav_works_mine');
      expect(
        app.router.routeInformationProvider.value.uri.toString(),
        '/works?filter=mine',
      );
      expect(find.byKey(const ValueKey('work_own')), findsOneWidget);
      expect(find.byKey(const ValueKey('work_other')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('work_own')));
      await tester.pumpAndSettle();
      expect(
        GoRouterState.of(
          tester.element(find.byKey(const ValueKey('work_detail_list'))),
        ).uri.toString(),
        '/works/own?filter=mine',
      );
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('work_other')), findsNothing);
      await _open(tester);
      expect(
        tester
            .widget<ListTile>(find.byKey(const ValueKey('nav_works_mine')))
            .selected,
        isTrue,
      );
      await _drawerTap(tester, 'nav_works_favorites');
      expect(find.byKey(const ValueKey('work_favorite')), findsOneWidget);
      expect(find.byKey(const ValueKey('work_own')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('work_favorite_favorite')));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Todavía no tenés favoritos.\nMarcá un proyecto con la estrella.',
        ),
        findsOneWidget,
      );
      await _open(tester);
      await _drawerTap(tester, 'nav_works_archived');
      expect(find.byKey(const ValueKey('work_archived')), findsOneWidget);
      expect(find.byKey(const ValueKey('works_create')), findsNothing);
      expect(
        fixture.requests.any(
          (r) =>
              r.path == '/api/works' &&
              r.queryParameters['status'] == 'ARCHIVED',
        ),
        isTrue,
      );
      await _open(tester);
      await _drawerTap(tester, 'nav_works_all');
      expect(find.byKey(const ValueKey('work_own')), findsOneWidget);
      expect(find.byKey(const ValueKey('work_archived')), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'accesos directos y más elementos navegan; contadores se actualizan por SSE',
    (tester) async {
      final fixture = _Fixture();
      fixture.works = [
        for (var i = 0; i < 12; i++)
          project('p$i', 'Proyecto $i', pending: i + 1),
      ];
      final app = await _mount(tester, fixture);
      await _open(tester);
      final section = find.byKey(const ValueKey('nav_works_total'));
      expect(tester.widget<CountBadge>(section).count, 78);
      expect(find.byKey(const ValueKey('nav_works_item_p11')), findsOneWidget);
      expect(find.byKey(const ValueKey('nav_works_item_p0')), findsNothing);
      await _drawerTap(tester, 'nav_works_item_p11');
      expect(app.router.routeInformationProvider.value.uri.path, '/works/p11');
      await _open(tester);
      await _drawerTap(tester, 'nav_works_more');
      expect(app.router.routeInformationProvider.value.uri.path, '/works');
      await _open(tester);
      fixture.works[11] = {...fixture.works[11], 'pendingCount': 0};
      fixture.events.add(
        const TaskChanged(taskId: 't', workId: 'p11', sectorIds: []),
      );
      await tester.pumpAndSettle();
      expect(tester.widget<CountBadge>(section).count, 66);
      await _drawerTap(tester, 'nav_works_toggle');
      expect(find.byKey(const ValueKey('nav_works_item_p11')), findsNothing);
      await _drawerTap(tester, 'nav_sectors_toggle');
      fixture.sectors[0] = {
        ...fixture.sectors[0],
        'metrics': {'pending': 1, 'done': 2, 'total': 3},
      };
      fixture.events.add(const WorkChanged(workId: 'p11'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<CountBadge>(find.byKey(const ValueKey('nav_sectors_total')))
            .count,
        4,
      );
      await _drawerTap(tester, 'nav_sectors_item_sg');
      expect(app.router.routeInformationProvider.value.uri.path, '/sectors/sg');
      await _open(tester);
      await _drawerTap(tester, 'nav_sectors_all');
      expect(app.router.routeInformationProvider.value.uri.path, '/sectors');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'grupos: rama conserva detalle, contador cambia por SSE y búsqueda persiste',
    (tester) async {
      final fixture = _Fixture();
      final app = await _mount(tester, fixture, path: Routes.groups);
      await tester.enterText(
        find.byKey(const ValueKey('groups_search')),
        'Produ',
      );
      await tester.pumpAndSettle();
      await _open(tester);
      await _drawerTap(tester, 'nav_groups_toggle');
      expect(
        tester
            .widget<CountBadge>(find.byKey(const ValueKey('nav_groups_total')))
            .count,
        8,
      );
      fixture.groupPending = 3;
      fixture.events.add(const WorkChanged(workId: 'own'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<CountBadge>(find.byKey(const ValueKey('nav_groups_total')))
            .count,
        3,
      );
      await _drawerTap(tester, 'nav_groups_item_g1');
      expect(app.router.routeInformationProvider.value.uri.path, '/groups/g1');
      await _open(tester);
      await _drawerTap(tester, 'nav_notes');
      await _open(tester);
      await _drawerTap(tester, 'nav_groups');
      expect(app.router.routeInformationProvider.value.uri.path, '/groups/g1');
      app.router.pop();
      await tester.pumpAndSettle();
      expect(find.text('Produ'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'drawer muestra errores por sección y permite reintentar sin perder navegación',
    (tester) async {
      final fixture = _Fixture()..failWorks = true;
      final app = await _mount(tester, fixture, path: Routes.notes);
      await _open(tester);
      await _drawerTap(tester, 'nav_works_toggle');
      await _drawerTap(tester, 'nav_works_toggle');
      fixture.failWorks = false;
      await _drawerTap(tester, 'nav_works_retry');
      expect(
        find.byKey(const ValueKey('nav_works_item_favorite')),
        findsOneWidget,
      );
      expect(app.router.routeInformationProvider.value.uri.path, Routes.notes);
      fixture.sectors = [];
      fixture.events.add(const WorkChanged(workId: ''));
      await tester.pumpAndSettle();
      await _drawerTap(tester, 'nav_works_toggle');
      await _drawerTap(tester, 'nav_sectors_toggle');
      expect(find.text('No hay sectores visibles'), findsOneWidget);
    },
  );

  for (final dark in [false, true]) {
    testWidgets('drawer estilo sidebar: ancho, perfil, etiqueta e ítem activo '
        '(dark=$dark)', (tester) async {
      await _mount(tester, _Fixture(), path: Routes.works, dark: dark);
      await _open(tester);
      final c = dark ? GenColors.dark : GenColors.light;
      expect(
        tester.getSize(find.byKey(const ValueKey('main_navigation'))).width,
        AppGeometry.drawerWidth,
      );
      // Perfil: avatar de 32 sobre `brand` con inicial `onBrand`.
      final avatar = tester.widget<CircleAvatar>(find.byType(CircleAvatar));
      expect(avatar.radius, 16);
      expect(avatar.backgroundColor, c.brand);
      expect(avatar.foregroundColor, c.onBrand);
      expect(find.text('A'), findsOneWidget);
      expect(find.text('ESPACIO DE TRABAJO'), findsOneWidget);
      // Activo: brandFill, ícono/texto brand y lengüeta de 3 px.
      final active = tester.widget<ListTile>(
        find.byKey(const ValueKey('nav_works')),
      );
      expect(active.selected, isTrue);
      expect(active.selectedTileColor, c.brandFill);
      expect(active.selectedColor, c.brand);
      final shape = active.shape! as LeadingTickBorder;
      expect(shape.tickWidth, kActiveTickWidth);
      expect(shape.tickColor, c.brand);
      expect((active.leading! as Icon).size, 16);
      expect((active.leading! as Icon).color, c.brand);
      // Inactivo: ícono 16 `muted` y forma redondeada de control.
      final idle = tester.widget<ListTile>(
        find.byKey(const ValueKey('nav_notes')),
      );
      expect(idle.selected, isFalse);
      expect(idle.shape, isA<RoundedRectangleBorder>());
      expect((idle.leading! as Icon).color, c.muted);
      expect(
        tester.getSize(find.byKey(const ValueKey('nav_notes'))).height,
        greaterThanOrEqualTo(44),
      );
    });
  }

  testWidgets('drawer: cabecera con la marca ›genwork y sin ícono', (
    tester,
  ) async {
    await _mount(tester, _Fixture(), path: Routes.notes);
    await _open(tester);
    final brand = find.descendant(
      of: find.byType(Drawer),
      matching: find.byType(BrandName),
    );
    expect(brand, findsOneWidget);
    final span =
        tester
                .widget<RichText>(
                  find.descendant(of: brand, matching: find.byType(RichText)),
                )
                .text
            as TextSpan;
    expect(span.children!.map((c) => (c as TextSpan).text).join(), '›genwork');
    expect(
      find.descendant(of: find.byType(Drawer), matching: find.byType(Image)),
      findsNothing,
    );
    expect(find.byKey(const ValueKey('drawer_close')), findsOneWidget);
  });
  testWidgets('drawer muestra carga hasta recibir los contadores', (
    tester,
  ) async {
    final fixture = _Fixture()..worksGate = Completer<void>();
    await _mount(tester, fixture, path: Routes.notes);
    tester.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('nav_works_loading')), findsOneWidget);
    expect(find.byKey(const ValueKey('nav_works_total')), findsNothing);
    fixture.worksGate!.complete();
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('nav_works_loading')), findsNothing);
    expect(
      tester
          .widget<CountBadge>(find.byKey(const ValueKey('nav_works_total')))
          .count,
      14,
    );
  });

  for (final dark in [false, true]) {
    testWidgets('drawer y filtros accesibles a 360 dp / 150 %, tema $dark', (
      tester,
    ) async {
      final fixture = _Fixture();
      await _mount(tester, fixture, dark: dark, scale: 1.5);
      await _open(tester);
      expect(tester.takeException(), isNull);
      expect(
        tester.getSize(find.byKey(const ValueKey('nav_works_toggle'))).height,
        greaterThanOrEqualTo(48),
      );
      await _drawerTap(tester, 'nav_works_toggle');
      await _drawerTap(tester, 'nav_sectors_toggle');
      expect(tester.takeException(), isNull);
      await _drawerTap(tester, 'nav_sectors_item_sg');
      expect(tester.takeException(), isNull);
    });
  }

  if (const bool.fromEnvironment('UI_PREVIEWS')) {
    for (final dark in [false, true]) {
      testWidgets('captura drawer punto 2 ${dark ? 'oscuro' : 'claro'}', (
        tester,
      ) async {
        await _mount(tester, _Fixture(), dark: dark);
        await _open(tester);
        await tester.pumpAndSettle();
        // Los dos grupos expandidos, con el contenido real de la API simulada.
        await _drawerTap(tester, 'nav_sectors_toggle');
        final scroll = find
            .descendant(
              of: find.byKey(const ValueKey('drawer_list')),
              matching: find.byType(Scrollable),
            )
            .first;
        tester.state<ScrollableState>(scroll).position.jumpTo(0);
        await tester.pumpAndSettle();
        await tester.runAsync(() async {
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const ValueKey('nav_preview')),
          );
          final image = await boundary.toImage(pixelRatio: 2);
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          await File(
            '../.context/nav02/drawer-${dark ? 'dark' : 'light'}.png',
          ).writeAsBytes(bytes!.buffer.asUint8List());
          image.dispose();
        });
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('nav_sectors_item_sg')).hitTestable(),
          180,
          scrollable: scroll,
        );
        await tester.pumpAndSettle();
        await tester.runAsync(() async {
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const ValueKey('nav_preview')),
          );
          final image = await boundary.toImage(pixelRatio: 2);
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          await File(
            '../.context/nav02/sectors-${dark ? 'dark' : 'light'}.png',
          ).writeAsBytes(bytes!.buffer.asUint8List());
          image.dispose();
        });
      });
    }
  }
}
