import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

import '../../core/auth/pkce.dart';
import '../../core/auth/token_store.dart';
import '../../core/network/api_exception.dart';
import '../models/app_user.dart';
import '../models/json.dart';

/// Esquema del deep link de retorno del login (`genwork://auth`). Tiene que
/// coincidir con el `MOBILE_CALLBACK_URL` del servidor y con Info.plist /
/// AndroidManifest.
const authCallbackScheme = 'genwork';

class LoginCancelled implements Exception {
  const LoginCancelled();
}

/// Login móvil (feature 064): navegador del sistema → login web → deep link con
/// código → canje PKCE por token Bearer.
class AuthRepository {
  AuthRepository({required this.serverUrl, Dio? dio})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: serverUrl.toString(), contentType: Headers.jsonContentType));

  final Uri serverUrl;
  final Dio _dio;

  /// Verifica que la URL apunte a un genwork con login móvil (`/api/auth/mobile/info`).
  Future<void> checkServer() async {
    try {
      final res = await _dio.get<Object?>('/api/auth/mobile/info');
      final data = res.data;
      if (data is Map && data['app'] == 'genwork') return;
    } on DioException catch (e) {
      if (e.response == null) throw ApiException.fromDio(e);
    }
    throw const ApiException(
      code: 'NOT_GENWORK',
      message: 'Esa dirección no es un servidor de genwork compatible con la app.',
    );
  }

  Future<StoredSession> login() async {
    final pkce = Pkce.generate();
    final state = randomUrlSafe(16);
    final startUrl = serverUrl.replace(
      path: '${serverUrl.path}/api/auth/mobile/start',
      queryParameters: {
        'code_challenge': pkce.challenge,
        'code_challenge_method': 'S256',
        'state': state,
      },
    );

    final String result;
    try {
      result = await FlutterWebAuth2.authenticate(
        url: startUrl.toString(),
        callbackUrlScheme: authCallbackScheme,
      );
    } on PlatformException catch (e) {
      if (e.code == 'CANCELED') throw const LoginCancelled();
      rethrow;
    }

    final callback = Uri.parse(result);
    final params = callback.queryParameters;
    if (params['state'] != state) {
      throw const ApiException(code: 'STATE_MISMATCH', message: 'El ingreso no coincide. Volvé a intentar.');
    }
    if (params['error'] == 'forbidden') {
      throw const ApiException(
        code: 'FORBIDDEN',
        message: 'Tu cuenta no tiene acceso a la app. Usá genwork desde la web.',
      );
    }
    final code = params['code'];
    if (code == null) {
      throw const ApiException(code: 'NO_CODE', message: 'No se recibió el código de ingreso.');
    }

    try {
      final res = await _dio.post<Json>('/api/auth/mobile/token', data: {
        'code': code,
        'codeVerifier': pkce.verifier,
        'deviceName': _deviceName(),
      });
      final data = res.data!;
      return StoredSession(
        token: data['token'] as String,
        user: AppUser.fromJson(Json.from(data['user'] as Map)),
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Revoca el token en el servidor. Best-effort: sin red igual se cierra la sesión local.
  Future<void> logout(String token) async {
    try {
      await _dio.post<void>(
        '/api/auth/mobile/logout',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException {
      // ignorado
    }
  }

  static String _deviceName() {
    try {
      return 'genwork app — ${Platform.operatingSystem}';
    } catch (_) {
      return 'genwork app';
    }
  }
}
