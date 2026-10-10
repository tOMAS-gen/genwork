import '../../core/network/api_client.dart';
import '../models/board.dart';
import '../models/json.dart';

class BoardRepository {
  BoardRepository(this._api);
  final ApiClient _api;
  Future<List<BoardColumn>> list() async => parseList(
    await _api.get<List<dynamic>>('/api/board'),
    BoardColumn.fromJson,
  );
}
