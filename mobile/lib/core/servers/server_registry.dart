import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'server_profile.dart';

/// Lista de servidores guardados + cuál está activo (SharedPreferences). Los
/// tokens NO viven acá: están por perfil en el almacenamiento seguro.
class ServerRegistry {
  ServerRegistry(this._prefs);

  static const _profilesKey = 'server_profiles';
  static const _activeKey = 'active_server_id';
  static const _legacyKey = 'server_url';
  final SharedPreferences _prefs;

  List<ServerProfile> profiles() {
    final raw = _prefs.getString(_profilesKey);
    if (raw == null) return <ServerProfile>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return <ServerProfile>[];
      return decoded.map(ServerProfile.tryFromJson).whereType<ServerProfile>().toList();
    } on FormatException {
      return <ServerProfile>[];
    }
  }

  ServerProfile? byId(String? id) {
    if (id == null) return null;
    for (final p in profiles()) {
      if (p.id == id) return p;
    }
    return null;
  }

  /// El perfil activo; si el guardado ya no existe, el primero. Null = primer inicio.
  ServerProfile? active() =>
      byId(_prefs.getString(_activeKey)) ?? profiles().firstOrNull;

  /// Agrega el servidor o, si ya estaba, actualiza su nombre. No lo activa.
  Future<ServerProfile> upsert(Uri url, {String? name}) async {
    final list = profiles();
    final id = ServerProfile.idFor(url);
    final i = list.indexWhere((p) => p.id == id);
    final clean = name?.trim();
    final ServerProfile profile;
    if (i >= 0) {
      profile = (clean == null || clean.isEmpty) ? list[i] : list[i].withName(clean);
      list[i] = profile;
    } else {
      profile = ServerProfile.forUrl(url, name: clean);
      list.add(profile);
    }
    await _save(list);
    return profile;
  }

  Future<void> setActive(String id) => _prefs.setString(_activeKey, id);

  /// Quita el perfil. Si era el activo, pasa el activo al primero que quede.
  Future<void> remove(String id) async {
    final list = profiles()..removeWhere((p) => p.id == id);
    await _save(list);
    if (_prefs.getString(_activeKey) == id) {
      if (list.isEmpty) {
        await _prefs.remove(_activeKey);
      } else {
        await _prefs.setString(_activeKey, list.first.id);
      }
    }
  }

  Uri? _legacyUrl() {
    final legacy = _prefs.getString(_legacyKey);
    if (legacy == null) return null;
    final url = Uri.tryParse(legacy);
    return (url == null || url.host.isEmpty) ? null : url;
  }

  /// Hay un `server_url` viejo pero no sirve (vacío o sin host). El token global
  /// asociado no se puede atribuir a ningún servidor: quien llama debe
  /// descartarlo (`TokenStore.discardLegacy`) y luego [dropLegacyUrl].
  bool get hasInvalidLegacy =>
      _prefs.containsKey(_legacyKey) && _legacyUrl() == null;

  Future<void> dropLegacyUrl() => _prefs.remove(_legacyKey);

  /// Versiones anteriores guardaban un solo `server_url`. Lo convierte en el
  /// primer perfil (activo) y recién después borra la clave vieja: si la app
  /// muere a mitad, el próximo inicio repite la migración (es idempotente).
  /// Devuelve null si no había (o si era inválida: ver [hasInvalidLegacy]).
  Future<ServerProfile?> migrateLegacy() async {
    final url = _legacyUrl();
    if (url == null) return null;
    final profile = await upsert(url);
    await setActive(profile.id);
    await _prefs.remove(_legacyKey);
    return profile;
  }

  Future<void> _save(List<ServerProfile> list) =>
      _prefs.setString(_profilesKey, jsonEncode(list.map((p) => p.toJson()).toList()));
}
