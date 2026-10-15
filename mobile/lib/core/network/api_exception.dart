import 'package:dio/dio.dart';

/// Error de la API de genwork con el contrato `{ error: { code, message } }`.
///
/// `code` es el código de dominio (`UNAUTHORIZED`, `CONFLICT`, `WORK_ARCHIVED`…) o
/// `NETWORK` cuando no hubo respuesta. `extra` trae campos adicionales del error
/// (ej. `unresolvedTags`).
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.status,
    this.extra = const {},
  });

  final String code;
  final String message;
  final int? status;
  final Map<String, dynamic> extra;

  bool get isUnauthorized => status == 401;
  bool get isNetwork => code == 'NETWORK';

  factory ApiException.fromDio(DioException e) {
    final response = e.response;
    if (response == null) {
      return const ApiException(
        code: 'NETWORK',
        message: 'No se pudo conectar con el servidor. Revisá tu conexión.',
      );
    }
    final data = response.data;
    if (data is Map && data['error'] is Map) {
      final error = Map<String, dynamic>.from(data['error'] as Map);
      return ApiException(
        code: (error.remove('code') as String?) ?? 'UNKNOWN',
        message: (error.remove('message') as String?) ?? 'Error inesperado',
        status: response.statusCode,
        extra: error,
      );
    }
    return ApiException(
      code: 'HTTP_${response.statusCode}',
      message: 'Error inesperado del servidor (${response.statusCode})',
      status: response.statusCode,
    );
  }

  @override
  String toString() => 'ApiException($code, $status): $message';
}
