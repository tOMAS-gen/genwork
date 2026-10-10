import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/models/group.dart';
import 'package:genwork_mobile/data/models/sector.dart';
import 'package:genwork_mobile/features/sectors/sector_detail_screen.dart';
import 'package:genwork_mobile/features/sectors/sector_form_dialog.dart';
import 'package:genwork_mobile/features/sectors/sector_sections.dart';
import 'package:genwork_mobile/features/sectors/sectors_list_screen.dart';
import 'package:genwork_mobile/features/works/work_detail_screen.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';

typedef Json = Map<String, dynamic>;
AppUser user([String role = 'SUPERADMIN']) => AppUser.fromJson({
  'id': 'me',
  'name': 'Ana',
  'email': 'test@local',
  'globalRole': role,
});
Json sector(
  String id,
  String name,
  String type, {
  String? group,
  int done = 0,
  int pending = 0,
}) => {
  'id': id,
  'name': name,
  'color': '#3b5bfa',
  'scope': {
    'type': type,
    'groupId': group,
    'groupName': group == null ? null : 'Equipo',
    'ownerId': type == 'PERSONAL' ? 'me' : null,
  },
  'metrics': {'done': done, 'pending': pending, 'total': done + pending},
};

class Fixture {
  final requests = <RequestOptions>[];
  bool failNext = false;
  bool missingWork = false;
  Completer<void>? gate;
  final work = <String, dynamic>{
    'id': 'w',
    'name': 'Proyecto de prueba',
    'description': 'Original',
    'code': '001_prueba',
    'status': 'ACTIVE',
    'dueDate': '2026-10-21T18:30:00.000Z',
    'access': 'operate',
    'groupId': 'g1',
    'group': {'id': 'g1', 'name': 'Equipo'},
    'stageId': null,
    'tasks': [],
    'objectives': [],
    'labels': <Json>[],
  };
  final sectors = <Json>[
    sector('s', 'Diseño', 'PERSONAL', pending: 3),
    sector('g', 'Impresión', 'GROUP', group: 'g1', pending: 7),
    sector('x', 'General', 'GLOBAL', done: 2),
  ];
  final groups = <Json>[
    {
      'id': 'g1',
      'name': 'Equipo',
      'memberships': [
        {'userId': 'me', 'role': 'ADMIN'},
      ],
    },
    {
      'id': 'g2',
      'name': 'Otro equipo',
      'memberships': [
        {'userId': 'me', 'role': 'MEMBER'},
      ],
    },
    {'id': 'public', 'name': 'Público', 'memberships': []},
  ];
  late final api = _client();
  ApiClient _client() {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) async {
          requests.add(r);
          if (r.method != 'GET') await gate?.future;
          if (missingWork && r.method == 'GET' && r.path == '/api/works/w') {
            h.reject(
              DioException(
                requestOptions: r,
                type: DioExceptionType.badResponse,
                response: Response(
                  requestOptions: r,
                  statusCode: 404,
                  data: {
                    'error': {
                      'code': 'NOT_FOUND',
                      'message': 'Proyecto eliminado',
                    },
                  },
                ),
              ),
            );
            return;
          }
          if ((failNext && r.method != 'GET') ||
              (r.method == 'DELETE' &&
                  r.path == '/api/sectors/s' &&
                  r.queryParameters['confirm'] != 'true')) {
            final failure = failNext;
            failNext = false;
            h.reject(
              DioException(
                requestOptions: r,
                type: DioExceptionType.badResponse,
                response: Response(
                  requestOptions: r,
                  statusCode: failure ? 403 : 409,
                  data: {
                    'error': {
                      'code': failure ? 'FORBIDDEN' : 'CONFLICT',
                      'message': failure
                          ? 'Sin permiso para guardar'
                          : 'Impacto del borrado',
                      if (!failure) 'affectedTasks': 5,
                      if (!failure) 'looseTasks': 3,
                    },
                  },
                ),
              ),
            );
            return;
          }
          h.resolve(
            Response(requestOptions: r, statusCode: 200, data: respond(r)),
          );
        },
      ),
    );
    return ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio);
  }

  Object? respond(RequestOptions r) {
    final body = r.data is Map
        ? Map<String, dynamic>.from(r.data as Map)
        : <String, dynamic>{};
    if (r.path == '/api/groups') return groups;
    if (r.path == '/api/stages') {
      return [
        {'id': 'stage', 'name': 'Producción', 'color': '#22c55e'},
      ];
    }
    if (r.path == '/api/labels') {
      return [
        {
          'id': 'key',
          'name': 'Cliente',
          'scope': 'group',
          'values': [
            {'id': 'v1', 'name': 'Uno', 'color': '#22c55e'},
            {'id': 'v2', 'name': 'Dos', 'color': '#3b5bfa'},
          ],
        },
      ];
    }
    if (r.path == '/api/works/w') {
      if (r.method == 'PATCH') {
        work.addAll(body);
        if (body.containsKey('stageId')) {
          work['stage'] = body['stageId'] == null
              ? null
              : {'id': 'stage', 'name': 'Producción'};
        }
      }
      return {
        ...work,
        'labels': [...work['labels'] as List],
      };
    }
    if (r.path.startsWith('/api/works/w/labels')) {
      final labels = work['labels'] as List<Json>;
      if (r.method == 'PUT') {
        final primary = r.path.endsWith('/primary');
        if (primary) {
          for (final l in labels) {
            l['isPrimary'] = false;
          }
        }
        labels.removeWhere((l) => l['valueId'] == body['valueId']);
        labels.add({
          'keyId': 'key',
          'keyName': 'Cliente',
          'valueId': body['valueId'],
          'valueName': body['valueId'] == 'v1' ? 'Uno' : 'Dos',
          'color': '#22c55e',
          'isPrimary': primary,
        });
      } else {
        labels.removeWhere((l) => l['valueId'] == r.queryParameters['valueId']);
      }
      return {};
    }
    if (r.path == '/api/sectors') {
      if (r.method == 'POST') {
        sectors.add({
          ...sector(
            'new',
            body['name'] as String,
            body['global'] == true
                ? 'GLOBAL'
                : body['groupId'] != null
                ? 'GROUP'
                : 'PERSONAL',
            group: body['groupId'] as String?,
          ),
          'color': body['color'],
        });
        return {'id': 'new'};
      }
      return [...sectors];
    }
    if (r.path.endsWith('/tasks')) {
      final id = r.path.split('/')[3];
      final s = sectors.firstWhere((s) => s['id'] == id);
      return {
        'sector': s,
        'level': 'operate',
        'loose': [],
        'byWork': [],
        'refs': [],
        'metrics': s['metrics'],
      };
    }
    if (r.path == '/api/sectors/s') {
      if (r.method == 'PATCH') sectors.first.addAll(body);
      if (r.method == 'DELETE') sectors.removeWhere((s) => s['id'] == 's');
      return {};
    }
    return [];
  }
}

