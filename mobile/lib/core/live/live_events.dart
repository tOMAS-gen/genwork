import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import '../../data/models/json.dart';
import '../../data/models/live_event.dart';

/// Cliente SSE de `/api/stream` con reconexión (backoff hasta 30 s).
///
/// El servidor manda `data: <json>\n\n` y un heartbeat cada 30 s; si pasan 75 s
/// sin nada se da la conexión por muerta y se reconecta.
Stream<LiveEvent> liveEventStream(
  Dio dio, {
  CancelToken? cancelToken,
  String path = '/api/stream',
}) async* {
  var attempt = 0;
  while (cancelToken?.isCancelled != true) {
    try {
      final response = await dio.get<ResponseBody>(
        path,
        cancelToken: cancelToken,
        options: Options(
          responseType: ResponseType.stream,
          receiveTimeout: const Duration(seconds: 75),
          headers: {'Accept': 'text/event-stream'},
        ),
      );
      yield const LiveConnected();
      final lines = response.data!.stream
          .timeout(const Duration(seconds: 75))
          .cast<List<int>>()
          .transform(utf8.decoder)
          .transform(const LineSplitter());
      await for (final line in lines) {
        attempt = 0;
        if (!line.startsWith('data:')) continue;
        final payload = line.substring(5).trim();
        try {
          final decoded = jsonDecode(payload);
          if (decoded is! Map<String, dynamic>) continue;
          final event = LiveEvent.fromJson(Json.from(decoded));
          if (event != null) yield event;
        } on FormatException {
          // evento malformado: se ignora
        } on TypeError {
          // Una forma desconocida no debe cortar las actualizaciones.
        }
      }
    } on DioException catch (e) {
      // Sin sesión no tiene sentido reintentar: el 401 ya dispara el logout.
      if (CancelToken.isCancel(e) ||
          e.response?.statusCode == 401 ||
          e.response?.statusCode == 403) {
        return;
      }
    } on TimeoutException {
      // Un stream abierto pero sin heartbeat también debe reconectar.
    }
    attempt++;
    final delay = Future<void>.delayed(
      Duration(seconds: (1 << attempt.clamp(0, 5)).clamp(1, 30)),
    );
    if (cancelToken == null) {
      await delay;
    } else {
      await Future.any([delay, cancelToken.whenCancel]);
    }
  }
}
