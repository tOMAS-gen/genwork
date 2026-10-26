// La fecha de entrega es un día de calendario: la web la guarda a medianoche
// UTC y la muestra leyendo el día en UTC. Android tiene que mostrar el mismo
// día aunque el teléfono esté en UTC-3 (correr con TZ=America/Argentina/Buenos_Aires).
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/data/models/portal.dart';
import 'package:genwork_mobile/data/models/task.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/data/repositories/works_repository.dart';
import 'package:genwork_mobile/features/works/works_dashboard.dart';

const _cases = {
  'medianoche UTC (lo que guarda el selector)': '2026-10-29T00:00:00.000Z',
  'una hora cerca del cambio de día': '2026-10-29T01:05:00.000Z',
  'una hora tarde': '2026-10-29T23:30:00.000Z',
};

Map<String, Object?> _status() => {
  'id': 'p',
  'name': 'Pendiente',
  'color': '#22c55e',
  'type': 'IN_PROGRESS',
};

void _expectDay(DateTime? date) {
  expect(date, isNotNull);
  expect((date!.year, date.month, date.day), (2026, 10, 29));
}

void main() {
  for (final MapEntry(key: name, value: iso) in _cases.entries) {
    group(name, () {
      test('WorkSummary', () {
        _expectDay(
          WorkSummary.fromJson({
            'id': 'w',
            'name': 'P',
            'dueDate': iso,
          }).dueDate,
        );
      });
      test('WorkDetail', () {
        _expectDay(
          WorkDetail.fromJson({
            'id': 'w',
            'name': 'P',
            'status': 'ACTIVE',
            'dueDate': iso,
          }).dueDate,
        );
      });
      test('Task', () {
        _expectDay(
          Task.fromJson({
            'id': 't',
            'rawText': 'x',
            'displayText': 'x',
            'status': _status(),
            'dueDate': iso,
          }).dueDate,
        );
      });
      test('PortalWork y PortalTask', () {
        _expectDay(
          PortalWork.fromJson({'id': 'w', 'name': 'P', 'dueDate': iso}).dueDate,
        );
        _expectDay(PortalTask.fromJson({'id': 't', 'dueDate': iso}).dueDate);
      });
    });
  }

  test('la urgencia usa el mismo día que se muestra', () {
    final due = WorkSummary.fromJson({
      'id': 'w',
      'name': 'P',
      'dueDate': '2026-10-29T00:00:00.000Z',
    }).dueDate!;
    expect(dueUrgency(due, DateTime(2026, 10, 29, 22)).label, 'Vence hoy');
    expect(
      dueUrgency(due, DateTime(2026, 10, 28, 9)).label,
      '1 días restantes',
    );
  });

  test('el día elegido se envía como medianoche UTC, como la web', () async {
    final sent = <Object?>[];
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) {
          sent.add(r.data);
          h.resolve(Response(requestOptions: r, statusCode: 200, data: {}));
        },
      ),
    );
    final repo = WorksRepository(
      ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio),
    );
    await repo.update('w', dueDate: DateTime(2026, 10, 29));
    expect((sent.single as Map)['dueDate'], '2026-10-29T00:00:00.000Z');
  });
}
