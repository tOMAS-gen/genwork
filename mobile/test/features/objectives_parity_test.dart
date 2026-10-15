import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/shared/widgets/task_text_field.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';
import 'day_overview_test.dart' as overview;
import 'daily_parity_test.dart' show taskJson;
import 'resource_operations_test.dart' show tap, Json;

Json root(
  String id, {
  String? objective,
  String? parent,
  List<Json> children = const [],
}) => {
  ...taskJson(id, canToggle: true, children: children),
  'workId': 'w',
  'work': {'id': 'w', 'name': 'Proyecto'},
  'objectiveId': objective,
  'parentId': parent,
  'parentText': parent == null ? null : 'Tarea padre',
  'subtaskCount': children.length,
};

class Fixture extends overview.Fixture {
  bool failMutation = false,
      failTemplates = false,
      failDescription = false,
      unresolved = false;
  final work = <String, dynamic>{
    'id': 'w',
    'name': 'Proyecto',
    'access': 'operate',
    'status': 'ACTIVE',
    'objectives': <Json>[
      {
        'id': 'o1',
        'title': 'Diseñar',
        'description': 'Revisar medidas',
        'position': 0,
      },
      {'id': 'o2', 'title': 'Entregar', 'position': 1},
    ],
    'tasks': <Json>[
      root('a'),
      root('b'),
      root(
        'c',
        objective: 'o1',
        children: [
          root('c1', objective: 'o1', parent: 'c'),
          root('c2', objective: 'o1', parent: 'c'),
        ],
      ),
    ],
  };
  final templates = <Json>[
    {
      'id': 'tpl',
      'name': 'Entrega estándar',
      'description': 'Control final',
      'copyableTaskCount': 3,
    },
  ];
  List<Json> suggestions = [
    {
      'id': 'tag',
      'name': 'Diseño final',
      'type': 'sector',
      'insertText': 'Diseño-final',
    },
  ];
  int created = 0;
  String? failLine;
  Completer<void>? suggestionGate;
  late final _client = _api();
  @override
  ApiClient get api => _client;
  ApiClient _api() {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) async {
          requests.add(r);
          if (r.method != 'GET') await gate?.future;
          if (r.path == '/api/tags/suggest') await suggestionGate?.future;
          final missing = unresolved && r.path == '/api/tasks';
          final failLineNow =
              r.path == '/api/tasks' &&
              (r.data as Map?)?['rawText'] == failLine &&
              failLine != null;
          final fail =
              failLineNow ||
              (failMutation && r.method != 'GET') ||
              (failTemplates && r.path == '/api/templates') ||
              (failDescription &&
                  r.method == 'PATCH' &&
                  (r.data as Map?)?.containsKey('description') == true);
          if (missing || fail) {
            h.reject(
              DioException(
                requestOptions: r,
                type: DioExceptionType.badResponse,
                response: Response(
                  requestOptions: r,
                  statusCode: missing ? 409 : 503,
                  data: {
                    'error': {
                      'code': missing ? 'CONFLICT' : 'UNAVAILABLE',
                      'message': 'No se pudo guardar',
                      if (missing)
                        'unresolvedTags': [
                          {'symbol': '#', 'name': 'Nuevo'},
                        ],
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

  @override
  Object? respond(RequestOptions r) {
    final body = r.data is Map
        ? Map<String, dynamic>.from(r.data)
        : <String, dynamic>{};
    if (r.path == '/api/templates') return templates;
    if (r.path == '/api/tags/suggest') return suggestions;
    if (r.path == '/api/works/w') return work;
    if (r.path == '/api/works/tpl') {
      return {...work, 'id': 'tpl', 'isTemplate': true, 'objectives': <Json>[]};
    }
    if (r.path == '/api/works' && r.method == 'POST') return {'id': 'new'};
    if (r.path == '/api/works/new') return {...work, 'id': 'new'};
    if (r.path == '/api/sectors' && r.method == 'POST') {
      unresolved = false;
      return {'id': 'newSector'};
    }
    final objectives = work['objectives'] as List<Json>;
    if (r.path == '/api/works/w/objectives') {
      objectives.add({'id': 'o3', ...body, 'position': objectives.length});
      return objectives.last;
    }
    if (r.path.endsWith('/objectives/from-template')) {
      objectives.add({
        'id': 'inserted',
        'title': body['title'] == '' ? 'Entrega estándar' : body['title'],
        'position': objectives.length,
      });
      return objectives.last;
    }
    if (r.path.endsWith('/objectives/reorder')) {
      final ids = body['orderedObjectiveIds'] as List;
      for (final o in objectives) {
        o['position'] = ids.indexOf(o['id']);
      }
      return objectives;
    }
    if (r.path.endsWith('/save-as-template')) {
      return {'id': 'saved', 'name': 'Diseñar', 'copiedTasks': 2};
    }
    if (r.path.startsWith('/api/objectives/')) {
      final id = r.path.split('/').last;
      if (r.method == 'DELETE') {
        objectives.removeWhere((o) => o['id'] == id);
      } else {
        objectives.firstWhere((o) => o['id'] == id).addAll(body);
      }
      return {};
    }
    if (r.path == '/api/tasks' && r.method == 'POST') {
      final id = 'created${++created}';
      final task = {
        ...root(id, objective: body['contextObjectiveId'] as String?),
        'rawText': body['rawText'],
        'displayText': body['rawText'],
      };
      (work['tasks'] as List<Json>).add(task);
      return task;
    }
    if (r.path.startsWith('/api/tasks/') || r.path.endsWith('/tasks/reorder')) {
      return {};
    }
    return super.respond(r);
  }

  Iterable<RequestOptions> get mutations =>
      requests.where((r) => r.method != 'GET');
}

Future<void> enter(WidgetTester t, String key, String text) async {
  await t.ensureVisible(find.byKey(ValueKey(key)));
  await t.enterText(find.byKey(ValueKey(key)), text);
  await t.pumpAndSettle();
}

Future<void> label(WidgetTester t, String text) async {
  final f = find.text(text).last;
  await t.ensureVisible(f);
  await t.tap(f);
  await t.pumpAndSettle();
}

Future<void> scrollTo(WidgetTester t, String key) async {
  final list = find
      .descendant(
        of: find.byKey(const ValueKey('work_detail_list')),
        matching: find.byType(Scrollable),
      )
      .first;
  t.state<ScrollableState>(list).position.jumpTo(0);
  await t.pumpAndSettle();
  await t.scrollUntilVisible(find.byKey(ValueKey(key)), 200, scrollable: list);
}

Future<void> openTask(WidgetTester t, String id) async {
  await scrollTo(t, 'task_$id');
  await tap(t, 'task_$id');
}

Future<void> objectiveMenu(WidgetTester t) async {
  await scrollTo(t, 'objective_actions_o1');
  await tap(t, 'objective_actions_o1');
}

Future<void> sheetTap(WidgetTester t, String key) async {
  final scroll = find
      .descendant(
        of: find.byKey(const ValueKey('task_detail_list')),
        matching: find.byType(Scrollable),
      )
      .first;
  await t.scrollUntilVisible(
    find.byKey(ValueKey(key)),
    150,
    scrollable: scroll,
  );
  await tap(t, key);
}

void main() {
  testWidgets('el enlace de objetivo vuelve a abrir una sección plegada', (
    t,
  ) async {
    final f = Fixture();
    final app = await overview.mount(t, f, path: Routes.work('w'));
    final tile = find.byKey(const PageStorageKey('work_section_o1'));
    final controller = t.widget<ExpansionTile>(tile).controller!;
    controller.collapse();
    await t.pumpAndSettle();
    expect(controller.isExpanded, isFalse);
    app.router.go('/works/w?objectiveId=o1');
    await t.pumpAndSettle();
    expect(controller.isExpanded, isTrue);
    expect(t.takeException(), isNull);
  });

  setUpAll(() => initializeDateFormatting('es'));
  testWidgets('crear y editar objetivo; error conserva borrador', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await tap(t, 'objective_create');
    await enter(t, 'objective_title', 'Preparar');
    await enter(t, 'objective_description', 'Con medidas');
    f.failMutation = true;
    await tap(t, 'objective_save');
    expect(find.text('Preparar'), findsOneWidget);
    f.failMutation = false;
    await tap(t, 'objective_save');
    expect(f.mutations.last.data, {
      'title': 'Preparar',
      'description': 'Con medidas',
    });
    await objectiveMenu(t);
    await label(t, 'Editar objetivo');
    await enter(t, 'objective_description', '');
    await tap(t, 'objective_save');
    expect(f.mutations.last.data, {'title': 'Diseñar', 'description': ''});
  });
  testWidgets(
    'orden de objetivos usa conjunto completo y bloquea doble envío',
    (t) async {
      final f = Fixture();
      await overview.mount(t, f, path: Routes.work('w'));
      await objectiveMenu(t);
      f.gate = Completer<void>();
      await t.tap(find.text('Bajar'));
      await t.pumpAndSettle();
      expect(f.mutations.length, 1);
      f.gate!.complete();
      await t.pumpAndSettle();
      expect(f.mutations.single.data, {
        'orderedObjectiveIds': ['o2', 'o1'],
      });
    },
  );
  for (final keep in [true, false]) {
    testWidgets('borrar objetivo con elección explícita keep=$keep', (t) async {
      final f = Fixture();
      await overview.mount(t, f, path: Routes.work('w'));
      await objectiveMenu(t);
      await label(t, 'Eliminar objetivo');
      await tap(t, keep ? 'objective_keep_tasks' : 'objective_delete_tasks');
      expect(f.mutations, isEmpty);
      await label(t, 'Eliminar objetivo');
      expect(f.mutations.single.data, {
        'mode': keep ? 'moveToGeneral' : 'deleteTasks',
      });
    });
  }
  testWidgets('guardar como plantilla e insertar copia', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await objectiveMenu(t);
    await label(t, 'Guardar como plantilla');
    expect(f.mutations.last.path, '/api/objectives/o1/save-as-template');
    await scrollTo(t, 'objective_insert_template');
    await tap(t, 'objective_insert_template');
    await tap(t, 'objective_template_tpl');
    await enter(t, 'objective_title', 'Otro objetivo');
    await tap(t, 'objective_save');
    expect(f.mutations.last.data, {
      'templateId': 'tpl',
      'title': 'Otro objetivo',
    });
  });
  testWidgets('plantillas drawer, buscar, reintento y crear proyecto', (
    t,
  ) async {
    final f = Fixture()..failTemplates = true;
    await overview.mount(t, f, path: Routes.myDay);
    await overview.drawer(t, 'nav_templates');
    expect(find.text('No se pudo guardar'), findsOneWidget);
    f.failTemplates = false;
    await label(t, 'Reintentar');
    await enter(t, 'templates_search', 'no existe');
    expect(find.text('No hay plantillas para mostrar.'), findsOneWidget);
    await enter(t, 'templates_search', '');
    await tap(t, 'template_use_tpl');
    await enter(t, 'create_work_name', 'Nueva entrega');
    await tap(t, 'create_work_save');
    expect(f.mutations.last.data, {
      'name': 'Nueva entrega',
      'cloneFromId': 'tpl',
      'groupId': null,
    });
  });
  testWidgets('crear plantilla y prohibir objetivos anidados', (t) async {
    final f = Fixture();
    final app = await overview.mount(t, f, path: Routes.templates);
    await tap(t, 'template_create');
    await enter(t, 'create_work_name', 'Proceso');
    await tap(t, 'create_work_save');
    expect((f.mutations.last.data as Map)['isTemplate'], true);
    app.router.go(Routes.work('tpl'));
    await t.pumpAndSettle();
    expect(find.byKey(const ValueKey('objective_create')), findsNothing);
    expect(find.byKey(const ValueKey('task_composer_field')), findsOneWidget);
  });
  testWidgets('lectura y archivados no ofrecen organización ni alta', (
    t,
  ) async {
    final f = Fixture()..work['access'] = 'read';
    final app = await overview.mount(t, f, path: Routes.work('w'));
    expect(find.byKey(const ValueKey('objective_create')), findsNothing);
    expect(find.byKey(const ValueKey('task_composer_field')), findsNothing);
    f.work['access'] = 'operate';
    f.work['status'] = 'ARCHIVED';
    app.container.invalidate(workDetailProvider('w'));
    await t.pumpAndSettle();
    expect(find.byKey(const ValueKey('objective_create')), findsNothing);
    expect(find.byKey(const ValueKey('task_composer_field')), findsNothing);
  });
  testWidgets('ordenar sección reintenta sin perder orden', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await scrollTo(t, 'section_reorder_general');
    await tap(t, 'section_reorder_general');
    await tap(t, 'order_down_a');
    f.failMutation = true;
    await tap(t, 'order_save');
    expect(find.text('No se pudo guardar'), findsOneWidget);
    f.failMutation = false;
    await tap(t, 'order_save');
    expect(f.mutations.last.data, {
      'objectiveId': null,
      'orderedTaskIds': ['b', 'a'],
    });
  });
  testWidgets('mover objetivo y padre envía IDs y cierra detalle', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await openTask(t, 'a');
    await sheetTap(t, 'task_move_objective');
    await tap(t, 'task_move_to_o2');
    expect(f.mutations.last.data, {'objectiveId': 'o2'});
    expect(find.byKey(const ValueKey('task_close')), findsNothing);
    await openTask(t, 'a');
    await sheetTap(t, 'task_move_parent');
    expect(find.byKey(const ValueKey('task_move_to_a')), findsNothing);
    await tap(t, 'task_move_to_b');
    expect(f.mutations.last.data, {'parentId': 'b'});
  });
  testWidgets('separar subtarea y ordenar hijas', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await openTask(t, 'c1');
    await sheetTap(t, 'task_promote');
    expect(f.mutations.last.data, {'parentId': null});
    await openTask(t, 'c');
    await sheetTap(t, 'subtasks_reorder');
    await tap(t, 'order_down_c1');
    await tap(t, 'order_save');
    expect(f.mutations.last.path, '/api/tasks/c/subtasks/reorder');
    expect(f.mutations.last.data, {
      'orderedTaskIds': ['c2', 'c1'],
    });
  });
  testWidgets('tablero conserva detalle editable', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await label(t, 'Tablero');
    await openTask(t, 'a');
    expect(find.byKey(const ValueKey('task_text_save')), findsOneWidget);
  });
  test('vencimiento hereda fecha más próxima solo de hijas pendientes', () {
    final task = Task.fromJson(
      root(
        'p',
        children: [
          {...root('1'), 'dueDate': '2026-10-15'},
          {
            ...root('2'),
            'dueDate': '2026-10-10',
            'status': {'id': 'done', 'type': 'FINAL'},
          },
          {...root('3'), 'dueDate': '2026-10-20'},
        ],
      ),
    );
    expect(task.effectiveDueDate, DateTime.parse('2026-10-15'));
  });
  testWidgets('multilínea crea una por línea con descripción', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await tap(t, 'task_composer_details');
    await enter(t, 'task_composer_description', 'Controlar');
    await enter(t, 'task_composer_field', 'Una\n\nDos');
    await tap(t, 'task_composer_send');
    expect(f.created, 2);
    expect(f.mutations.where((r) => r.method == 'PATCH').map((r) => r.data), [
      {'description': 'Controlar'},
      {'description': 'Controlar'},
    ]);
  });
  testWidgets('fallo descripción reintenta PATCH sin duplicar alta', (t) async {
    final f = Fixture()..failDescription = true;
    await overview.mount(t, f, path: Routes.work('w'));
    await tap(t, 'task_composer_details');
    await enter(t, 'task_composer_description', 'Detalle');
    await enter(t, 'task_composer_field', 'Una');
    await tap(t, 'task_composer_send');
    expect(f.created, 1);
    f.failDescription = false;
    await tap(t, 'task_composer_send');
    expect(f.created, 1);
    expect(f.mutations.where((r) => r.method == 'PATCH').length, 2);
  });
  testWidgets(
    'referencia nueva crea recurso y conserva tarea para reintentar',
    (t) async {
      final f = Fixture()..unresolved = true;
      await overview.mount(t, f, path: Routes.work('w'));
      await enter(t, 'task_composer_field', 'Preparar #Nuevo');
      await tap(t, 'task_composer_send');
      await tap(t, 'task_create_missing_#_Nuevo');
      expect(f.mutations.last.path, '/api/sectors');
      await tap(t, 'task_composer_send');
      expect(f.created, 1);
    },
  );
  testWidgets('sugerencias contexto e ignorar respuesta atrasada', (t) async {
    final f = Fixture();
    await overview.mount(t, f, path: Routes.work('w'));
    await enter(t, 'task_composer_field', 'Cortar #Di');
    await t.pump(const Duration(milliseconds: 250));
    await t.pumpAndSettle();
    await tap(t, 'tag_suggestion_sector_tag');
    expect(
      t
          .widget<TextField>(find.byKey(const ValueKey('task_composer_field')))
          .controller!
          .text,
      'Cortar #Diseño-final ',
    );
    expect(
      f.requests
          .lastWhere((r) => r.path == '/api/tags/suggest')
          .queryParameters['contextWorkId'],
      'w',
    );
    f.suggestionGate = Completer<void>();
    await enter(t, 'task_composer_field', 'Cortar #Ot');
    await t.pump(const Duration(milliseconds: 250));
    await enter(t, 'task_composer_field', 'Cortar sin etiqueta');
    f.suggestionGate!.complete();
    await t.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('tag_suggestion_sector_tag')),
      findsNothing,
    );
  });
  testWidgets('lote parcial conserva solo líneas pendientes y no duplica', (
    t,
  ) async {
    final f = Fixture()..failLine = 'Dos';
    await overview.mount(t, f, path: Routes.work('w'));
    await enter(t, 'task_composer_field', 'Una\nDos\nTres');
    await tap(t, 'task_composer_send');
    expect(f.created, 1);
    expect(
      t
          .widget<TextField>(find.byKey(const ValueKey('task_composer_field')))
          .controller!
          .text,
      'Dos\nTres',
    );
    f.failLine = null;
    await tap(t, 'task_composer_send');
    expect(f.created, 3);
  });
  testWidgets('selector de objetivo eliminado cae en Generales al crear', (
    t,
  ) async {
    final f = Fixture();
    final app = await overview.mount(t, f, path: Routes.work('w'));
    await tap(t, 'work_composer_section_general');
    await label(t, 'Diseñar');
    (f.work['objectives'] as List).clear();
    app.container.invalidate(workDetailProvider('w'));
    await t.pumpAndSettle();
    await enter(t, 'task_composer_field', 'Tarea sin objetivo eliminado');
    await tap(t, 'task_composer_send');
    expect(
      (f.mutations.last.data as Map).containsKey('contextObjectiveId'),
      isFalse,
    );
  });
  testWidgets('resaltado respeta escapes y fechas válidas', (t) async {
    final controller = TaskTextController(
      text: '##literal #Diseño 31/02/2026 10/10/2026',
    );
    addTearDown(controller.dispose);
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(body: TextField(controller: controller)),
      ),
    );
    final span = controller.buildTextSpan(
      context: t.element(find.byType(TextField)),
      withComposing: false,
    );
    expect(
      span.children!
          .whereType<TextSpan>()
          .where((s) => s.style?.fontWeight == FontWeight.w600)
          .map((s) => s.text),
      ['#Diseño', '10/10/2026'],
    );
  });
  for (final dark in [false, true]) {
    testWidgets('360dp 1.5x objetivos y plantillas dark=$dark', (t) async {
      final f = Fixture();
      final app = await overview.mount(
        t,
        f,
        path: Routes.work('w'),
        dark: dark,
        scale: 1.5,
      );
      // Con el resumen del proyecto arriba, el botón queda bajo el pliegue.
      await scrollTo(t, 'objective_create');
      await tap(t, 'objective_create');
      expect(t.takeException(), isNull);
      await tap(t, 'objective_cancel');
      app.router.go(Routes.templates);
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      await tap(t, 'template_create');
      expect(t.takeException(), isNull);
      await tap(t, 'create_work_cancel');
      app.router.go(Routes.work('w'));
      await t.pumpAndSettle();
      await scrollTo(t, 'task_view_toggle');
      await label(t, 'Tablero');
      expect(t.takeException(), isNull);
    });
  }
}
