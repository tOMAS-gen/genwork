import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/features/reminders/reminder_form_screen.dart';
import 'package:genwork_mobile/features/reminders/reminder_calendar.dart';
import 'package:genwork_mobile/features/reminders/reminders_providers.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'daily_parity_test.dart' show ApiHarness;

typedef Json = Map<String, dynamic>;
Json reminder({String type = 'WEEKLY'}) => {
  'id': 'r',
  'title': 'Control semanal',
  'scope': 'GROUP',
  'groupId': 'g',
  'date': '2026-10-09T00:00:00Z',
  'recurrenceType': type,
  'weekdays': [0, 2, 4],
  'everyN': 3,
  'everyUnit': 'MONTH',
  'untilDate': '2027-10-09T00:00:00Z',
  'maxOccurrences': 10,
  'linkType': 'TASK',
  'linkId': 't',
  'leads': [
    {'daysBefore': 0, 'minuteOfDay': 540},
    {'daysBefore': 7, 'minuteOfDay': 1080},
  ],
};

class Fixture {
  Fixture({this.existing, this.canMutate = true, this.admin = false}) {
    api = ApiHarness((r) {
      if (r.path.endsWith('/timezone')) {
        return {'timezone': 'America/Argentina/Mendoza'};
      }
      if (r.path == '/api/reminders/r' && r.method == 'GET') {
        return {'reminder': existing, 'canMutate': canMutate};
      }
      if (r.path == '/api/groups') {
        return [
          {
            'id': 'g',
            'name': 'Mi grupo',
            'memberships': [
              {'userId': 'me', 'role': 'MEMBER'},
            ],
          },
          {
            'id': 'public',
            'name': 'Público ajeno',
            'publicRead': true,
            'memberships': [],
          },
        ];
      }
      if (r.path == '/api/works') {
        return [
          {'id': 'w', 'name': 'Proyecto A'},
        ];
      }
      if (r.path == '/api/sectors') {
        return [
          {'id': 's', 'name': 'Sector A'},
        ];
      }
      if (r.method != 'GET') {
        if (failSave) throw StateError('Sin conexión');
        return {};
      }
      return {'reminders': [], 'occurrences': []};
    });
    container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        apiClientProvider.overrideWithValue(api.api),
        currentUserProvider.overrideWithValue(
          AppUser.fromJson({
            'id': 'me',
            'name': 'Ana',
            'email': 'a@test',
            'globalRole': admin ? 'SUPERADMIN' : 'MEMBER',
          }),
        ),
        reminderClockProvider.overrideWithValue(
          () => DateTime.parse('2026-10-09T01:00:00Z'),
        ),
      ],
    );
  }
  final Json? existing;
  final bool canMutate, admin;
  bool failSave = false;
  late final ApiHarness api;
  late final ProviderContainer container;
  Iterable<Json> get writes => api.requests
      .where((r) => r.method == 'POST' || r.method == 'PATCH')
      .map((r) => Json.from(r.data as Map));
}

