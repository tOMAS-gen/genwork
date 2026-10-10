import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/storage_file.dart';
import 'package:genwork_mobile/data/repositories/files_repository.dart';
import 'package:genwork_mobile/features/documents/document_draft.dart';
import 'package:genwork_mobile/features/documents/document_screen.dart';
import 'package:genwork_mobile/features/documents/rich_document_editor.dart';
import 'package:genwork_mobile/features/files/files_screen.dart';
import 'package:genwork_mobile/features/files/file_shares_screen.dart';
import '../rich_editor_fake.dart';
import 'resource_operations_test.dart' show tap;

const rich = {
  'type': 'doc',
  'content': [
    {
      'type': 'heading',
      'attrs': {'level': 2},
      'content': [
        {'type': 'text', 'text': 'Título'},
      ],
    },
    {
      'type': 'paragraph',
      'content': [
        {
          'type': 'text',
          'text': 'enlace',
          'marks': [
            {
              'type': 'link',
              'attrs': {'href': 'https://example.com'},
            },
          ],
        },
      ],
    },
  ],
};

class Fixture {
  final calls = <RequestOptions>[];
  bool fail = false, readOnly = false, archived = false;
  bool? enabled;
  List<Map<String, dynamic>> shares = [];
  final files = <Map<String, dynamic>>[
    {'name': 'Carpeta', 'path': 'opaque-folder-id', 'isDirectory': true},
    {'name': 'Plan.md', 'path': 'Plan.md', 'size': 123, 'isDirectory': false},
  ];
  Completer<void>? gate;
  late final api = ApiClient(
    baseUrl: Uri.parse('https://test.invalid'),
    dio: Dio(BaseOptions(baseUrl: 'https://test.invalid'))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (r, h) async {
            calls.add(r);
            if (r.method != 'GET') await gate?.future;
            if (fail && r.method != 'GET') {
              h.reject(
                DioException(
                  requestOptions: r,
                  response: Response(
                    requestOptions: r,
                    statusCode: 501,
                    data: {
                      'error': {
                        'code': 'STORAGE_OP_NOT_SUPPORTED',
                        'message': 'Operación no disponible',
                      },
                    },
                  ),
                ),
              );
              return;
            }
            dynamic result = {};
            if (r.path == '/api/works/w') {
              result = {
                'id': 'w',
                'name': 'Proyecto',
                'access': readOnly ? 'read' : 'operate',
                'status': archived ? 'ARCHIVED' : 'ACTIVE',
                'doc': {'content': rich},
              };
            }
            if (r.path.endsWith('/files') && r.method == 'GET') {
              result = {
                'files': r.queryParameters['path'] == 'opaque-folder-id'
                    ? []
                    : files,
                if (enabled != null) 'folderEnabled': enabled,
                'canEnableFolder': true,
              };
            }
            if (r.path.endsWith('/enable')) enabled = true;
            if (r.path.endsWith('/files') && r.method == 'PATCH') {
              files[1]['name'] = (r.data as Map)['newName'];
            }
            if (r.path.endsWith('/files') && r.method == 'DELETE') {
              files.removeWhere((f) => f['path'] == r.queryParameters['path']);
            }
            if (r.path.endsWith('/resolve-user')) result = {'id': 'u'};
            if (r.path.endsWith('/share')) {
              if (r.method == 'POST') {
                final body = r.data as Map;
                shares.add({
                  'id': 'new',
                  'mode': body['mode'],
                  'targetUserName': 'Ana',
                  if (body['mode'] == 'LINK')
                    'linkUrl': 'https://cloud.invalid/s/abc',
                });
                result = shares.last;
              } else {
                result = {'shares': shares};
              }
            }
            if (r.path.endsWith('/share/new') && r.method == 'DELETE') {
              shares.clear();
            }
            if (r.path == '/api/notes/n') {
              result = {'id': 'n', 'title': 'Nota', 'content': rich};
            }
            if (r.path == '/api/notes') result = [];
            h.resolve(
              Response(requestOptions: r, data: result, statusCode: 200),
            );
          },
        ),
      ),
  );
}

