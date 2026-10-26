// Piloto premium del detalle de tarea (spec 066, implementacion-premium, P09).
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/json.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/features/tasks/task_assign_dialog.dart';
import 'package:genwork_mobile/features/tasks/task_detail_sheet.dart';
import 'package:intl/date_symbol_data_local.dart';

Json taskJson({
  String id = 't',
  String text = 'Preparar los originales',
  List<Json> subtasks = const [],
  String? parentId,
  bool canToggle = true,
}) => {
  'id': id,
  'rawText': text,
  'displayText': text,
  'workId': 'w',
  'work': {'id': 'w', 'name': 'Cartelería del local'},
  'objectiveTitle': 'Preparación y entrega',
  'parentId': ?parentId,
  'status': {'id': 'open', 'name': 'Pendiente', 'type': 'IN_PROGRESS'},
  'statusOptions': [
    {'id': 'open', 'name': 'Pendiente', 'type': 'IN_PROGRESS'},
    {'id': 'done', 'name': 'Terminado', 'type': 'FINAL'},
  ],
  'canToggle': canToggle,
  'canManageMyDay': true,
  'subtasks': subtasks,
  'subtaskCount': subtasks.length,
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

/// API mínima del detalle: proyecto `w` con la tarea, avisos e historial.
ApiHarness detailApi(
  Json task, {
  int recipientCount = 2,
  Object? Function(RequestOptions)? extra,
}) {
  late ApiHarness harness;
  harness = ApiHarness((r) {
    if (extra?.call(r) case final Object value) return value;
    if (r.path == '/api/works/w') {
      return {
        'id': 'w',
        'name': 'Cartelería del local',
        'access': 'operate',
        'tasks': [task],
      };
    }
    if (r.path == '/api/tasks/${task['id']}/notifications') {
      return {'task': task, 'recipientCount': recipientCount};
    }
    if (r.path == '/api/tasks/${task['id']}/status-changes') {
      return [
        {
          'id': 'c1',
          'fromStatus': {'name': 'Pendiente'},
          'toStatus': {'name': 'Terminado', 'color': '#22c55e'},
          'changedByName': 'Ana',
          'changedAt': '2026-10-20T12:00:00Z',
        },
      ];
    }
    throw StateError('Ruta inesperada ${r.method} ${r.path}');
  });
  return harness;
}

Future<ProviderContainer> mountDetail(
  WidgetTester tester,
  ApiHarness harness,
  Json task, {
  bool canEdit = true,
  bool dark = false,
}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [apiClientProvider.overrideWithValue(harness.api)],
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: TaskDetailSheet(
          task: Task.fromJson(task),
          canEdit: canEdit,
          canManageMyDay: canEdit,
          fromSector: false,
          workId: 'w',
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

Future<void> openMore(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('task_more')));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('Tarea 1: barra con contexto y menú', () {
    testWidgets('la barra muestra el contexto y el título va en el cuerpo', (
      tester,
    ) async {
      final task = taskJson();
      await mountDetail(tester, detailApi(task), task);
      final appBar = find.byType(AppBar);
      expect(
        find.descendant(
          of: appBar,
          matching: find.text('Cartelería del local › Preparación y entrega'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: appBar,
          matching: find.text('Preparar los originales'),
        ),
        findsNothing,
      );
      final title = tester.widget<TextField>(
        find.byKey(const ValueKey('task_text_field')),
      );
      expect(title.controller!.text, 'Preparar los originales');
      expect(title.style!.fontSize, 20);
      expect(find.byKey(const ValueKey('task_text_save')), findsOneWidget);
    });

    testWidgets('tarea de sector: la miga es el sector', (tester) async {
      final task = {
        ...taskJson(),
        'work': null,
        'workId': null,
        'objectiveTitle': null,
        'homeSector': {'id': 's', 'name': 'Impresión'},
      };
      await mountDetail(tester, detailApi(task), task);
      expect(
        find.descendant(
          of: find.byType(AppBar),
          matching: find.text('#Impresión'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('mover, historial y borrar viven en el menú ⋯', (tester) async {
      final task = taskJson(parentId: 'p');
      await mountDetail(tester, detailApi(task), task);
      // Ya no están en el cuerpo.
      for (final key in ['task_delete', 'task_promote', 'task_move_parent']) {
        expect(find.byKey(ValueKey(key)), findsNothing, reason: key);
      }
      expect(find.text('Historial'), findsNothing);
      await openMore(tester);
      expect(find.byKey(const ValueKey('task_promote')), findsOneWidget);
      expect(find.byKey(const ValueKey('task_move_parent')), findsOneWidget);
      expect(find.byKey(const ValueKey('task_history')), findsOneWidget);
      final delete = find.descendant(
        of: find.byKey(const ValueKey('task_delete')),
        matching: find.text('Borrar tarea'),
      );
      expect(tester.widget<Text>(delete).style?.color, GenColors.light.danger);
    });

    testWidgets('el historial se abre en un diálogo', (tester) async {
      final task = taskJson();
      await mountDetail(tester, detailApi(task), task);
      await openMore(tester);
      await tester.tap(find.byKey(const ValueKey('task_history')));
      await tester.pumpAndSettle();
      expect(find.text('Historial de estados'), findsOneWidget);
      expect(find.text('Pendiente → Terminado'), findsOneWidget);
    });

    testWidgets('sin permiso de editar, el menú solo ofrece el historial', (
      tester,
    ) async {
      final task = taskJson(canToggle: false);
      await mountDetail(tester, detailApi(task), task, canEdit: false);
      expect(find.byKey(const ValueKey('task_text_save')), findsNothing);
      await openMore(tester);
      expect(find.byKey(const ValueKey('task_history')), findsOneWidget);
      expect(find.byKey(const ValueKey('task_delete')), findsNothing);
      expect(find.byKey(const ValueKey('task_move_parent')), findsNothing);
    });
  });

  group('Tarea 2: fila de chips', () {
    Object? mutations(RequestOptions r) =>
        r.method == 'GET' ? null : <String, Object?>{};

    testWidgets('estado, Mi día, Urgente y Recordatorio en una fila de chips', (
      tester,
    ) async {
      final task = taskJson();
      await mountDetail(tester, detailApi(task), task);
      // Ninguna fila con interruptor.
      expect(find.byType(SwitchListTile), findsNothing);
      expect(find.byType(Switch), findsNothing);
      final row = find.byKey(const ValueKey('task_chip_row'));
      for (final key in [
        'task_status_open',
        'task_status_done',
        'task_my_day',
        'task_urgent',
        'task_reminder',
      ]) {
        expect(
          find.descendant(of: row, matching: find.byKey(ValueKey(key))),
          findsOneWidget,
          reason: key,
        );
      }
      expect(
        tester
            .widget<FilterChip>(find.byKey(const ValueKey('task_my_day')))
            .selected,
        isFalse,
      );
    });

    testWidgets('Mi día y Urgente llaman a su acción', (tester) async {
      final task = taskJson();
      final api = detailApi(task, extra: mutations);
      await mountDetail(tester, api, task);
      await tester.tap(find.byKey(const ValueKey('task_my_day')));
      await tester.pumpAndSettle();
      expect(
        api.requests.where((r) => r.method == 'POST').map((r) => r.path),
        contains('/api/tasks/t/my-day'),
      );
      await tester.tap(find.byKey(const ValueKey('task_urgent')));
      await tester.pumpAndSettle();
      expect(api.requests.where((r) => r.method == 'PATCH').single.data, {
        'isUrgent': true,
        'editContext': 'work',
      });
      // Lo que decía la fila de Urgente pasa al aviso al activarla.
      expect(find.text('Se avisó a 2 personas.'), findsOneWidget);
    });

    testWidgets('sin permiso de Mi día el chip no aparece', (tester) async {
      final task = taskJson(canToggle: false);
      await mountDetail(tester, detailApi(task), task, canEdit: false);
      expect(find.byKey(const ValueKey('task_my_day')), findsNothing);
      expect(
        tester
            .widget<FilterChip>(find.byKey(const ValueKey('task_urgent')))
            .onSelected,
        isNull,
      );
    });
  });

  group('Tarea 3: asignada a', () {
    Object? suggestions(RequestOptions r) {
      if (r.path == '/api/tags/suggest') {
        final q = (r.queryParameters['q'] as String? ?? '').toLowerCase();
        return [
              {
                'id': 's1',
                'name': 'Impresión',
                'type': 'sector',
                'insertText': 'Impresión',
              },
              {
                'id': 'u1',
                'name': 'Ana Pérez',
                'type': 'user',
                'insertText': 'Ana-Pérez',
              },
            ]
            .where((s) => (s['name'] as String).toLowerCase().startsWith(q))
            .toList();
      }
      if (r.method == 'PATCH') return <String, Object?>{};
      return null;
    }

    testWidgets('los chips de la tarea van en el bloque Asignada a', (
      tester,
    ) async {
      final task = taskJson();
      await mountDetail(tester, detailApi(task), task);
      final block = find.byKey(const ValueKey('task_assigned'));
      expect(
        find.descendant(of: block, matching: find.text('ASIGNADA A')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: block,
          matching: find.byKey(const ValueKey('task_origin_work')),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: block,
          matching: find.byKey(const ValueKey('task_assign')),
        ),
        findsOneWidget,
      );
    });

    testWidgets('elegir un sector agrega #sector al texto y guarda', (
      tester,
    ) async {
      final task = taskJson();
      final api = detailApi(task, extra: suggestions);
      await mountDetail(tester, api, task);
      await tester.tap(find.byKey(const ValueKey('task_assign')));
      await tester.pumpAndSettle();
      expect(find.text('SECTORES'), findsOneWidget);
      expect(find.text('PERSONAS'), findsOneWidget);
      expect(
        api.requests
            .lastWhere((r) => r.path == '/api/tags/suggest')
            .queryParameters['symbol'],
        '@',
      );
      await tester.tap(find.byKey(const ValueKey('task_assign_sector_s1')));
      await tester.pumpAndSettle();
      expect(api.requests.where((r) => r.method == 'PATCH').single.data, {
        'rawText': 'Preparar los originales #Impresión',
        'editContext': 'work',
      });
    });

    testWidgets('elegir una persona agrega @persona; el buscador filtra', (
      tester,
    ) async {
      final task = taskJson();
      final api = detailApi(task, extra: suggestions);
      await mountDetail(tester, api, task);
      await tester.tap(find.byKey(const ValueKey('task_assign')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('task_assign_search')),
        'an',
      );
      // Espera el debounce del buscador y la respuesta de la API.
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('task_assign_sector_s1')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('task_assign_user_u1')));
      await tester.pumpAndSettle();
      expect(
        api.requests.where((r) => r.method == 'PATCH').single.data['rawText'],
        'Preparar los originales @Ana-Pérez',
      );
    });

    testWidgets('sin permiso de editar el texto no hay + Asignar', (
      tester,
    ) async {
      final task = taskJson(canToggle: false);
      await mountDetail(tester, detailApi(task), task, canEdit: false);
      expect(find.byKey(const ValueKey('task_assign')), findsNothing);
    });

    testWidgets('en contexto de sector el selector no ofrece sectores', (
      tester,
    ) async {
      final api = detailApi(taskJson(), extra: suggestions);
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [apiClientProvider.overrideWithValue(api.api)],
      );
      addTearDown(container.dispose);
      String? picked;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light(),
            home: Builder(
              builder: (context) => TextButton(
                onPressed: () async => picked = await showTaskAssignDialog(
                  context,
                  sectorId: 's9',
                  allowSectors: false,
                ),
                child: const Text('abrir'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('abrir'));
      await tester.pumpAndSettle();
      expect(find.text('SECTORES'), findsNothing);
      expect(find.byKey(const ValueKey('task_assign_sector_s1')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('task_assign_user_u1')));
      await tester.pumpAndSettle();
      expect(picked, '@Ana-Pérez');
    });
  });
}
