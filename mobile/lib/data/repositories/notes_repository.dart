import '../../core/network/api_client.dart';
import '../models/json.dart';
import '../models/note.dart';

class NotesRepository {
  NotesRepository(this._api);

  final ApiClient _api;

  Future<List<Note>> list() async => parseList(await _api.get<List<dynamic>>('/api/notes'), Note.fromJson);

  Future<Note> get(String id) async => Note.fromJson(await _api.get<Json>('/api/notes/$id'));

  /// Crea una nota vacía.
  Future<Note> create() async => Note.fromJson(await _api.post<Json>('/api/notes'));

  Future<Note> update(String id, {String? title, Object? content}) async =>
      Note.fromJson(await _api.patch<Json>('/api/notes/$id', body: {
        'title': ?title,
        'content': ?content,
      }));

  Future<void> delete(String id) => _api.delete<Object?>('/api/notes/$id');
}