Future<void> mount(
  WidgetTester t,
  Fixture f, {
  Widget? child,
  bool dark = false,
  bool compact = false,
}) async {
  t.view.physicalSize = Size(compact ? 360 : 900, compact ? 800 : 1600);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
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
        home:
            child ??
            ReminderFormScreen(reminderId: f.existing == null ? null : 'r'),
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
      400,
      scrollable: find.byType(Scrollable).first,
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

Future<void> select(WidgetTester t, String key, String label) async {
  await tap(t, key);
  await t.tap(find.text(label).last);
  await t.pumpAndSettle();
}

Future<void> enter(WidgetTester t, String key, String text) async {
  await visible(t, key);
  await t.enterText(find.byKey(ValueKey(key)), text);
  await t.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));
  testWidgets(
    'REC-02/03 edición conserva alcance, vínculo a tarea, avisos y ambos límites',
    (t) async {
      final f = Fixture(existing: reminder());
      await mount(t, f);
      await enter(t, 'reminder_title', 'Título editado');
      await tap(t, 'reminder_save');
      final body = f.writes.single;
      expect(body['scope'], 'GROUP');
      expect(body['groupId'], 'g');
      expect(body['weekdays'], [0, 2, 4]);
      expect(body['linkType'], 'TASK');
      expect(body['linkId'], 't');
      expect(body['leads'], reminder()['leads']);
      expect(body['maxOccurrences'], 10);
      expect(body['untilDate'], '2027-10-09T00:00:00.000Z');
      expect(body['everyN'], isNull);
      expect(t.takeException(), isNull);
    },
  );
  testWidgets('REC-03 crea cada N, final por cantidad y varios avisos', (
    t,
  ) async {
    final f = Fixture();
    await mount(t, f);
    await enter(t, 'reminder_title', 'Revisión trimestral');
    await tap(t, 'reminder_add_lead');
    await enter(t, 'reminder_lead_days_1', '7');
    await select(t, 'reminder_recurrence', 'Cada N días, semanas o meses');
    await enter(t, 'reminder_every_n', '3');
    await select(t, 'reminder_every_unit', 'Meses');
    await select(t, 'reminder_end', 'Después de N repeticiones');
    await enter(t, 'reminder_count', '12');
    await tap(t, 'reminder_save');
    final b = f.writes.single;
    expect(b['everyN'], 3);
    expect(b['everyUnit'], 'MONTH');
    expect(b['maxOccurrences'], 12);
    expect(b['untilDate'], isNull);
    expect(b['date'], '2026-10-08T00:00:00.000Z');
    expect((b['leads'] as List).length, 2);
  });
  testWidgets(
    'REC-03 duplicados y límites inválidos no se envían; fallo conserva borrador',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      await enter(t, 'reminder_title', 'Borrador');
      await tap(t, 'reminder_add_lead');
      await enter(t, 'reminder_lead_days_1', '0');
      await tap(t, 'reminder_save');
      expect(f.writes, isEmpty);
      expect(find.textContaining('Hay avisos repetidos'), findsOneWidget);
      await enter(t, 'reminder_lead_days_1', '3651');
      await tap(t, 'reminder_save');
      expect(f.writes, isEmpty);
      await enter(t, 'reminder_lead_days_1', '2');
      await select(t, 'reminder_recurrence', 'Cada N días, semanas o meses');
      await enter(t, 'reminder_every_n', '0');
      await tap(t, 'reminder_save');
      expect(f.writes, isEmpty);
      await enter(t, 'reminder_every_n', '2');
      f.failSave = true;
      await tap(t, 'reminder_save');
      expect(f.writes.length, 1);
      await visible(t, 'reminder_title');
      expect(find.text('Borrador'), findsOneWidget);
      f.failSave = false;
      await tap(t, 'reminder_save');
      expect(f.writes.length, 2);
    },
  );
  testWidgets(
    'REC-02 miembro elige solo sus grupos, no global, y vincula proyecto',
    (t) async {
      final f = Fixture();
      await mount(t, f);
      await enter(t, 'reminder_title', 'Equipo');
      await tap(t, 'reminder_scope');
      expect(find.text('Global'), findsNothing);
      await t.tap(find.text('Grupo').last);
      await t.pumpAndSettle();
      await tap(t, 'reminder_group');
      expect(find.text('Público ajeno'), findsNothing);
      await t.tap(find.text('Mi grupo').last);
      await t.pumpAndSettle();
      await select(t, 'reminder_link_type', 'Proyecto');
      await select(t, 'reminder_link_work', 'Proyecto A');
      await tap(t, 'reminder_save');
      final b = f.writes.single;
      expect(b['scope'], 'GROUP');
      expect(b['groupId'], 'g');
      expect(b['linkType'], 'WORK');
      expect(b['linkId'], 'w');
    },
  );
  testWidgets('REC-02 superadmin crea global vinculado a sector', (t) async {
    final f = Fixture(admin: true);
    await mount(t, f);
    await enter(t, 'reminder_title', 'General');
    await select(t, 'reminder_scope', 'Global');
    await select(t, 'reminder_link_type', 'Sector');
    await select(t, 'reminder_link_sector', 'Sector A');
    await tap(t, 'reminder_save');
    final b = f.writes.single;
    expect(b['scope'], 'GLOBAL');
    expect(b['groupId'], isNull);
    expect(b['linkId'], 's');
  });
  testWidgets('REC-02 solo lectura y alcance inmutable en edición', (t) async {
    final f = Fixture(existing: reminder(), canMutate: false);
    await mount(t, f);
    expect(find.byKey(const ValueKey('reminder_save')), findsNothing);
    expect(find.byKey(const ValueKey('reminder_delete')), findsNothing);
    expect(
      t.widget<TextField>(find.byKey(const ValueKey('reminder_title'))).enabled,
      false,
    );
    await visible(t, 'reminder_scope');
    expect(
      t
          .widget<DropdownButtonFormField<String>>(
            find.byKey(const ValueKey('reminder_scope')),
          )
          .onChanged,
      isNull,
    );
    expect(f.writes, isEmpty);
  });
  testWidgets('REC-03 semanal permite varios días y rechaza ninguno', (
    t,
  ) async {
    final f = Fixture(
      existing: {
        ...reminder(),
        'weekdays': [0],
        'untilDate': null,
        'maxOccurrences': null,
      },
    );
    await mount(t, f);
    await tap(t, 'reminder_weekday_0');
    await tap(t, 'reminder_save');
    expect(f.writes, isEmpty);
    await tap(t, 'reminder_weekday_1');
    await tap(t, 'reminder_weekday_4');
    await tap(t, 'reminder_save');
    expect(f.writes.single['weekdays'], [1, 4]);
  });
  testWidgets(
    'REC-03 quitar repetición limpia parámetros y quitar vínculo es explícito',
    (t) async {
      final f = Fixture(existing: reminder(type: 'EVERY_N'));
      await mount(t, f);
      await select(t, 'reminder_recurrence', 'Una vez');
      await select(t, 'reminder_link_type', 'Sin vínculo');
      await tap(t, 'reminder_save');
      final b = f.writes.single;
      for (final key in [
        'everyN',
        'everyUnit',
        'untilDate',
        'maxOccurrences',
        'linkType',
        'linkId',
      ]) {
        expect(b[key], isNull, reason: key);
      }
      expect(b['weekdays'], isEmpty);
    },
  );
  testWidgets('REC-03 borrar exige confirmación', (t) async {
    final f = Fixture(existing: reminder());
    await mount(t, f);
    await tap(t, 'reminder_delete');
    await t.tap(find.text('Cancelar'));
    await t.pumpAndSettle();
    expect(f.api.requests.where((r) => r.method == 'DELETE'), isEmpty);
    await tap(t, 'reminder_delete');
    await t.tap(find.text('Borrar'));
    await t.pumpAndSettle();
    expect(f.api.requests.where((r) => r.method == 'DELETE').length, 1);
  });
  testWidgets(
    'REC-03 salida protege cambios sin guardar y permite descartarlos',
    (t) async {
      final f = Fixture();
      await mount(
        t,
        f,
        child: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const ReminderFormScreen(),
                ),
              ),
              child: const Text('Abrir'),
            ),
          ),
        ),
      );
      await t.tap(find.text('Abrir'));
      await t.pumpAndSettle();
      await enter(t, 'reminder_title', 'Sin guardar');
      await t.tap(find.byType(BackButton));
      await t.pumpAndSettle();
      expect(find.text('¿Descartar cambios?'), findsOneWidget);
      await t.tap(find.text('Cancelar'));
      await t.pumpAndSettle();
      expect(find.text('Sin guardar'), findsOneWidget);
      await t.tap(find.byType(BackButton));
      await t.pumpAndSettle();
      await t.tap(find.text('Descartar'));
      await t.pumpAndSettle();
      expect(find.text('Abrir'), findsOneWidget);
      expect(f.writes, isEmpty);
    },
  );
  testWidgets(
    'REC-03 fecha de fin anterior y cantidad cero bloquean guardado',
    (t) async {
      final f = Fixture(
        existing: {
          ...reminder(),
          'untilDate': '2026-10-08T00:00:00Z',
          'maxOccurrences': null,
        },
      );
      await mount(t, f);
      await tap(t, 'reminder_save');
      expect(f.writes, isEmpty);
      await select(t, 'reminder_end', 'Después de N repeticiones');
      await enter(t, 'reminder_count', '0');
      await tap(t, 'reminder_save');
      expect(f.writes, isEmpty);
      await enter(t, 'reminder_count', '5');
      await tap(t, 'reminder_save');
      expect(f.writes.single['untilDate'], isNull);
      expect(f.writes.single['maxOccurrences'], 5);
    },
  );
  test('REC-01 consulta febrero bisiesto completo', () async {
    final f = Fixture();
    addTearDown(f.container.dispose);
    await f.container.read(
      monthRemindersProvider(DateTime.utc(2032, 2)).future,
    );
    expect(
      f.api.requests.last.queryParameters['to'],
      '2032-02-29T00:00:00.000Z',
    );
  });
  for (final dark in [false, true]) {
    testWidgets(
      'REC-01 calendario navega fuera de 60 días a 360dp/150%, dark=$dark',
      (t) async {
        final f = Fixture();
        await mount(
          t,
          f,
          compact: true,
          dark: dark,
          child: Scaffold(
            body: SingleChildScrollView(
              child: ReminderCalendar(today: DateTime.utc(2026, 12, 31)),
            ),
          ),
        );
        for (var i = 0; i < 3; i++) {
          await tap(t, 'reminders_next_month');
        }
        expect(find.text('Marzo 2027'), findsOneWidget);
        final q = f.api.requests.last.queryParameters;
        expect(q['from'], '2027-03-01T00:00:00.000Z');
        expect(q['to'], '2027-03-31T00:00:00.000Z');
        await tap(t, 'reminders_previous_month');
        expect(
          f.api.requests.last.queryParameters['to'],
          '2027-02-28T00:00:00.000Z',
        );
        await tap(t, 'reminders_today');
        expect(find.text('Diciembre 2026'), findsOneWidget);
        expect(t.takeException(), isNull);
      },
    );
    testWidgets('REC-03 formulario avanzado completo 360dp/150%, dark=$dark', (
      t,
    ) async {
      final f = Fixture(existing: reminder(type: 'EVERY_N'));
      await mount(t, f, compact: true, dark: dark);
      await visible(t, 'reminder_link_type');
      expect(t.takeException(), isNull);
    });
  }
}
