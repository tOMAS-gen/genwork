import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:genwork_mobile/core/auth/pkce.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/theme_preference.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/repositories/settings_repository.dart';
import 'package:genwork_mobile/data/repositories/catalogs_repository.dart';
import 'package:genwork_mobile/features/settings/settings_screen.dart';
import 'package:genwork_mobile/features/settings/catalog_settings_screen.dart';
import 'package:genwork_mobile/features/settings/storage_settings.dart';

typedef Json = Map<String, dynamic>;

class Fixture {
  Fixture({this.admin = true}) {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (r, h) async {
          requests.add(r);
          if (r.method != 'GET' && gate != null) await gate!.future;
          if (fail ||
              (conflict &&
                  r.method == 'DELETE' &&
                  r.path.contains('/labels/') &&
                  r.queryParameters['confirm'] != 'true')) {
            final status = conflict ? 409 : 503;
            h.reject(
              DioException(
                requestOptions: r,
                response: Response(
                  requestOptions: r,
                  statusCode: status,
                  data: {
                    'error': {
                      'code': conflict ? 'CONFLICT' : 'UNAVAILABLE',
                      'message': conflict
                          ? 'Esta etiqueta está en uso en 2 proyectos'
                          : 'No se pudo guardar',
                      if (conflict) 'affectedWorks': 2,
                    },
                  },
                ),
                type: DioExceptionType.badResponse,
              ),
            );
            return;
          }
          h.resolve(
            Response(requestOptions: r, statusCode: 200, data: respond(r)),
          );
        },
      ),
    );
    api = ApiClient(
      baseUrl: Uri.parse('https://test.invalid'),
      token: 'fake-mobile-token',
      dio: dio,
    );
  }
  final bool admin;
  bool fail = false, conflict = false, canWrite = true, linked = false;
  String errorStatus = 'PENDING';
  Completer<void>? gate;
  final requests = <RequestOptions>[];
  late final ApiClient api;
  late ProviderContainer container;
  Iterable<RequestOptions> get writes =>
      requests.where((r) => r.method != 'GET');
  Object? respond(RequestOptions r) {
    if (r.path.endsWith('/integrations/start')) {
      return {
        'flowId': 'flow',
        'url': 'https://accounts.google.com/o/oauth2/v2/auth?state=opaque',
      };
    }
    if (r.path.endsWith('/nextcloud/start')) {
      return {
        'loginUrl': 'https://cloud.test/login',
        'pollToken': 'poll-secret',
      };
    }
    if (r.path.endsWith('/nextcloud/poll')) {
      return {'status': linked ? 'LINKED' : 'PENDING'};
    }
    if (r.path.endsWith('/google/folders')) {
      final id = r.queryParameters['parent'];
      return {
        'path': [
          {'id': 'root', 'name': 'Mi unidad'},
          if (id != null) {'id': id, 'name': 'Equipo'},
        ],
        'folders': [
          if (id == null) {'id': 'folder', 'name': 'Equipo'},
        ],
      };
    }
    if (r.method != 'GET') {
      if (r.path == '/api/admin/errors/e') {
        errorStatus = (r.data as Map)['status'];
      }
      if (r.path == '/api/me/mcp-connections' && r.method == 'POST') {
        return {'id': 'new', 'label': 'Prueba', 'token': 'fake-once-token'};
      }
      return {};
    }
    switch (r.path) {
      case '/api/system-info':
        return {
          'version': '1.0.0',
          'environment': 'development',
          'storage': {'provider': 'NEXTCLOUD', 'configured': true},
        };
      case '/api/auth/storage-link/status':
        return {'provider': 'NEXTCLOUD', 'linked': false};
      case '/api/admin/access':
        return {'mode': 'LIST', 'domain': null};
      case '/api/admin/access/emails':
        return ['permitido@test.local'];
      case '/api/admin/users':
        return [
          {
            'id': 'me',
            'name': 'Admin',
            'email': 'admin@test',
            'globalRole': 'SUPERADMIN',
            'readerGrants': [],
          },
          {
            'id': 'u',
            'name': 'Lector',
            'email': 'lector@test',
            'globalRole': 'READER',
            'readerGrants': [
              {'groupId': 'g1'},
            ],
          },
        ];
      case '/api/admin/clients':
        return [
          {
            'id': 'c',
            'name': 'Cliente',
            'email': 'cliente@test',
            'works': [
              {'id': 'w', 'name': 'Proyecto'},
            ],
          },
        ];
      case '/api/admin/storage':
        return {
          'provider': 'NEXTCLOUD',
          'url': 'https://cloud.test',
          'adminUser': 'admin',
        };
      case '/api/admin/storage/jobs':
        return [
          {
            'id': 'j',
            'kind': 'CREATE_WORK_FOLDER',
            'status': 'FAILED',
            'attempts': 2,
            'lastError': 'No hay conexión',
          },
        ];
      case '/api/admin/reminders':
        return {
          'timezone': 'America/Argentina/Mendoza',
          'emailConnected': true,
          'emailFrom': 'admin@test',
        };
      case '/api/admin/errors':
        return [
          {
            'id': 'e',
            'message': 'Error histórico con una traza larga. ' * 40,
            'route': '/api/works',
            'status': errorStatus,
            'occurrences': 2,
            'lastSeenAt': '2026-10-09T12:00:00Z',
          },
        ];
      case '/api/admin/errors/e':
        return {
          'id': 'e',
          'message': 'Error de prueba',
          'status': errorStatus,
          'occurrences': 2,
          'context': {'workId': 'w'},
          'stack': 'Traza de prueba',
        };
      case '/api/me/mcp-connections':
        return {
          'connections': [
            {'id': 'conn', 'label': 'Asistente', 'revokedAt': null},
          ],
        };
      case '/api/me/mcp-connections/activity':
        return {
          'entries': [
            {
              'id': 'a',
              'summary': 'Creó una tarea',
              'toolName': 'create_task',
              'createdAt': '2026-10-09',
            },
          ],
        };
      case '/api/groups':
        return [
          {
            'id': 'g1',
            'name': 'Administrado',
            'memberships': [
              {'userId': 'me', 'role': 'ADMIN'},
            ],
          },
          {
            'id': 'g2',
            'name': 'Solo miembro',
            'memberships': [
              {'userId': 'me', 'role': 'MEMBER'},
            ],
          },
        ];
      case '/api/works':
        return [
          {'id': 'w', 'name': 'Proyecto'},
        ];
      case '/api/sectors':
        return [
          {'id': 's', 'name': 'Diseño'},
        ];
      case '/api/labels':
        return [
          {
            'id': 'global',
            'name': 'Etiqueta global',
            'scope': 'global',
            'values': [],
          },
          {
            'id': 'local',
            'name': 'Etiqueta local',
            'scope': r.queryParameters['groupId'] == null
                ? 'personal'
                : 'group',
            'values': [
              {'id': 'v', 'name': 'Azul', 'color': '#3b5bfa'},
            ],
          },
        ];
      case '/api/stages':
        return [
          {'id': 'st1', 'name': 'Inicio', 'color': '#3b5bfa', 'sortOrder': 0},
          {'id': 'st2', 'name': 'Cierre', 'color': '#10b981', 'sortOrder': 1},
        ];
      case '/api/task-statuses':
        return {
          'canWrite': canWrite,
          'inherited': r.queryParameters['sectorId'] != null,
          'statuses': [
            {
              'id': 'ts1',
              'name': 'Pendiente',
              'color': '#64748b',
              'type': 'IN_PROGRESS',
              'sortOrder': 0,
            },
            {
              'id': 'ts2',
              'name': 'Hecha',
              'color': '#10b981',
              'type': 'FINAL',
              'sortOrder': 1,
            },
          ],
        };
      default:
        return {};
    }
  }
}

