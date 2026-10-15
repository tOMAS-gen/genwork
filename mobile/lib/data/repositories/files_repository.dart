import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../models/json.dart';
import '../models/storage_file.dart';

class FilesRepository {
  FilesRepository(this.api);
  final ApiClient api;
  String _base(String id) => '/api/works/$id/files';
  Future<WorkFiles> list(String id, String path) async =>
      WorkFiles.fromJson(await api.get<Json>(_base(id), query: {'path': path}));
  Future<void> enable(String id) => api.post<Object?>('${_base(id)}/enable');
  Future<void> folder(String id, String path, String name) => api.post<Object?>(
    '${_base(id)}/folder',
    body: {'path': path, 'name': name},
  );
  Future<void> rename(String id, String path, String name) =>
      api.patch<Object?>(_base(id), body: {'path': path, 'newName': name});
  Future<void> delete(String id, String path) =>
      api.delete<Object?>(_base(id), query: {'path': path});
  Future<List<FileShare>> shares(String id, String path) async => parseList(
    (await api.get<Json>(
      '${_base(id)}/share',
      query: {'path': path},
    ))['shares'],
    FileShare.fromJson,
  );
  Future<FileShare> share(
    String id,
    String path, {
    String? email,
    String? password,
    DateTime? expires,
  }) async {
    String? userId;
    if (email != null) {
      userId =
          (await api.get<Json>(
                '${_base(id)}/share/resolve-user',
                query: {'email': email},
              ))['id']
              as String;
    }
    return FileShare.fromJson(
      await api.post<Json>(
        '${_base(id)}/share',
        body: {
          'path': path,
          'mode': email == null ? 'LINK' : 'INTERNAL',
          'targetUserId': ?userId,
          'password': ?password,
          if (expires != null) 'expiresAt': expires.toUtc().toIso8601String(),
        },
      ),
    );
  }

  Future<void> revoke(String id, String shareId) =>
      api.delete<Object?>('${_base(id)}/share/$shareId');
  Future<void> saveDocument(String id, Object? content) =>
      api.put<Object?>('/api/works/$id/doc', body: {'content': content});

  /// Multipart endpoint works for both configured providers and uses Bearer.
  Future<String?> upload(
    String id,
    Stream<List<int>> Function() openRead,
    int size,
    String name,
    String path,
    CancelToken cancel,
    ProgressCallback progress, {
    bool attachment = false,
  }) async {
    try {
      final response = await api.dio.post<dynamic>(
        attachment ? '/api/works/$id/attachments' : '${_base(id)}/upload',
        data: FormData.fromMap({
          'path': path,
          'file': MultipartFile.fromStream(
            openRead,
            size,
            filename: name,
            contentType: attachment
                ? DioMediaType(
                    'image',
                    name.toLowerCase().endsWith('.png')
                        ? 'png'
                        : name.toLowerCase().endsWith('.webp')
                        ? 'webp'
                        : 'jpeg',
                  )
                : null,
          ),
        }),
        cancelToken: cancel,
        onSendProgress: progress,
        options: Options(receiveTimeout: const Duration(minutes: 10)),
      );
      return attachment ? '/api/attachments/${response.data['id']}' : null;
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) rethrow;
      throw ApiException.fromDio(e);
    }
  }

  Future<void> download(
    String id,
    StorageFile file,
    String destination,
    CancelToken cancel,
    ProgressCallback progress,
  ) async {
    try {
      await api.dio.download(
        '${_base(id)}/download',
        destination,
        queryParameters: {'path': file.path, 'name': file.name},
        cancelToken: cancel,
        onReceiveProgress: progress,
        options: Options(
          followRedirects: false,
          receiveTimeout: const Duration(minutes: 10),
        ),
      );
    } on DioException catch (e) {
      // Dio download errors may arrive as bytes instead of JSON.
      if (CancelToken.isCancel(e)) rethrow;
      var data = e.response?.data;
      if (data is ResponseBody) {
        try {
          data = await utf8.decoder.bind(data.stream).join();
          e.response?.data = jsonDecode(data as String);
        } catch (_) {}
      }
      if (data is List<int>) {
        try {
          e.response?.data = jsonDecode(utf8.decode(data));
        } catch (_) {}
      }
      throw ApiException.fromDio(e);
    }
  }

  /// Never send the session token to document URLs or follow authenticated redirects.
  Future<Uint8List> image(String source) async {
    final uri = Uri.tryParse(source);
    if (uri == null) throw const FormatException('Imagen inválida');
    final base = Uri.parse(api.dio.options.baseUrl);
    final local =
        (!uri.hasScheme && !uri.hasAuthority) ||
        (uri.hasAuthority &&
            ['http', 'https'].contains(uri.scheme) &&
            uri.origin == base.origin);
    final attachment =
        local &&
        RegExp(r'^/api/attachments/[A-Za-z0-9_-]+$').hasMatch(uri.path);
    if (!attachment && uri.scheme != 'https') {
      throw const FormatException('Imagen no disponible');
    }
    final client = attachment ? api.dio : Dio();
    final response = await client.get<ResponseBody>(
      attachment ? uri.path : source,
      options: Options(
        responseType: ResponseType.stream,
        followRedirects: false,
        receiveTimeout: const Duration(seconds: 30),
      ),
    );
    final builder = BytesBuilder(copy: false);
    await for (final chunk in response.data!.stream) {
      if (builder.length + chunk.length > 10 * 1024 * 1024) {
        throw const FormatException('La imagen supera 10 MB');
      }
      builder.add(chunk);
    }
    return builder.takeBytes();
  }
}
