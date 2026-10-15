import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/live/live_events.dart';
import 'package:genwork_mobile/data/models/live_event.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/features/files/files_providers.dart';
import 'package:genwork_mobile/features/shell/live_refresher.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';
import 'daily_parity_test.dart' show ApiHarness;

void main() {
  testWidgets(
    'QA10 mover una tarea en web refresca también el proyecto de origen',
    (t) async {
      var moved = false;
      final requests = <String>[];
      final events = StreamController<LiveEvent>();
      final harness = ApiHarness((r) {
        requests.add(r.path);
        return {
          'id': r.path.split('/').last,
          'name': moved ? 'Actualizado' : 'Inicial',
          'status': 'ACTIVE',
          'tasks': [],
          'objectives': [],
          'access': 'operate',
        };
      });
      final c = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(harness.api),
          liveEventsProvider.overrideWithValue(events.stream),
        ],
      );
      addTearDown(c.dispose);
      addTearDown(events.close);
      c.listen(liveRefresherProvider, (_, _) {});
      c.listen(workDetailProvider('origen'), (_, _) {});
      c.listen(workDetailProvider('destino'), (_, _) {});
      await t.pumpAndSettle();
      moved = true;
      events.add(
        const TaskChanged(taskId: 't', workId: 'destino', sectorIds: []),
      );
      await t.pumpAndSettle();
      expect(requests.where((r) => r == '/api/works/origen').length, 2);
      expect(
        c.read(workDetailProvider('origen')).requireValue.name,
        'Actualizado',
      );
      expect(
        c.read(workDetailProvider('destino')).requireValue.name,
        'Actualizado',
      );
    },
  );
  for (final reconnect in [false, true]) {
    testWidgets(
      'QA10 archivos y compartidos se refrescan al ${reconnect ? 'reconectar' : 'reanudar'}',
      (t) async {
        final events = StreamController<LiveEvent>();
        final harness = ApiHarness(
          (r) => r.path.endsWith('/share')
              ? {'shares': []}
              : {'status': 'READY', 'entries': [], 'canWrite': true},
        );
        final c = ProviderContainer(
          overrides: [
            apiClientProvider.overrideWithValue(harness.api),
            liveEventsProvider.overrideWithValue(events.stream),
          ],
        );
        addTearDown(c.dispose);
        addTearDown(events.close);
        t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
        c.listen(liveRefresherProvider, (_, _) {});
        c.listen(workFilesProvider((id: 'w', path: '')), (_, _) {});
        c.listen(fileSharesProvider((id: 'w', path: 'archivo')), (_, _) {});
        await t.pumpAndSettle();
        if (reconnect) {
          events.add(const LiveConnected());
        } else {
          for (final state in [
            AppLifecycleState.inactive,
            AppLifecycleState.hidden,
            AppLifecycleState.paused,
            AppLifecycleState.hidden,
            AppLifecycleState.inactive,
            AppLifecycleState.resumed,
          ]) {
            t.binding.handleAppLifecycleStateChanged(state);
          }
        }
        await t.pumpAndSettle();
        expect(
          harness.requests.where((r) => r.path == '/api/works/w/files').length,
          2,
        );
        expect(
          harness.requests.where((r) => r.path.endsWith('/share')).length,
          2,
        );
      },
    );
  }
  test('QA10 SSE ignora eventos malformados y conserva los siguientes', () async {
    final dio = Dio();
    final cancel = CancelToken();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) => h.resolve(
          Response(
            requestOptions: r,
            statusCode: 200,
            data: ResponseBody(
              Stream.value(
                Uint8List.fromList(
                  utf8.encode(
                    'data: []\n\ndata: {"type":"task-changed","taskId":3}\n\ndata: no-json\n\ndata: {"type":"work-changed","workId":"w"}\n\n',
                  ),
                ),
              ),
              200,
            ),
          ),
        ),
      ),
    );
    final seen = <LiveEvent>[];
    await for (final event in liveEventStream(dio, cancelToken: cancel)) {
      seen.add(event);
      if (event is WorkChanged) cancel.cancel();
    }
    expect(seen.map((e) => e.runtimeType), [LiveConnected, WorkChanged]);
  });
  test('QA10 SSE vuelve a sincronizar después de una caída', () async {
    final dio = Dio();
    final cancel = CancelToken();
    var calls = 0;
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) {
          calls++;
          h.resolve(
            Response(
              requestOptions: r,
              statusCode: 200,
              data: ResponseBody(const Stream.empty(), 200),
            ),
          );
        },
      ),
    );
    final seen = <LiveEvent>[];
    await for (final event in liveEventStream(dio, cancelToken: cancel)) {
      seen.add(event);
      if (calls == 2) cancel.cancel();
    }
    expect(seen.whereType<LiveConnected>().length, 2);
  });
}