Future<GoRouter> mount(
  WidgetTester tester,
  Fixture f, {
  String path = '/works/w',
  String role = 'SUPERADMIN',
  double scale = 1,
  bool dark = false,
}) async {
  tester.view.physicalSize = const Size(420, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final router = GoRouter(
    initialLocation: path,
    routes: [
      GoRoute(
        path: '/works',
        builder: (_, _) => const Scaffold(body: Text('Listado de proyectos')),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, s) =>
                WorkDetailScreen(workId: s.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/sectors',
        builder: (_, _) => const SectorsListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, s) =>
                SectorDetailScreen(sectorId: s.pathParameters['id']!),
          ),
        ],
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        apiClientProvider.overrideWithValue(f.api),
        currentUserProvider.overrideWithValue(user(role)),
      ],
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
  await tester.pumpAndSettle();
  return router;
}

Future<void> tap(WidgetTester tester, String key) async {
  final finder = find.byKey(ValueKey(key));
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> menu(
  WidgetTester tester,
  String action, {
  bool sector = false,
}) async {
  await tap(tester, sector ? 'sector_actions' : 'work_actions');
  // `.last`: el ítem del menú (overlay), no un rótulo de la pantalla con el mismo
  // texto (p. ej. «Etiquetas» en el resumen del proyecto).
  await tester.tap(find.text(action).last);
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));
  test(
    'sectores: permisos de alta por membresía y rol, nunca por visibilidad',
    () {
      final f = Fixture();
      final groups = f.groups.map(GroupSummary.fromJson).toList();
      expect(sectorCreationGroups(user('MEMBER'), groups).map((g) => g.id), [
        'g1',
      ]);
      expect(sectorCreationGroups(user(), groups), hasLength(3));
      expect(canCreateSector(user('MEMBER')), isTrue);
      expect(canCreateSector(user('READER')), isFalse);
      expect(canCreateSector(null), isFalse);
    },
  );
  test(
    'agrupa por ID y ordena secciones y sectores con métricas y desempate',
    () {
      final sectors = [
        sector('a', 'Alfa', 'GROUP', group: 'g1', pending: 2),
        sector('b', 'Beta', 'GROUP', group: 'g1', pending: 5),
        sector('c', 'Cero', 'GROUP', group: 'g2', done: 8),
        sector('x', 'Global', 'GLOBAL'),
        sector('p', 'Personal', 'PERSONAL', pending: 10),
      ].map(SectorSummary.fromJson).toList();
      expect(sectorSections(sectors).map((s) => s.key), [
        'scope:global',
        'group:g1',
        'group:g2',
        'scope:personal',
      ]);
      final pending = sectorSections(sectors, sort: SectorSort.pending);
      expect(pending.first.key, 'scope:personal');
      expect(pending[1].sectors.map((s) => s.id), ['b', 'a']);
      expect(
        sectorSections(sectors, sort: SectorSort.total).first.key,
        'scope:personal',
      );
      expect(
        sectorSections(sectors, sort: SectorSort.progress).first.key,
        'group:g2',
      );
      expect(
        sectorSections(
          sectors,
          scopeKey: 'group:g1',
          search: 'ALF',
        ).single.sectors.single.id,
        'a',
      );
    },
  );
  testWidgets(
    'editar conserva borrador ante 403 y no reescribe vencimiento intacto',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      await menu(t, 'Editar proyecto');
      await t.enterText(
        find.byKey(const ValueKey('edit_work_name')),
        'Nuevo nombre',
      );
      await t.enterText(
        find.byKey(const ValueKey('edit_work_description')),
        '',
      );
      f.failNext = true;
      await tap(t, 'edit_work_save');
      expect(find.text('Sin permiso para guardar'), findsOneWidget);
      expect(find.text('Nuevo nombre'), findsOneWidget);
      await tap(t, 'edit_work_save');
      expect(find.text('Nuevo nombre'), findsOneWidget);
      final body = f.requests.lastWhere((r) => r.method == 'PATCH').data as Map;
      expect(body['description'], '');
      expect(body.containsKey('dueDate'), isFalse);
    },
  );
  testWidgets(
    'quitar vencimiento envía null y archivar/restaurar refresca permisos',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      await menu(t, 'Editar proyecto');
      await tap(t, 'edit_work_clear_due');
      await tap(t, 'edit_work_save');
      expect(f.work['dueDate'], isNull);
      await menu(t, 'Archivar');
      await tap(t, 'action_cancel');
      expect(f.work['status'], 'ACTIVE');
      await menu(t, 'Archivar');
      await tap(t, 'action_confirm');
      expect(f.work['status'], 'ARCHIVED');
      await tap(t, 'work_actions');
      expect(find.text('Etapa de producción'), findsNothing);
      expect(find.text('Renombrar'), findsOneWidget);
      await t.tap(find.text('Restaurar'));
      await t.pumpAndSettle();
      await tap(t, 'action_confirm');
      expect(f.work['status'], 'ACTIVE');
    },
  );
  testWidgets('eliminar exige nombre exacto y vuelve a lista tras éxito', (
    t,
  ) async {
    final f = Fixture();
    final router = await mount(t, f);
    await menu(t, 'Eliminar proyecto');
    expect(
      t
          .widget<FilledButton>(find.byKey(const ValueKey('action_confirm')))
          .onPressed,
      isNull,
    );
    await t.enterText(find.byKey(const ValueKey('confirm_name')), 'incorrecto');
    await t.pump();
    expect(
      t
          .widget<FilledButton>(find.byKey(const ValueKey('action_confirm')))
          .onPressed,
      isNull,
    );
    await t.enterText(
      find.byKey(const ValueKey('confirm_name')),
      f.work['name'] as String,
    );
    await t.pump();
    await tap(t, 'action_confirm');
    expect(router.routeInformationProvider.value.uri.path, '/works');
    expect(f.requests.lastWhere((r) => r.method == 'DELETE').data, {
      'confirmName': 'Proyecto de prueba',
    });
  });
  testWidgets(
    'solo lectura no expone acciones y miembro no administra sector',
    (t) async {
      final f = Fixture()..work['access'] = 'read';
      await mount(t, f);
      expect(find.byKey(const ValueKey('work_actions')), findsNothing);
      await mount(t, Fixture(), path: '/sectors/s', role: 'MEMBER');
      expect(find.byKey(const ValueKey('sector_actions')), findsNothing);
    },
  );
  testWidgets('etapas consultan ámbito, cambian y permiten quitar selección', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f);
    await menu(t, 'Etapa de producción');
    expect(
      f.requests.lastWhere((r) => r.path == '/api/stages').queryParameters,
      {'groupId': 'g1'},
    );
    await tap(t, 'work_stage_stage');
    expect(f.work['stageId'], 'stage');
    await menu(t, 'Etapa de producción');
    await tap(t, 'work_stage_none');
    expect(f.work['stageId'], isNull);
  });
  testWidgets(
    'etiquetas múltiples: principal, secundaria, reemplazo y quitar',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      await menu(t, 'Etiquetas');
      await tap(t, 'work_label_primary_v1');
      await tap(t, 'work_label_add_v2');
      expect(f.work['labels'], hasLength(2));
      await tap(t, 'work_label_primary_v2');
      expect(
        (f.work['labels'] as List)
            .where((l) => l['isPrimary'] == true)
            .single['valueId'],
        'v2',
      );
      await tap(t, 'work_label_remove_v1');
      expect((f.work['labels'] as List).single['valueId'], 'v2');
      await tap(t, 'work_label_remove_v2');
      expect(f.work['labels'], isEmpty);
      expect(
        f.requests.lastWhere((r) => r.path == '/api/labels').queryParameters,
        {'groupId': 'g1'},
      );
    },
  );
  testWidgets(
    'sectores: filtros reabren coincidencias y conservan plegado original',
    (t) async {
      final f = Fixture();
      await mount(t, f, path: '/sectors');
      await tap(t, 'sectors_toggle_all');
      expect(find.byKey(const ValueKey('sector_s')), findsNothing);
      await t.enterText(find.byKey(const ValueKey('sectors_search')), 'Diseño');
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('sector_s')), findsOneWidget);
      expect(find.byKey(const ValueKey('sector_g')), findsNothing);
      await tap(t, 'sectors_clear');
      expect(find.byKey(const ValueKey('sector_s')), findsNothing);
      await tap(t, 'sectors_toggle_all');
      await tap(t, 'sectors_scope_');
      await t.tap(find.text('Equipo').last);
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('sector_g')), findsOneWidget);
      expect(find.byKey(const ValueKey('sector_s')), findsNothing);
    },
  );
  testWidgets(
    'crear sector personal permite miembro, restringe grupos y conserva datos ante error',
    (t) async {
      final f = Fixture();
      await mount(t, f, path: '/sectors', role: 'MEMBER');
      await tap(t, 'create_sector');
      final scope = t.widget<DropdownButtonFormField<String>>(
        find.byKey(const ValueKey('sector_form_scope_personal')),
      );
      expect(scope.enabled, isTrue);
      await tap(t, 'sector_form_scope_personal');
      expect(
        find.widgetWithText(DropdownMenuItem<String>, 'Global'),
        findsNothing,
      );
      expect(
        find.widgetWithText(DropdownMenuItem<String>, 'Otro equipo'),
        findsNothing,
      );
      expect(
        find.widgetWithText(DropdownMenuItem<String>, 'Equipo'),
        findsWidgets,
      );
      await t.tap(find.text('Personal').last);
      await t.pumpAndSettle();
      await t.enterText(
        find.byKey(const ValueKey('sector_form_name')),
        'Sector nuevo',
      );
      await tap(t, 'color_#22c55e');
      f.failNext = true;
      await tap(t, 'sector_form_save');
      expect(find.text('Sector nuevo'), findsOneWidget);
      await tap(t, 'sector_form_save');
      expect(
        t.widget<SectorDetailScreen>(find.byType(SectorDetailScreen)).sectorId,
        'new',
      );
      expect(f.requests.lastWhere((r) => r.method == 'POST').data, {
        'name': 'Sector nuevo',
        'color': '#22c55e',
      });
    },
  );
  testWidgets('renombrar y cambiar color persiste en detalle', (t) async {
    final f = Fixture();
    await mount(t, f, path: '/sectors/s');
    await menu(t, 'Editar sector', sector: true);
    await t.enterText(
      find.byKey(const ValueKey('sector_form_name')),
      'Diseño nuevo',
    );
    await tap(t, 'color_#8b5cf6');
    await tap(t, 'sector_form_save');
    expect(find.text('Diseño nuevo'), findsOneWidget);
    expect(f.sectors.first['color'], '#8b5cf6');
  });
  testWidgets(
    'borrado sector consulta impacto, permite cancelar y confirma por separado',
    (t) async {
      final f = Fixture();
      final router = await mount(t, f, path: '/sectors/s');
      await menu(t, 'Eliminar sector', sector: true);
      expect(
        find.textContaining('Vínculos de tareas a desvincular: 5'),
        findsOneWidget,
      );
      expect(
        find.textContaining('Tareas sueltas a eliminar: 3'),
        findsOneWidget,
      );
      await tap(t, 'sector_delete_continue');
      await tap(t, 'action_cancel');
      expect(f.sectors, hasLength(3));
      await menu(t, 'Eliminar sector', sector: true);
      await tap(t, 'sector_delete_continue');
      await tap(t, 'action_confirm');
      expect(f.sectors, hasLength(2));
      expect(router.routeInformationProvider.value.uri.path, '/sectors');
      expect(
        f.requests.lastWhere((r) => r.method == 'DELETE').queryParameters,
        {'confirm': 'true'},
      );
    },
  );
  testWidgets(
    'un SSE de borrado antes de la respuesta no impide volver a la lista',
    (t) async {
      final f = Fixture();
      final router = await mount(t, f);
      final container = ProviderScope.containerOf(
        t.element(find.byType(WorkDetailScreen)),
      );
      await menu(t, 'Eliminar proyecto');
      await t.enterText(
        find.byKey(const ValueKey('confirm_name')),
        'Proyecto de prueba',
      );
      await t.pump();
      f.gate = Completer<void>();
      await t.tap(find.byKey(const ValueKey('action_confirm')));
      await t.pump();
      expect(
        t
            .widget<FilledButton>(find.byKey(const ValueKey('action_confirm')))
            .onPressed,
        isNull,
      );
      f.missingWork = true;
      container.invalidate(workDetailProvider('w'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const ValueKey('work_actions')), findsNothing);
      f.gate!.complete();
      await t.pumpAndSettle();
      expect(router.routeInformationProvider.value.uri.path, '/works');
    },
  );
  testWidgets(
    'no confirma borrar sector si falla la consulta del impacto; permite reintentar',
    (t) async {
      final f = Fixture();
      await mount(t, f, path: '/sectors/s');
      f.failNext = true;
      await menu(t, 'Eliminar sector', sector: true);
      expect(
        find.byKey(const ValueKey('sector_delete_continue')),
        findsNothing,
      );
      expect(find.text('Sin permiso para guardar'), findsOneWidget);
      await t.tap(find.text('Reintentar'));
      await t.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('sector_delete_continue')),
        findsOneWidget,
      );
      expect(
        f.requests.where((r) => r.queryParameters['confirm'] == 'true'),
        isEmpty,
      );
    },
  );
  for (final dark in [false, true]) {
    testWidgets('formularios y catálogo a 1.5x ${dark ? 'oscuro' : 'claro'}', (
      t,
    ) async {
      final f = Fixture();
      await mount(t, f, path: '/sectors', scale: 1.5, dark: dark);
      t.view.physicalSize = const Size(360, 800);
      await t.pumpAndSettle();
      await tap(t, 'create_sector');
      expect(t.takeException(), isNull);
      await t.tap(find.text('Cancelar'));
      await t.pumpAndSettle();
      await mount(t, f, scale: 1.5, dark: dark);
      t.view.physicalSize = const Size(360, 800);
      await t.pumpAndSettle();
      await menu(t, 'Editar proyecto');
      expect(t.takeException(), isNull);
    });
  }
}