Future<void> mount(
  WidgetTester t,
  Fixture f,
  Widget child, {
  bool dark = false,
  double scale = 1,
  Widget Function(RichDocumentEditor)? editor,
}) async {
  t.view.physicalSize = const Size(360, 800);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  await t.pumpWidget(
    ProviderScope(
      overrides: [
        apiClientProvider.overrideWithValue(f.api),
        richEditorBuilderProvider.overrideWithValue(editor ?? fakeRichEditor),
      ],
      child: MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('es')],
        locale: const Locale('es'),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: child,
      ),
    ),
  );
  await t.pumpAndSettle();
}

class BytesAdapter implements HttpClientAdapter {
  RequestOptions? request;
  @override
  Future<ResponseBody> fetch(
    RequestOptions r,
    Stream<Uint8List>? body,
    Future<void>? cancel,
  ) async {
    request = r;
    return ResponseBody.fromBytes(
      utf8.encode('contenido'),
      200,
      headers: {
        'content-length': ['9'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test(
    'reemplazar vista conserva import/export al desmontar la anterior',
    () async {
      final controller = RichEditorController();
      final old = Object(), current = Object();
      final calls = <String>[];
      controller.attach(old, (name, value) async => calls.add('old'));
      controller.attach(current, (name, value) async => calls.add(name));
      controller.detach(old);
      await controller.command('import', '## Título');
      await controller.command('export');
      expect(calls, ['import', 'export']);
      controller.detach(current);
    },
  );
  test(
    'autosave serial conserva escritura nueva frente a respuesta atrasada',
    () async {
      final gate = Completer<void>();
      final contents = <Object?>[];
      final draft = DocumentDraft(
        title: 'Nota',
        content: rich,
        persist: (_, doc) async {
          contents.add(doc);
          if (contents.length == 1) await gate.future;
        },
      );
      draft.change(content: {'version': 1});
      final saving = draft.save();
      draft.change(content: {'version': 2});
      expect(contents.length, 1);
      gate.complete();
      await saving;
      expect(contents, [
        {'version': 1},
        {'version': 2},
      ]);
      expect(draft.dirty, false);
      draft.dispose();
    },
  );
  test(
    'error conserva documento y retry envía exactamente el mismo JSON',
    () async {
      bool fail = true;
      Object? sent;
      final draft = DocumentDraft(
        title: 'Nota',
        content: null,
        persist: (_, doc) async {
          sent = doc;
          if (fail) throw Exception('red');
        },
      );
      draft.change(content: rich);
      await draft.save();
      expect(draft.dirty, true);
      expect(draft.error, isNotNull);
      expect(draft.content, rich);
      fail = false;
      await draft.save();
      expect(sent, rich);
      expect(draft.status, 'Guardado');
      draft.dispose();
    },
  );
  test('descarga usa Bearer, codifica path y no sigue redirecciones', () async {
    final adapter = BytesAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'))
      ..httpClientAdapter = adapter;
    final repo = FilesRepository(
      ApiClient(
        baseUrl: Uri.parse('https://test.invalid'),
        token: 'fixture-token',
        dio: dio,
      ),
    );
    final dir = await Directory.systemTemp.createTemp('download-test');
    try {
      await repo.download(
        'w',
        const StorageFile(
          name: 'a & b.md',
          path: 'carpeta/a & b.md',
          isDirectory: false,
        ),
        '${dir.path}/file',
        CancelToken(),
        (_, _) {},
      );
      expect(await File('${dir.path}/file').readAsString(), 'contenido');
      expect(adapter.request!.headers['Authorization'], 'Bearer fixture-token');
      expect(adapter.request!.followRedirects, false);
      expect(adapter.request!.queryParameters['path'], 'carpeta/a & b.md');
    } finally {
      await dir.delete(recursive: true);
    }
  });
  test('rechaza imágenes con esquemas locales y rutas API ajenas', () async {
    final repo = FilesRepository(
      ApiClient(baseUrl: Uri.parse('https://test.invalid')),
    );
    for (final src in [
      'file:///etc/passwd',
      'javascript:alert(1)',
      '/api/me',
      '//evil.invalid/api/attachments/id',
    ]) {
      await expectLater(repo.image(src), throwsFormatException);
    }
  });
  testWidgets('nota con formato guarda título sin aplanar contenido', (
    t,
  ) async {
    final f = Fixture();
    await mount(
      t,
      f,
      const DocumentScreen(noteId: 'n', title: 'Nota', content: rich),
    );
    await t.enterText(find.byKey(const ValueKey('note_title')), 'Nuevo título');
    await t.pump(const Duration(seconds: 1));
    await t.pumpAndSettle();
    final request = f.calls.singleWhere((r) => r.method == 'PATCH');
    expect(request.data['content'], rich);
    expect(request.data['title'], 'Nuevo título');
    expect(find.text('Guardado'), findsOneWidget);
  });
  testWidgets('editor debounce y retry visibles sin duplicar guardados', (
    t,
  ) async {
    final f = Fixture()..fail = true;
    await mount(
      t,
      f,
      const DocumentScreen(noteId: 'n', title: 'Nota', content: rich),
    );
    await t.enterText(find.byKey(const ValueKey('note_body')), 'Borrador');
    await t.pump(const Duration(seconds: 1));
    await t.pumpAndSettle();
    expect(find.text('No se pudo guardar'), findsOneWidget);
    expect(find.text('Borrador'), findsOneWidget);
    f.fail = false;
    await tap(t, 'document_retry');
    expect(find.text('Guardado'), findsOneWidget);
    expect(f.calls.where((r) => r.method == 'PATCH').length, 2);
  });
  testWidgets('documento read-only llega sin permiso de edición al motor', (
    t,
  ) async {
    final f = Fixture()..readOnly = true;
    RichDocumentEditor? received;
    await mount(
      t,
      f,
      const WorkDocumentScreen(workId: 'w'),
      editor: (e) {
        received = e;
        return fakeRichEditor(e);
      },
    );
    expect(received!.editable, false);
    expect(received!.content, rich);
    expect(find.byKey(const ValueKey('document_save')), findsNothing);
  });
  testWidgets('archivos navega con ID opaco y vuelve a raíz', (t) async {
    final f = Fixture();
    await mount(t, f, const FilesScreen(workId: 'w'));
    await tap(t, 'file_opaque-folder-id');
    expect(find.text('Esta carpeta está vacía'), findsOneWidget);
    expect(f.calls.last.queryParameters['path'], 'opaque-folder-id');
    await tap(t, 'files_up');
    expect(find.text('Plan.md'), findsOneWidget);
  });
  testWidgets('habilitar carpeta muestra estado de preparación', (t) async {
    final f = Fixture()..enabled = false;
    await mount(t, f, const FilesScreen(workId: 'w'));
    await tap(t, 'files_enable');
    expect(find.text('La carpeta se está preparando'), findsOneWidget);
    expect(find.byKey(const ValueKey('files_upload')), findsNothing);
  });
  testWidgets('renombrar preserva ruta y borrar requiere confirmación', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const FilesScreen(workId: 'w'));
    await t.tap(find.byTooltip('Opciones de Plan.md'));
    await t.pumpAndSettle();
    await t.tap(find.text('Renombrar'));
    await t.pumpAndSettle();
    await t.enterText(find.byKey(const ValueKey('file_name')), 'Nueva.md');
    await t.tap(find.text('Guardar'));
    await t.pumpAndSettle();
    expect(find.text('Nueva.md'), findsOneWidget);
    expect(f.calls.singleWhere((r) => r.method == 'PATCH').data, {
      'path': 'Plan.md',
      'newName': 'Nueva.md',
    });
    await t.tap(find.byTooltip('Opciones de Nueva.md'));
    await t.pumpAndSettle();
    await t.tap(find.text('Eliminar'));
    await t.pumpAndSettle();
    expect(f.calls.where((r) => r.method == 'DELETE'), isEmpty);
    await t.tap(find.widgetWithText(FilledButton, 'Eliminar'));
    await t.pumpAndSettle();
    expect(find.text('Nueva.md'), findsNothing);
  });
  for (final archived in [false, true]) {
    testWidgets('lectura/archivo oculta acciones mutables $archived', (
      t,
    ) async {
      final f = Fixture()
        ..readOnly = !archived
        ..archived = archived;
      await mount(t, f, const FilesScreen(workId: 'w'));
      expect(find.byKey(const ValueKey('files_upload')), findsNothing);
      await t.tap(find.byTooltip('Opciones de Plan.md'));
      await t.pumpAndSettle();
      expect(find.text('Renombrar'), findsNothing);
      expect(find.text('Eliminar'), findsNothing);
      expect(find.text('Descargar y abrir'), findsOneWidget);
    });
  }
  testWidgets('compartir usuario resuelve email, revocar exige confirmación', (
    t,
  ) async {
    final f = Fixture();
    await mount(
      t,
      f,
      const FileSharesScreen(
        workId: 'w',
        file: StorageFile(name: 'Plan.md', path: 'opaque', isDirectory: false),
      ),
    );
    await tap(t, 'share_internal');
    await t.enterText(
      find.byKey(const ValueKey('share_email')),
      'ana@example.com',
    );
    await tap(t, 'share_create');
    expect(
      f.calls
          .singleWhere((r) => r.path.endsWith('/resolve-user'))
          .queryParameters['email'],
      'ana@example.com',
    );
    expect(f.calls.singleWhere((r) => r.method == 'POST').data, {
      'path': 'opaque',
      'mode': 'INTERNAL',
      'targetUserId': 'u',
    });
    await tap(t, 'share_revoke_new');
    expect(f.shares, isNotEmpty);
    await t.tap(find.widgetWithText(FilledButton, 'Revocar'));
    await t.pumpAndSettle();
    expect(f.shares, isEmpty);
  });
  testWidgets('capacidad no soportada: error y formulario conservado', (
    t,
  ) async {
    final f = Fixture()..fail = true;
    await mount(
      t,
      f,
      const FileSharesScreen(
        workId: 'w',
        file: StorageFile(name: 'Plan.md', path: 'p', isDirectory: false),
      ),
    );
    await t.enterText(find.byKey(const ValueKey('share_password')), 'secreto');
    await tap(t, 'share_create');
    expect(find.text('Operación no disponible'), findsOneWidget);
    expect(
      t
          .widget<TextField>(find.byKey(const ValueKey('share_password')))
          .controller!
          .text,
      'secreto',
    );
    expect(f.shares, isEmpty);
  });
  for (final dark in [false, true]) {
    testWidgets('documentos y compartidos a 360dp/1.5x $dark', (t) async {
      final f = Fixture();
      await mount(
        t,
        f,
        const DocumentScreen(noteId: 'n', title: 'Nota', content: rich),
        dark: dark,
        scale: 1.5,
      );
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
      await mount(
        t,
        f,
        const FileSharesScreen(
          workId: 'w',
          file: StorageFile(
            name: 'Archivo largo de planificación.md',
            path: 'p',
            isDirectory: false,
          ),
        ),
        dark: dark,
        scale: 1.5,
      );
      await tap(t, 'share_internal');
      expect(t.takeException(), isNull);
    });
  }
  test('multipart upload mantiene progreso y cancelación', () async {
    final dir = await Directory.systemTemp.createTemp('upload-test');
    final file = await File(
      '${dir.path}/img.png',
    ).writeAsBytes([137, 80, 78, 71]);
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    RequestOptions? request;
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) {
          request = r;
          h.resolve(
            Response(
              requestOptions: r,
              data: {'id': 'attachment-id'},
              statusCode: 201,
            ),
          );
        },
      ),
    );
    final repo = FilesRepository(
      ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio),
    );
    final cancel = CancelToken();
    try {
      final src = await repo.upload(
        'w',
        file.openRead,
        await file.length(),
        'img.png',
        'opaque-folder',
        cancel,
        (_, _) {},
        attachment: true,
      );
      expect(src, '/api/attachments/attachment-id');
      expect(request!.cancelToken, same(cancel));
      expect(request!.onSendProgress, isNotNull);
      expect((request!.data as FormData).fields.single.value, 'opaque-folder');
    } finally {
      await dir.delete(recursive: true);
    }
  });
  test('storage errors conservan código de capacidades', () async {
    final f = Fixture()..fail = true;
    await expectLater(
      FilesRepository(f.api).share('w', 'p'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.code,
          'code',
          'STORAGE_OP_NOT_SUPPORTED',
        ),
      ),
    );
  });
}
