import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/group.dart';
import 'package:genwork_mobile/features/groups/group_clients_screen.dart';
import 'package:genwork_mobile/features/groups/group_detail_screen.dart';
import 'package:genwork_mobile/features/groups/group_labels_screen.dart';
import 'package:genwork_mobile/features/groups/groups_list_screen.dart';
import 'package:genwork_mobile/features/shell/drawer_items.dart';
import 'package:go_router/go_router.dart';
import 'resource_operations_test.dart' show user, tap, Json;

class Fixture {
  final requests = <RequestOptions>[];
  int? failNext;
  bool failList = false, usedLabel = true;
  Completer<void>? gate;
  final groups = <Json>[
    {
      'id': 'g',
      'name': 'Producción',
      'color': '#22c55e',
      'ownerId': 'owner',
      'publicRead': false,
      '_count': {'works': 2},
      'pendingCount': 7,
      'memberships': <Json>[
        {
          'role': 'ADMIN',
          'user': {
            'id': 'owner',
            'name': 'Propietaria',
            'email': 'owner@test.local',
          },
        },
        {
          'userId': 'me',
          'role': 'ADMIN',
          'user': {'id': 'me', 'name': 'Ana', 'email': 'ana@test.local'},
        },
        {
          'userId': 'member',
          'role': 'MEMBER',
          'user': {'id': 'member', 'name': 'Luis', 'email': 'luis@test.local'},
        },
      ],
    },
  ];
  final candidates = <Json>[
    {'id': 'candidate', 'name': 'Lucía', 'email': 'lucia@test.local'},
  ];
  final clients = <Json>[
    {
      'id': 'c',
      'name': 'Cliente Uno',
      'email': 'cliente@test.local',
      'workIds': ['w'],
      'firstLoginAt': null,
    },
  ];
  final labels = <Json>[
    {'id': 'global', 'name': 'Global oculta', 'scope': 'global', 'values': []},
    {
      'id': 'key',
      'name': 'Prioridad',
      'scope': 'group',
      'values': <Json>[
        {'id': 'v', 'name': 'Alta', 'color': '#22c55e'},
      ],
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
          final mutationError = r.method != 'GET' ? failNext : null;
          final listError =
              failList && r.path == '/api/groups' && r.method == 'GET';
          final conflict =
              r.method == 'DELETE' &&
              r.path.startsWith('/api/labels/') &&
              usedLabel &&
              r.queryParameters['confirm'] != 'true';
          if (mutationError != null || listError || conflict) {
            failNext = null;
            final status = mutationError ?? (listError ? 503 : 409);
            h.reject(
              DioException(
                requestOptions: r,
                type: DioExceptionType.badResponse,
                response: Response(
                  requestOptions: r,
                  statusCode: status,
                  data: {
                    'error': {
                      'code': 'TEST',
                      'message': status == 403
                          ? 'Sin permiso para guardar'
                          : 'Intentá nuevamente',
                      if (status == 409) 'affectedWorks': 3,
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
    if (r.path == '/api/groups') {
      if (r.method == 'POST') {
        groups.add({'id': 'new', ...body, 'ownerId': 'me', 'memberships': []});
        return {'id': 'new'};
      }
      return [
        for (final g in groups)
          {
            ...g,
            'memberships': [...g['memberships'] as List],
          },
      ];
    }
    if (r.path == '/api/groups/g') {
      if (r.method == 'PATCH') groups.first.addAll(body);
      if (r.method == 'DELETE') groups.clear();
      return {};
    }
    if (r.path.endsWith('/members/search')) return candidates;
    if (r.path.contains('/members')) {
      final members = groups.first['memberships'] as List<Json>;
      if (r.method == 'POST') {
        final existing = members
            .where((m) => (m['user'] as Map)['email'] == body['email'])
            .firstOrNull;
        if (existing != null) {
          existing['role'] = body['role'];
        } else {
          final candidate = candidates.singleWhere(
            (c) => c['email'] == body['email'],
          );
          members.add({
            'userId': candidate['id'],
            'role': body['role'],
            'user': candidate,
          });
        }
      } else if (r.method == 'DELETE') {
        members.removeWhere(
          (m) => (m['userId'] ?? m['user']['id']) == r.path.split('/').last,
        );
      }
      return {};
    }
    if (r.path == '/api/groups/g/clients') {
      if (r.method == 'POST') clients.add({'id': 'newclient', ...body});
      return {
        'works': [
          {'id': 'w', 'name': 'Proyecto uno'},
          {'id': 'w2', 'name': 'Proyecto dos'},
        ],
        'clients': [
          for (final c in clients) {...c},
        ],
      };
    }
    if (r.path.startsWith('/api/groups/g/clients/')) {
      final id = r.path.split('/').last;
      if (r.method == 'PUT') {
        clients.singleWhere((c) => c['id'] == id).addAll(body);
      }
      if (r.method == 'DELETE') clients.removeWhere((c) => c['id'] == id);
      return {};
    }
    if (r.path == '/api/labels') {
      if (r.method == 'POST') {
        labels.add({'id': 'newkey', ...body, 'scope': 'group', 'values': []});
      }
      return [
        for (final l in labels)
          {
            ...l,
            'values': [...l['values'] as List],
          },
      ];
    }
    if (r.path.startsWith('/api/labels/keys/')) {
      final id = r.path.split('/').last;
      if (r.method == 'PATCH') {
        labels.singleWhere((l) => l['id'] == id).addAll(body);
      }
      if (r.method == 'DELETE') labels.removeWhere((l) => l['id'] == id);
      return {};
    }
    if (r.path.startsWith('/api/labels/values')) {
      final values =
          labels.singleWhere((l) => l['id'] == 'key')['values'] as List<Json>;
      if (r.method == 'POST') values.add({'id': 'newvalue', ...body});
      if (r.method == 'PATCH') {
        values.singleWhere((v) => v['id'] == 'v').addAll(body);
      }
      if (r.method == 'DELETE') values.removeWhere((v) => v['id'] == 'v');
      return {};
    }
    if (r.path == '/api/works') {
      return [
        {
          'id': 'w',
          'name': 'Proyecto uno',
          'status': 'ACTIVE',
          'taskCounts': {'total': 3, 'done': 1},
        },
      ];
    }
    if (r.path == '/api/sectors') {
      return [
        {
          'id': 's',
          'name': 'Impresión',
          'scope': {'type': 'GROUP', 'groupId': 'g'},
          'metrics': {'pending': 3},
        },
      ];
    }
    return [];
  }
}

Future<GoRouter> mount(
  WidgetTester t,
  Fixture f, {
  String path = '/groups/g',
  String role = 'MEMBER',
  bool dark = false,
  double scale = 1,
}) async {
  t.view.physicalSize = const Size(360, 800);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  final router = GoRouter(
    initialLocation: path,
    routes: [
      GoRoute(
        path: '/groups',
        builder: (_, _) => const GroupsListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, s) =>
                GroupDetailScreen(groupId: s.pathParameters['id']!),
            routes: [
              GoRoute(
                path: 'clients',
                builder: (_, s) =>
                    GroupClientsScreen(groupId: s.pathParameters['id']!),
              ),
              GoRoute(
                path: 'labels',
                builder: (_, s) =>
                    GroupLabelsScreen(groupId: s.pathParameters['id']!),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/works/:id',
        builder: (_, _) => const Scaffold(body: Text('Proyecto abierto')),
      ),
      GoRoute(
        path: '/sectors/:id',
        builder: (_, _) => const Scaffold(body: Text('Sector abierto')),
      ),
    ],
  );
  addTearDown(router.dispose);
  await t.pumpWidget(
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
  await t.pumpAndSettle();
  await t.pumpAndSettle();
  return router;
}

Future<void> menu(
  WidgetTester t,
  String action, {
  String key = 'group_actions',
}) async {
  await tap(t, key);
  await t.tap(find.text(action));
  await t.pumpAndSettle();
}

void main() {
  test('membresías anidadas y visibilidad no otorgan administración', () {
    final g = GroupSummary.fromJson(Fixture().groups.first);
    expect(g.adminUserIds, {'owner', 'me'});
    expect(g.canManage(user('MEMBER')), isTrue);
    expect(g.canManage(user('READER')), isFalse);
    expect(g.canManage(user('CLIENT')), isFalse);
    expect(g.canManage(null), isFalse);
    final public = GroupSummary.fromJson({'id': 'p', 'publicRead': true});
    expect(public.canManage(user('MEMBER')), isFalse);
    expect(public.canManage(user()), isTrue);
    final item = DrawerItem.group(g);
    expect(item.pending, 7);
    expect(item.color, '#22c55e');
  });
  testWidgets('crear, editar y lectura pública conservan campos ante error', (
    t,
  ) async {
    final f = Fixture();
    final router = await mount(t, f, path: '/groups');
    await tap(t, 'create_group');
    await tap(t, 'name_color_save');
    expect(find.text('Ingresá un nombre'), findsOneWidget);
    await t.enterText(
      find.byKey(const ValueKey('name_color_name')),
      'Equipo nuevo',
    );
    await tap(t, 'color_#22c55e');
    f.failNext = 403;
    await tap(t, 'name_color_save');
    expect(find.text('Sin permiso para guardar'), findsOneWidget);
    expect(find.text('Equipo nuevo'), findsOneWidget);
    await tap(t, 'name_color_save');
    expect(
      t.widget<GroupDetailScreen>(find.byType(GroupDetailScreen)).groupId,
      'new',
    );
    router.go('/groups/g');
    await t.pumpAndSettle();
    await menu(t, 'Editar grupo');
    await t.enterText(
      find.byKey(const ValueKey('name_color_name')),
      'Producción nueva',
    );
    await tap(t, 'color_#8b5cf6');
    await tap(t, 'name_color_save');
    expect(f.requests.lastWhere((r) => r.method == 'PATCH').data, {
      'name': 'Producción nueva',
      'color': '#8b5cf6',
    });
    await tap(t, 'group_public_read');
    await tap(t, 'action_cancel');
    expect(f.groups.first['publicRead'], isFalse);
    await tap(t, 'group_public_read');
    await tap(t, 'action_confirm');
    expect(f.requests.lastWhere((r) => r.method == 'PATCH').data, {
      'publicRead': true,
    });
    expect(find.text('Lectura para no miembros activada'), findsOneWidget);
  });
  testWidgets('eliminar grupo exige nombre exacto y advierte cascada', (
    t,
  ) async {
    final f = Fixture();
    final router = await mount(t, f);
    await menu(t, 'Eliminar grupo');
    expect(find.textContaining('incluidas tareas y etiquetas'), findsOneWidget);
    expect(
      t
          .widget<FilledButton>(find.byKey(const ValueKey('action_confirm')))
          .onPressed,
      isNull,
    );
    await t.enterText(find.byKey(const ValueKey('confirm_name')), 'Producción');
    await t.pump();
    await tap(t, 'action_confirm');
    expect(f.groups, isEmpty);
    expect(router.routeInformationProvider.value.uri.path, '/groups');
  });
  testWidgets(
    'buscador de miembros exige selección y descarta selección obsoleta',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      expect(find.byKey(const ValueKey('member_actions_owner')), findsNothing);
      await tap(t, 'group_add_member');
      await t.enterText(find.byKey(const ValueKey('member_search')), 'l');
      await t.pump(const Duration(milliseconds: 400));
      expect(f.requests.where((r) => r.path.endsWith('/search')), isEmpty);
      await t.enterText(find.byKey(const ValueKey('member_search')), 'luc');
      await t.pump(const Duration(milliseconds: 400));
      await t.pumpAndSettle();
      await tap(t, 'member_candidate_candidate');
      await t.enterText(find.byKey(const ValueKey('member_search')), 'luci');
      await t.pump();
      expect(
        t
            .widget<FilledButton>(find.byKey(const ValueKey('member_save')))
            .onPressed,
        isNull,
      );
      await t.pump(const Duration(milliseconds: 400));
      await t.pumpAndSettle();
      await tap(t, 'member_candidate_candidate');
      await tap(t, 'member_role');
      await t.tap(find.text('Administrador').last);
      await t.pumpAndSettle();
      f.failNext = 403;
      await tap(t, 'member_save');
      expect(find.text('Sin permiso para guardar'), findsOneWidget);
      await tap(t, 'member_save');
      expect(f.requests.lastWhere((r) => r.method == 'POST').data, {
        'email': 'lucia@test.local',
        'role': 'ADMIN',
      });
      expect(
        find.byKey(const ValueKey('group_member_candidate')),
        findsOneWidget,
      );
    },
  );
  testWidgets('cambiar rol y quitar miembro refrescan listado y permisos', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f);
    await menu(t, 'Cambiar rol', key: 'member_actions_member');
    await tap(t, 'member_role');
    await t.tap(find.text('Administrador').last);
    await t.pumpAndSettle();
    await tap(t, 'member_save');
    expect(f.requests.lastWhere((r) => r.method == 'POST').data, {
      'email': 'luis@test.local',
      'role': 'ADMIN',
    });
    await menu(t, 'Quitar miembro', key: 'member_actions_member');
    await tap(t, 'action_confirm');
    expect(find.byKey(const ValueKey('group_member_member')), findsNothing);
    expect(
      f.requests.lastWhere((r) => r.method == 'DELETE').path,
      '/api/groups/g/members/member',
    );
  });
  testWidgets(
    'lectura no muestra controles ni consulta rutas de administración',
    (t) async {
      final f = Fixture();
      final router = await mount(t, f, role: 'READER');
      expect(find.byKey(const ValueKey('group_actions')), findsNothing);
      expect(find.byKey(const ValueKey('group_add_member')), findsNothing);
      for (final route in ['clients', 'labels']) {
        router.go('/groups/g/$route');
        await t.pumpAndSettle();
        expect(
          find.text('No tenés permiso para administrar este grupo.'),
          findsOneWidget,
        );
      }
      expect(
        f.requests.where(
          (r) => r.path.contains('/clients') || r.path == '/api/labels',
        ),
        isEmpty,
      );
    },
  );
  testWidgets('detalle enlaza proyectos y sectores de su ámbito', (t) async {
    final f = Fixture();
    final router = await mount(t, f);
    await t.scrollUntilVisible(
      find.byKey(const ValueKey('group_work_w')),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    await tap(t, 'group_work_w');
    expect(find.text('Proyecto abierto'), findsOneWidget);
    router.pop();
    await t.pumpAndSettle();
    await tap(t, 'group_sector_s');
    expect(find.text('Sector abierto'), findsOneWidget);
    expect(
      f.requests
          .firstWhere((r) => r.path == '/api/works')
          .queryParameters['groupId'],
      'g',
    );
  });
  testWidgets(
    'alta de cliente valida selección, preserva borrador y asigna proyectos',
    (t) async {
      final f = Fixture();
      await mount(t, f, path: '/groups/g/clients');
      await tap(t, 'group_add_client');
      await t.enterText(
        find.byKey(const ValueKey('client_name')),
        'Cliente nuevo',
      );
      await t.enterText(
        find.byKey(const ValueKey('client_email')),
        'nuevo@test.local',
      );
      await tap(t, 'client_save');
      expect(find.text('Elegí al menos un proyecto'), findsOneWidget);
      await tap(t, 'client_work_w2');
      f.failNext = 403;
      await tap(t, 'client_save');
      expect(find.text('Cliente nuevo'), findsOneWidget);
      await tap(t, 'client_save');
      expect(f.requests.lastWhere((r) => r.method == 'POST').data, {
        'name': 'Cliente nuevo',
        'email': 'nuevo@test.local',
        'workIds': ['w2'],
      });
      expect(find.text('nuevo@test.local\nTodavía no ingresó'), findsOneWidget);
    },
  );
  testWidgets(
    'accesos archivados y selección vacía requieren confirmar antes de sincronizar',
    (t) async {
      final f = Fixture()..clients.first['workIds'] = ['w', 'archived'];
      await mount(t, f, path: '/groups/g/clients');
      await tap(t, 'client_edit_c');
      await tap(t, 'client_save');
      expect(
        find.textContaining('archivados o no disponibles'),
        findsOneWidget,
      );
      await tap(t, 'client_access_cancel');
      expect(f.requests.where((r) => r.method == 'PUT'), isEmpty);
      await tap(t, 'client_work_w');
      await tap(t, 'client_save');
      await tap(t, 'client_access_confirm');
      expect(f.requests.lastWhere((r) => r.method == 'PUT').data, {
        'workIds': [],
      });
      await tap(t, 'client_remove_c');
      expect(
        find.textContaining('los accesos en otros grupos se conservan'),
        findsOneWidget,
      );
      await tap(t, 'action_confirm');
      expect(
        f.requests.lastWhere((r) => r.method == 'DELETE').path,
        '/api/groups/g/clients/c',
      );
    },
  );
  testWidgets('etiquetas solo del grupo y CRUD de valores con color', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, path: '/groups/g/labels');
    expect(find.text('Global oculta'), findsNothing);
    await tap(t, 'group_create_label');
    await t.enterText(
      find.byKey(const ValueKey('name_color_name')),
      'Material',
    );
    await tap(t, 'name_color_save');
    expect(f.requests.lastWhere((r) => r.method == 'POST').data, {
      'groupId': 'g',
      'name': 'Material',
    });
    await tap(t, 'label_rename_key');
    await t.enterText(
      find.byKey(const ValueKey('name_color_name')),
      'Urgencia',
    );
    await tap(t, 'name_color_save');
    expect(find.text('Urgencia'), findsOneWidget);
    await tap(t, 'label_add_value_key');
    await t.enterText(find.byKey(const ValueKey('name_color_name')), 'Media');
    await tap(t, 'color_#8b5cf6');
    await tap(t, 'name_color_save');
    expect(f.requests.lastWhere((r) => r.method == 'POST').data, {
      'keyId': 'key',
      'name': 'Media',
      'color': '#8b5cf6',
    });
    await menu(t, 'Editar valor', key: 'label_value_actions_v');
    await t.enterText(find.byKey(const ValueKey('name_color_name')), 'Urgente');
    await tap(t, 'color_#3b5bfa');
    await tap(t, 'name_color_save');
    expect(f.requests.lastWhere((r) => r.method == 'PATCH').data, {
      'name': 'Urgente',
      'color': '#3b5bfa',
    });
  });
  testWidgets(
    'borrado etiqueta usada tiene doble confirmación; 403 no fuerza',
    (t) async {
      final f = Fixture();
      await mount(t, f, path: '/groups/g/labels');
      await tap(t, 'label_delete_key');
      expect(f.requests.where((r) => r.method == 'DELETE'), isEmpty);
      f.failNext = 403;
      await tap(t, 'label_delete_confirm');
      expect(find.text('Sin permiso para guardar'), findsOneWidget);
      expect(find.byKey(const ValueKey('label_delete_impact')), findsNothing);
      await tap(t, 'label_delete_confirm');
      expect(find.textContaining('3 asignaciones'), findsOneWidget);
      expect(
        f.requests.lastWhere((r) => r.method == 'DELETE').queryParameters,
        isEmpty,
      );
      await t.tap(find.text('Cancelar'));
      await t.pumpAndSettle();
      expect(find.text('Prioridad'), findsOneWidget);
      await tap(t, 'label_delete_key');
      await tap(t, 'label_delete_confirm');
      await tap(t, 'label_delete_confirm');
      expect(
        f.requests.lastWhere((r) => r.method == 'DELETE').queryParameters,
        {'confirm': 'true'},
      );
      expect(find.text('Prioridad'), findsNothing);
    },
  );
  testWidgets(
    'valor sin uso se elimina tras primera confirmación y bloquea doble envío',
    (t) async {
      final f = Fixture()..usedLabel = false;
      await mount(t, f, path: '/groups/g/labels');
      await menu(t, 'Eliminar valor', key: 'label_value_actions_v');
      f.gate = Completer<void>();
      await t.tap(find.byKey(const ValueKey('label_delete_confirm')));
      await t.pump();
      expect(
        t
            .widget<FilledButton>(
              find.byKey(const ValueKey('label_delete_confirm')),
            )
            .onPressed,
        isNull,
      );
      f.gate!.complete();
      await t.pumpAndSettle();
      expect(find.text('Alta'), findsNothing);
      expect(
        f.requests.singleWhere((r) => r.method == 'DELETE').path,
        '/api/labels/values/v',
      );
    },
  );
  testWidgets(
    'error de carga reintenta y grupo ausente informa pérdida de acceso',
    (t) async {
      final f = Fixture()..failList = true;
      final router = await mount(t, f);
      expect(find.text('Intentá nuevamente'), findsOneWidget);
      f.failList = false;
      await t.tap(find.text('Reintentar'));
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('group_add_member')), findsOneWidget);
      router.go('/groups/missing');
      await t.pumpAndSettle();
      expect(
        find.text('El grupo ya no está disponible o no tenés acceso.'),
        findsOneWidget,
      );
    },
  );
  for (final dark in [false, true]) {
    testWidgets(
      '360dp y texto 1.5x: grupos, miembros, clientes y etiquetas ${dark ? 'oscuro' : 'claro'}',
      (t) async {
        final f = Fixture();
        final router = await mount(t, f, dark: dark, scale: 1.5);
        await tap(t, 'group_add_member');
        expect(t.takeException(), isNull);
        await t.tap(find.text('Cancelar'));
        await t.pumpAndSettle();
        router.go('/groups/g/clients');
        await t.pumpAndSettle();
        await tap(t, 'group_add_client');
        expect(t.takeException(), isNull);
        await t.tap(find.text('Cancelar'));
        await t.pumpAndSettle();
        router.go('/groups/g/labels');
        await t.pumpAndSettle();
        await tap(t, 'label_add_value_key');
        expect(t.takeException(), isNull);
        await t.tap(find.text('Cancelar'));
        await t.pumpAndSettle();
        router.go('/groups');
        await t.pumpAndSettle();
        await tap(t, 'create_group');
        expect(t.takeException(), isNull);
      },
    );
  }
}
