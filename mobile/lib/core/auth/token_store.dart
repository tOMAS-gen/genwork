import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/models/app_user.dart';

/// Token Bearer de la app y el usuario con el que se emitió, en el almacenamiento
/// seguro del sistema (Keychain / Keystore).
abstract class TokenStore {
  Future<StoredSession?> read();
  Future<void> write(StoredSession session);
  Future<void> clear();
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

  @override
  Future<StoredSession?> read() async {
    final token = await _storage.read(key: _tokenKey);
    final user = await _storage.read(key: _userKey);
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
  Future<void> write(StoredSession session) async {
    await _storage.write(key: _tokenKey, value: session.token);
    await _storage.write(key: _userKey, value: jsonEncode(session.user.toJson()));
  }

  @override
  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }
}
