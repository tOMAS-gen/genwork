import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../models/json.dart';
import '../models/sector.dart';

class SectorsRepository {
  SectorsRepository(this._api);

  final ApiClient _api;

  Future<List<SectorSummary>> list() async => parseList(
    await _api.get<List<dynamic>>('/api/sectors'),
    SectorSummary.fromJson,
  );

  Future<String> create({
    required String name,
    String? color,
    String? groupId,
    bool global = false,
  }) async {
    final result = await _api.post<Json>(
      '/api/sectors',
      body: {
        'name': name,
        'color': color,
        'groupId': ?groupId,
        if (global) 'global': true,
      },
    );
    return result['id'] as String;
  }

  Future<void> update(String id, {required String name, String? color}) => _api
      .patch<Object?>('/api/sectors/$id', body: {'name': name, 'color': color});

  /// El servidor exige consultar el impacto antes de confirmar el borrado.
  Future<SectorDeleteImpact> deletionImpact(String id) async {
    try {
      await _api.delete<Object?>('/api/sectors/$id');
    } on ApiException catch (e) {
      if (e.status == 409 &&
          e.extra['affectedTasks'] is int &&
          e.extra['looseTasks'] is int) {
        return SectorDeleteImpact(
          e.extra['affectedTasks'] as int,
          e.extra['looseTasks'] as int,
        );
      }
      rethrow;
    }
    throw const ApiException(
      code: 'INVALID_RESPONSE',
      message: 'No se pudo consultar el impacto. Volvé a cargar los sectores.',
    );
  }

  Future<void> delete(String id) =>
      _api.delete<Object?>('/api/sectors/$id', query: {'confirm': 'true'});

  /// Tablero del sector. [done] filtra por tipo de estado (null = todas).
  Future<SectorBoard> board(String id, {bool? done, String? workId}) async =>
      SectorBoard.fromJson(
        await _api.get<Json>(
          '/api/sectors/$id/tasks',
          query: {
            'statusType': done == null
                ? null
                : (done ? 'FINAL' : 'IN_PROGRESS'),
            'workId': workId,
          },
        ),
      );
}

class SectorDeleteImpact {
  const SectorDeleteImpact(this.links, this.looseTasks);
  final int links, looseTasks;
}
