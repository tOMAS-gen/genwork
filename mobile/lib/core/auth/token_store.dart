import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/models/app_user.dart';

/// Token Bearer de la app y el usuario con el que se emitió, **uno por servidor
/// guardado** (`profileId`), en el almacenamiento seguro del sistema (Keychain /
/// Keystore).
abstract class TokenStore {
  Future<StoredSession?> read(String profileId);
  Future<void> write(String profileId, StoredSession session);
  Future<void> clear(String profileId);

  /// Versiones anteriores guardaban un único token global. Lo mueve al perfil
  /// indicado y borra el viejo; si no hay nada, no hace nada.
  Future<void> adoptLegacy(String profileId);

  /// Borra el token global viejo sin adoptarlo (su servidor ya no se conoce).
  Future<void> discardLegacy();
}

class StoredSession {
  const StoredSession({required this.token, required this.user});

  final String token;
  final AppUser user;
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';
  final FlutterSecureStorage _storage;

  String _t(String id) => '$_tokenKey:$id';
  String _u(String id) => '$_userKey:$id';

  StoredSession? _decode(String? token, String? user) {
    if (token == null || user == null) return null;
    try {
      return StoredSession(
        token: token,
        user: AppUser.fromJson(jsonDecode(user) as Map<String, dynamic>),
      );
    } on FormatException {
      return null;
    }
  }

  @override
  Future<StoredSession?> read(String profileId) async => _decode(
        await _storage.read(key: _t(profileId)),
        await _storage.read(key: _u(profileId)),
      );

  @override
  Future<void> write(String profileId, StoredSession session) async {
    await _storage.write(key: _t(profileId), value: session.token);
    await _storage.write(key: _u(profileId), value: jsonEncode(session.user.toJson()));
  }

  @override
  Future<void> clear(String profileId) async {
    await _storage.delete(key: _t(profileId));
    await _storage.delete(key: _u(profileId));
  }

  @override
  Future<void> adoptLegacy(String profileId) async {
    final token = await _storage.read(key: _tokenKey);
    final user = await _storage.read(key: _userKey);
    if (token != null && user != null && await read(profileId) == null) {
      await _storage.write(key: _t(profileId), value: token);
      await _storage.write(key: _u(profileId), value: user);
    }
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }

  @override
  Future<void> discardLegacy() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }
}
