import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/data/models/reminder.dart';

void main() {
  Map<String, dynamic> json(Object? scope) => {
    'reminderId': 'r1',
    'date': '2026-10-12T00:00:00.000Z',
    'title': 'Revisar',
    'scope': ?scope,
  };

  test('la ocurrencia conserva el alcance del recordatorio', () {
    expect(
      ReminderOccurrence.fromJson(json('INDIVIDUAL')).scope,
      ReminderScope.individual,
    );
    expect(
      ReminderOccurrence.fromJson(json('GROUP')).scope,
      ReminderScope.group,
    );
    expect(
      ReminderOccurrence.fromJson(json('GLOBAL')).scope,
      ReminderScope.global,
    );
  });

  test('sin alcance en la respuesta se asume individual', () {
    expect(
      ReminderOccurrence.fromJson(json(null)).scope,
      ReminderScope.individual,
    );
  });
}
