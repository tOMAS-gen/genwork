import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/data/models/json.dart';
import 'package:genwork_mobile/data/models/live_event.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/data/models/work.dart';

Json _status(String id, String type) => {'id': id, 'name': id, 'color': '#22c55e', 'type': type};

Json _task(String id, {String? objectiveId, String type = 'IN_PROGRESS', List<Json> subtasks = const []}) => {
      'id': id,
      'rawText': 'Tarea $id #corte',
      'displayText': 'Tarea $id',
      'status': _status(type == 'FINAL' ? 'hecha' : 'pend', type),
      'statusOptions': [_status('pend', 'IN_PROGRESS'), _status('hecha', 'FINAL')],
      'objectiveId': objectiveId,
      'dueDate': '2026-10-09T14:03:12.345Z',
      'subtasks': subtasks,
      'subtaskCount': subtasks.length,
      'links': [
        {'type': 'REF', 'targetType': 'USER', 'user': {'id': 'u1', 'name': 'Ana'}, 'sector': null},
      ],
    };

void main() {
  test('Task parsea estado, opciones, fecha y menciones', () {
    final task = Task.fromJson(_task('t1'));
    expect(task.isDone, isFalse);
    expect(task.finalOption?.id, 'hecha');
    expect(task.openOption?.id, 'pend');
    expect(task.dueDate, isNotNull);
    expect(task.links.single.isUser, isTrue);
    expect(task.links.single.kind, LinkKind.ref);
  });

  test('WorkDetail agrupa por sección y cuenta hojas', () {
    final work = WorkDetail.fromJson({
      'id': 'w1',
      'name': 'Proyecto',
      'code': 'proyecto_001',
      'status': 'ACTIVE',
      'access': 'operate',
      'objectives': [
        {'id': 'o2', 'title': 'Segundo', 'position': 1},
        {'id': 'o1', 'title': 'Primero', 'position': 0},
      ],
      'tasks': [
        _task('a'),
        _task('b', objectiveId: 'o1', subtasks: [_task('b1', type: 'FINAL'), _task('b2')]),
        _task('c', objectiveId: 'o2', type: 'FINAL'),
      ],
    });
    expect(work.canOperate, isTrue);
    expect(work.sections.map((s) => s.objective?.title), [null, 'Primero', 'Segundo']);
    expect(work.sections[1].tasks.single.subtasks, hasLength(2));
    expect(work.progress.total, 4); // a, b1, b2, c (el contenedor b no cuenta)
    expect(work.progress.done, 2);
  });

  test('LiveEvent', () {
    expect(LiveEvent.fromJson({'type': 'task-changed', 'taskId': 't', 'workId': null, 'sectorIds': ['s']}),
        isA<TaskChanged>());
    expect((LiveEvent.fromJson({'type': 'work-changed', 'workId': ''}) as WorkChanged).workId, isEmpty);
    expect(LiveEvent.fromJson({'type': 'otro'}), isNull);
  });

  test('ApiException toma code/message del contrato y deja extras', () {
    final options = RequestOptions(path: '/api/tasks');
    final e = ApiException.fromDio(DioException(
      requestOptions: options,
      response: Response(
        requestOptions: options,
        statusCode: 409,
        data: {
          'error': {
            'code': 'CONFLICT',
            'message': 'Etiquetas desconocidas',
            'unresolvedTags': [{'symbol': '#', 'name': 'x'}],
          },
        },
      ),
    ));
    expect(e.code, 'CONFLICT');
    expect(e.status, 409);
    expect(e.extra['unresolvedTags'], isA<List>());

    final network = ApiException.fromDio(DioException(requestOptions: options));
    expect(network.isNetwork, isTrue);
  });

  test('parseDay conserva el día calendario de la medianoche UTC', () {
    final day = parseDay('2026-10-09T00:00:00.000Z')!;
    expect([day.year, day.month, day.day], [2026, 10, 9]);
  });
}
