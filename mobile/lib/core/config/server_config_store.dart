import 'package:shared_preferences/shared_preferences.dart';

/// Persistencia de la URL del sistema elegida en el primer inicio.
class ServerConfigStore {
  ServerConfigStore(this._prefs);

  static const _key = 'server_url';
  final SharedPreferences _prefs;

  Uri? read() {
    final value = _prefs.getString(_key);
    return value == null ? null : Uri.tryParse(value);
  }

  Future<void> write(Uri url) => _prefs.setString(_key, url.toString());

  Future<void> clear() => _prefs.remove(_key);
}
