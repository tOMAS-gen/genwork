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

  /// Versiones anteriores guardaban un solo `server_url`. Lo convierte en el
  /// primer perfil (activo) y borra la clave vieja. Devuelve null si no había.
  Future<ServerProfile?> migrateLegacy() async {
    final legacy = _prefs.getString(_legacyKey);
    if (legacy == null) return null;
    await _prefs.remove(_legacyKey);
    final url = Uri.tryParse(legacy);
    if (url == null || url.host.isEmpty) return null;
    final profile = await upsert(url);
    await setActive(profile.id);
    return profile;
  }

  Future<void> _save(List<ServerProfile> list) =>
      _prefs.setString(_profilesKey, jsonEncode(list.map((p) => p.toJson()).toList()));
}
