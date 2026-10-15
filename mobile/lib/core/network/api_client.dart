import 'package:dio/dio.dart';

import 'api_exception.dart';

/// Cliente HTTP de la API REST de genwork.
///
/// Agrega `Authorization: Bearer <token>` y traduce todo error a [ApiException].
/// Ante un 401 llama a [onUnauthorized] (token revocado o vencido → volver al login).
class ApiClient {
  ApiClient({
    required Uri baseUrl,
    String? token,
    void Function()? onUnauthorized,
    Dio? dio,
  }) : dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: baseUrl.toString(),
               connectTimeout: const Duration(seconds: 15),
               receiveTimeout: const Duration(seconds: 30),
               contentType: Headers.jsonContentType,
               responseType: ResponseType.json,
             ),
           ) {
    this.dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401) onUnauthorized?.call();
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) =>
      _send(() => dio.get<T>(path, queryParameters: _clean(query)));

  Future<T> post<T>(String path, {Object? body, Map<String, dynamic>? query}) =>
      _send(
        () => dio.post<T>(path, data: body, queryParameters: _clean(query)),
      );

  Future<T> put<T>(String path, {Object? body}) =>
      _send(() => dio.put<T>(path, data: body));

  Future<T> patch<T>(String path, {Object? body}) =>
      _send(() => dio.patch<T>(path, data: body));

  Future<T> delete<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) => _send(
    () => dio.delete<T>(path, data: body, queryParameters: _clean(query)),
  );

  Future<T> _send<T>(Future<Response<T>> Function() request) async {
    try {
      final response = await request();
      return response.data as T;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  static Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    return {
      for (final entry in query.entries)
        if (entry.value != null) entry.key: entry.value,
    };
  }
}
