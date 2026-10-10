import '../../core/network/api_client.dart';
import '../models/json.dart';
import '../models/reminder.dart';

class RemindersPage {
  const RemindersPage({required this.reminders, required this.occurrences});

  final List<Reminder> reminders;
  final List<ReminderOccurrence> occurrences;
}

/// Datos para crear/editar un recordatorio (PATCH reemplaza todo).
class ReminderInput {
  const ReminderInput({
    required this.title,
    required this.date,
    this.description,
    this.scope = 'INDIVIDUAL',
    this.groupId,
    this.recurrenceType = 'ONCE',
    this.weekdays = const [],
    this.everyN,
    this.everyUnit,
    this.untilDate,
    this.maxOccurrences,
    this.linkType,
    this.linkId,
    this.leads = const [ReminderLead(daysBefore: 0, minuteOfDay: 9 * 60)],
  });

  final String title;
  final String? description;
  final String scope;
  final String? groupId;

  /// Día calendario; se manda como medianoche UTC de ese día.
  final DateTime date;
  final String recurrenceType;
  final List<int> weekdays;
  final int? everyN;
  final String? everyUnit;
  final DateTime? untilDate;
  final int? maxOccurrences;
  final String? linkType;
  final String? linkId;
  final List<ReminderLead> leads;

  Json toJson() => {
    'title': title,
    'description': description,
    'scope': scope,
    'groupId': groupId,
    'date': _day(date),
    'recurrenceType': recurrenceType,
    'weekdays': weekdays,
    'everyN': everyN,
    'everyUnit': everyUnit,
    'untilDate': untilDate == null ? null : _day(untilDate!),
    'maxOccurrences': maxOccurrences,
    'linkType': linkType,
    'linkId': linkId,
    'leads': leads.map((l) => l.toJson()).toList(),
  };

  static String _day(DateTime d) =>
      DateTime.utc(d.year, d.month, d.day).toIso8601String();
}

class RemindersRepository {
  RemindersRepository(this._api);

  final ApiClient _api;

  Future<String> timezone() async {
    final json = await _api.get<Json>('/api/reminders/timezone');
    return json['timezone'] as String;
  }

  /// Recordatorios visibles y sus ocurrencias en [from]–[to] (días inclusive).
  Future<RemindersPage> list({
    required DateTime from,
    required DateTime to,
  }) async {
    final json = await _api.get<Json>(
      '/api/reminders',
      query: {
        'from': DateTime.utc(from.year, from.month, from.day).toIso8601String(),
        'to': DateTime.utc(to.year, to.month, to.day).toIso8601String(),
      },
    );
    return RemindersPage(
      reminders: parseList(json['reminders'], Reminder.fromJson),
      occurrences: parseList(json['occurrences'], ReminderOccurrence.fromJson),
    );
  }

  Future<(Reminder, bool)> get(String id) async {
    final json = await _api.get<Json>('/api/reminders/$id');
    return (
      Reminder.fromJson(Json.from(json['reminder'] as Map)),
      json['canMutate'] == true,
    );
  }

  Future<void> create(ReminderInput input) =>
      _api.post<Object?>('/api/reminders', body: input.toJson());

  Future<void> update(String id, ReminderInput input) =>
      _api.patch<Object?>('/api/reminders/$id', body: input.toJson());

  Future<void> delete(String id) => _api.delete<Object?>('/api/reminders/$id');

  /// Notificaciones disparadas pendientes (campanita).
  Future<List<ReminderDelivery>> deliveries() async => parseList(
    (await _api.get<Json>('/api/reminders/deliveries'))['deliveries'],
    ReminderDelivery.fromJson,
  );

  Future<void> dismiss(String deliveryId) => _api.patch<Object?>(
    '/api/reminders/deliveries/$deliveryId',
    body: {'action': 'DISMISS'},
  );

  /// [preset]: `1h` o `tomorrow` (09:00 del día siguiente).
  Future<void> snooze(String deliveryId, String preset) => _api.patch<Object?>(
    '/api/reminders/deliveries/$deliveryId',
    body: {'action': 'SNOOZE', 'preset': preset},
  );
}