Future<void> mount(
  WidgetTester t,
  Fixture f,
  Widget child, {
  bool compact = false,
  bool dark = false,
  Future<String> Function(String)? browser,
  Future<bool> Function(Uri)? externalBrowser,
}) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  t.view.physicalSize = Size(compact ? 360 : 900, compact ? 800 : 1600);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  f.container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      apiClientProvider.overrideWithValue(f.api),
      sharedPreferencesProvider.overrideWithValue(prefs),
      currentUserProvider.overrideWithValue(
        AppUser.fromJson({
          'id': 'me',
          'name': 'Usuario',
          'email': 'u@test',
          'globalRole': f.admin ? 'SUPERADMIN' : 'MEMBER',
        }),
      ),
      if (externalBrowser != null)
        externalBrowserProvider.overrideWithValue(externalBrowser),
      if (browser != null)
        integrationBrowserProvider.overrideWithValue(browser),
    ],
  );
  addTearDown(f.container.dispose);
  await t.pumpWidget(
    UncontrolledProviderScope(
      container: f.container,
      child: MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(compact ? 1.5 : 1)),
          child: child!,
        ),
        home: child,
      ),
    ),
  );
  await t.pumpAndSettle();
}

Future<void> visible(WidgetTester t, String key) async {
  final finder = find.byKey(ValueKey(key));
  if (finder.evaluate().isEmpty) {
    await t.scrollUntilVisible(
      finder,
      350,
      scrollable: find.byType(Scrollable).last,
      maxScrolls: 30,
    );
  }
  await t.ensureVisible(finder);
  await t.pumpAndSettle();
}

Future<void> tap(WidgetTester t, String key) async {
  await visible(t, key);
  await t.tap(find.byKey(ValueKey(key)));
  await t.pumpAndSettle();
}

Future<void> enter(WidgetTester t, String key, String value) async {
  await visible(t, key);
  await t.enterText(find.byKey(ValueKey(key)), value);
  await t.pumpAndSettle();
}

Future<void> select(WidgetTester t, String key, String label) async {
  await tap(t, key);
  await t.tap(find.text(label).last);
  await t.pumpAndSettle();
}

void main() {
  testWidgets(
    'CFG-02 tema persistido y restaurado, opciones admin ocultas a miembro',
    (t) async {
      final f = Fixture(admin: false);
      await mount(t, f, const SettingsHomeScreen());
      expect(find.byKey(const ValueKey('settings_access')), findsNothing);
      expect(find.byKey(const ValueKey('settings_theme')), findsOneWidget);
      await tap(t, 'theme_dark');
      expect(f.container.read(themePreferenceProvider), ThemeMode.dark);
      final prefs = f.container.read(sharedPreferencesProvider);
      expect(prefs.getString('themeMode'), 'dark');
      final next = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(next.dispose);
      expect(next.read(themePreferenceProvider), ThemeMode.dark);
    },
  );
  testWidgets(
    'ADM-01 URL directa de administrador no consulta datos para miembro',
    (t) async {
      final f = Fixture(admin: false);
      await mount(t, f, const SettingsScreen(section: SettingsSection.users));
      expect(f.requests, isEmpty);
      expect(find.textContaining('requiere permiso'), findsOneWidget);
    },
  );
  testWidgets('ADM-01 acceso valida dominio y guarda modo explícito', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const SettingsScreen(section: SettingsSection.access));
    await tap(t, 'settings_edit_access');
    await select(t, 'settings_field_mode', 'Dominio');
    await tap(t, 'settings_form_save');
    expect(f.writes, isEmpty);
    await enter(t, 'settings_field_domain', 'empresa.test');
    await tap(t, 'settings_form_save');
    expect(f.writes.single.method, 'PUT');
    expect(f.writes.single.data, {'mode': 'DOMAIN', 'domain': 'empresa.test'});
  });
  testWidgets(
    'ADM-01 quitar correo requiere confirmación y usa cuerpo DELETE',
    (t) async {
      final f = Fixture();
      await mount(t, f, const SettingsScreen(section: SettingsSection.emails));
      await tap(t, 'settings_remove_email_permitido@test.local');
      await tap(t, 'settings_confirm_cancel');
      expect(f.writes, isEmpty);
      await tap(t, 'settings_remove_email_permitido@test.local');
      await tap(t, 'settings_confirm_accept');
      expect(f.writes.single.data, {'email': 'permitido@test.local'});
    },
  );
  testWidgets(
    'ADM-02 no cambia superadmin y permisos de lector son por ID de grupo',
    (t) async {
      final f = Fixture();
      await mount(t, f, const SettingsScreen(section: SettingsSection.users));
      expect(find.byKey(const ValueKey('settings_role_me')), findsNothing);
      await tap(t, 'settings_grants_u');
      await tap(t, 'settings_reader_g2');
      expect(f.writes.single.data, {
        'userId': 'u',
        'groupId': 'g2',
        'enabled': true,
      });
    },
  );
  testWidgets('ADM-02 alta cliente envía proyectos elegidos', (t) async {
    final f = Fixture();
    await mount(t, f, const SettingsScreen(section: SettingsSection.clients));
    await tap(t, 'settings_add_client');
    await enter(t, 'settings_client_name', 'Nuevo cliente');
    await enter(t, 'settings_client_email', 'cliente@empresa.test');
    await tap(t, 'settings_client_work_w');
    await tap(t, 'settings_client_save');
    expect(f.writes.single.data, {
      'name': 'Nuevo cliente',
      'email': 'cliente@empresa.test',
      'workIds': ['w'],
    });
  });
  testWidgets('ADM-03 miembro edita personal pero no etiquetas globales', (
    t,
  ) async {
    final f = Fixture(admin: false);
    await mount(t, f, const CatalogSettingsScreen(kind: CatalogKind.labels));
    expect(find.byKey(const ValueKey('catalog_edit_global')), findsNothing);
    expect(find.byKey(const ValueKey('catalog_edit_local')), findsOneWidget);
    await select(t, 'catalog_scope', 'Grupo: Solo miembro');
    expect(find.byKey(const ValueKey('catalog_add')), findsNothing);
    expect(find.byKey(const ValueKey('catalog_edit_local')), findsNothing);
    await select(t, 'catalog_scope', 'Grupo: Administrado');
    await tap(t, 'catalog_add');
    await enter(t, 'settings_field_name', 'Campaña');
    await tap(t, 'settings_form_save');
    expect(f.writes.single.data, {'groupId': 'g1', 'name': 'Campaña'});
  });
  testWidgets('ADM-03 color visual y error de guardado conservan el borrador', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const CatalogSettingsScreen(kind: CatalogKind.labels));
    await tap(t, 'catalog_add_value_local');
    await enter(t, 'settings_field_name', 'Prioritario');
    await tap(t, 'color_#ef4444');
    f.fail = true;
    await tap(t, 'settings_form_save');
    expect(find.text('Prioritario'), findsOneWidget);
    f.fail = false;
    await tap(t, 'settings_form_save');
    expect(f.writes.last.data, {
      'keyId': 'local',
      'name': 'Prioritario',
      'color': '#ef4444',
    });
  });
  testWidgets('ADM-03 borrar etiqueta en uso exige segunda confirmación', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const CatalogSettingsScreen(kind: CatalogKind.labels));
    f.conflict = true;
    await tap(t, 'catalog_delete_local');
    await t.tap(find.byKey(const ValueKey('settings_confirm_accept')));
    await t.pump();
    await t.pump(const Duration(milliseconds: 400));
    expect(f.writes.length, 1);
    expect(find.text('Elemento en uso'), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('settings_confirm_accept')));
    await t.pumpAndSettle();
    expect(f.writes.last.queryParameters['confirm'], 'true');
  });
  testWidgets('ADM-03 reordenar etapas envía IDs de todo el conjunto', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const CatalogSettingsScreen(kind: CatalogKind.stages));
    await tap(t, 'catalog_down_st1');
    expect(f.writes.single.path, '/api/stages/reorder');
    expect(f.writes.single.data, {
      'ids': ['st2', 'st1'],
    });
  });
  testWidgets(
    'ADM-03 estados respetan canWrite y las ediciones de sector incluyen asSectorId',
    (t) async {
      final f = Fixture();
      f.canWrite = false;
      await mount(
        t,
        f,
        const CatalogSettingsScreen(kind: CatalogKind.statuses),
      );
      expect(find.byKey(const ValueKey('catalog_add')), findsNothing);
      f.canWrite = true;
      await select(t, 'catalog_scope', 'Sector: Diseño');
      await tap(t, 'catalog_edit_ts1');
      await enter(t, 'settings_field_name', 'En marcha');
      await tap(t, 'settings_form_save');
      expect(f.writes.single.data['asSectorId'], 's');
      expect(f.writes.single.data['name'], 'En marcha');
    },
  );
  testWidgets('ADM-04 editar Nextcloud omite contraseña vacía', (t) async {
    final f = Fixture();
    await mount(t, f, const SettingsScreen(section: SettingsSection.storage));
    await tap(t, 'settings_edit_storage');
    await enter(t, 'settings_field_adminUser', 'nuevo');
    await tap(t, 'settings_form_save');
    expect((f.writes.single.data as Map).containsKey('adminPassword'), false);
    expect(f.writes.single.data['url'], 'https://cloud.test');
  });
  testWidgets('ADM-05 desconectar Gmail es explícito y no modifica zona', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const SettingsScreen(section: SettingsSection.reminders));
    await tap(t, 'settings_disconnect_gmail');
    expect(f.writes, isEmpty);
    await tap(t, 'settings_confirm_accept');
    expect(f.writes.single.data, {'disconnectEmail': true});
  });
  testWidgets('ADM-06 resolver/reabrir refresca detalle y datos de error', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const SettingsErrorScreen(id: 'e'));
    expect(find.textContaining('workId'), findsOneWidget);
    await tap(t, 'settings_error_toggle');
    expect(f.writes.last.data, {'status': 'RESOLVED'});
    await tap(t, 'settings_error_toggle');
    expect(f.writes.last.data, {'status': 'PENDING'});
  });
  testWidgets('ADM-07 conexión muestra clave una vez y revocación confirmada', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f, const SettingsScreen(section: SettingsSection.mcp));
    await tap(t, 'settings_add_mcp');
    await enter(t, 'settings_field_label', 'Asistente nuevo');
    await tap(t, 'settings_form_save');
    expect(find.text('fake-once-token'), findsOneWidget);
    await tap(t, 'settings_mcp_done');
    expect(find.text('fake-once-token'), findsNothing);
    await tap(t, 'settings_revoke_mcp_conn');
    await tap(t, 'settings_confirm_accept');
    expect(f.writes.last.path, '/api/me/mcp-connections/conn');
    expect(f.writes.last.method, 'DELETE');
  });
  testWidgets('OAuth móvil usa PKCE y no pasa Bearer al navegador', (t) async {
    final f = Fixture();
    String? browserUrl;
    int changes = 0;
    await mount(
      t,
      f,
      Scaffold(
        body: GoogleIntegrationButton(
          purpose: 'drive',
          label: 'Conectar',
          onChanged: () => changes++,
        ),
      ),
      browser: (url) async {
        browserUrl = url;
        return 'genwork://integration?flowId=flow';
      },
    );
    await tap(t, 'settings_google_drive');
    expect(browserUrl, isNot(contains('fake-mobile-token')));
    final start = f.writes.first.data as Map;
    final finish = f.writes.last.data as Map;
    expect(start['codeChallenge'], Pkce.challengeFor(finish['codeVerifier']));
    expect(changes, 1);
  });
  testWidgets('OAuth cancelado no confirma y libera el flujo', (t) async {
    final f = Fixture();
    await mount(
      t,
      f,
      Scaffold(
        body: GoogleIntegrationButton(
          purpose: 'gmail',
          label: 'Conectar',
          onChanged: () {},
        ),
      ),
      browser: (_) async => throw PlatformException(code: 'CANCELED'),
    );
    await tap(t, 'settings_google_gmail');
    expect(f.writes.where((r) => r.path.endsWith('/finish')), isEmpty);
    expect(f.writes.last.path, endsWith('/cancel'));
  });
  testWidgets('OAuth callback de otro flujo se rechaza', (t) async {
    final f = Fixture();
    await mount(
      t,
      f,
      Scaffold(
        body: GoogleIntegrationButton(
          purpose: 'gmail',
          label: 'Conectar',
          onChanged: () {},
        ),
      ),
      browser: (_) async => 'genwork://integration?flowId=otro',
    );
    await tap(t, 'settings_google_gmail');
    expect(f.writes.where((r) => r.path.endsWith('/finish')), isEmpty);
    expect(find.textContaining('no coincide'), findsOneWidget);
  });

  testWidgets(
    'Nextcloud cancela el sondeo sin compartir el token en el navegador',
    (t) async {
      final f = Fixture();
      Uri? opened;
      await mount(
        t,
        f,
        Scaffold(
          body: StorageAccountPanel(
            status: const {'provider': 'NEXTCLOUD', 'linked': false},
            onChanged: () {},
          ),
        ),
        externalBrowser: (url) async {
          opened = url;
          return true;
        },
      );
      await tap(t, 'settings_link_nextcloud');
      expect(opened.toString(), 'https://cloud.test/login');
      final polls = f.requests.where((r) => r.path.endsWith('/poll')).length;
      expect(polls, 1);
      await tap(t, 'settings_cancel_link');
      await t.pump(const Duration(seconds: 10));
      expect(f.requests.where((r) => r.path.endsWith('/poll')).length, polls);
    },
  );
  testWidgets('Nextcloud conectado detiene el sondeo y refresca la cuenta', (
    t,
  ) async {
    final f = Fixture()..linked = true;
    var refreshed = 0;
    await mount(
      t,
      f,
      Scaffold(
        body: StorageAccountPanel(
          status: const {'provider': 'NEXTCLOUD', 'linked': false},
          onChanged: () {
            refreshed++;
          },
        ),
      ),
      externalBrowser: (_) async => true,
    );
    await tap(t, 'settings_link_nextcloud');
    await t.pump(const Duration(seconds: 10));
    expect(refreshed, 1);
    expect(f.requests.where((r) => r.path.endsWith('/poll')).length, 1);
    expect(find.byKey(const ValueKey('settings_cancel_link')), findsNothing);
  });
  testWidgets('Drive navega carpetas por ID y conserva la unidad compartida', (
    t,
  ) async {
    final f = Fixture();
    String? selected;
    await mount(
      t,
      f,
      Scaffold(
        body: Builder(
          builder: (context) => FilledButton(
            onPressed: () async {
              selected = await showDialog<String>(
                context: context,
                builder: (_) =>
                    const DriveFolderDialog(sharedDriveId: 'shared'),
              );
            },
            child: const Text('Abrir'),
          ),
        ),
      ),
    );
    await t.tap(find.text('Abrir'));
    await t.pumpAndSettle();
    await tap(t, 'settings_drive_child_folder');
    expect(f.requests.last.queryParameters, {
      'parent': 'folder',
      'sharedDriveId': 'shared',
    });
    await tap(t, 'settings_drive_pick');
    expect(selected, 'folder');
  });
  for (final dark in [false, true]) {
    testWidgets('CFG/ADM pantallas 360dp texto 150%, oscuro=$dark', (t) async {
      for (final child in [
        const SettingsHomeScreen(),
        for (final s in SettingsSection.values) SettingsScreen(section: s),
        for (final k in CatalogKind.values) CatalogSettingsScreen(kind: k),
        const SettingsErrorScreen(id: 'e'),
      ]) {
        final f = Fixture();
        await mount(t, f, child, compact: true, dark: dark);
        expect(t.takeException(), isNull, reason: '${child.runtimeType}');
        await t.pumpWidget(const SizedBox.shrink());
        await t.pumpAndSettle();
      }
    });
  }
}
