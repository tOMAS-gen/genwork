import 'json.dart';

enum ReminderScope { individual, group, global }

enum RecurrenceType { once, daily, weekly, monthly, yearly, everyN }

ReminderScope _scope(Object? v) => switch (v) {
      'GROUP' => ReminderScope.group,
      'GLOBAL' => ReminderScope.global,
      _ => ReminderScope.individual,
    };

RecurrenceType _recurrence(Object? v) => switch (v) {
      'DAILY' => RecurrenceType.daily,
      'WEEKLY' => RecurrenceType.weekly,
      'MONTHLY' => RecurrenceType.monthly,
      'YEARLY' => RecurrenceType.yearly,
      'EVERY_N' => RecurrenceType.everyN,
      _ => RecurrenceType.once,
    };

/// Aviso de un recordatorio: `daysBefore` días antes, a `minuteOfDay` (hora del sistema).
class ReminderLead {
  const ReminderLead({required this.daysBefore, required this.minuteOfDay});

  final int daysBefore;
  final int minuteOfDay;

  factory ReminderLead.fromJson(Json json) =>
      ReminderLead(daysBefore: asInt(json['daysBefore']), minuteOfDay: asInt(json['minuteOfDay']));

  Json toJson() => {'daysBefore': daysBefore, 'minuteOfDay': minuteOfDay};
}

class Reminder {
  const Reminder({
    required this.id,
    required this.title,
    required this.scope,
    required this.date,
    required this.recurrence,
    required this.leads,
    this.description,
    this.groupId,
    this.weekdays = const [],
    this.everyN,
    this.everyUnit,
    this.untilDate,
    this.maxOccurrences,
    this.linkType,
    this.linkId,
  });

  final String id;
  final String title;
  final String? description;
  final ReminderScope scope;
  final String? groupId;

  /// Día calendario (sin hora).
  final DateTime date;
  final RecurrenceType recurrence;

  /// 0 = lunes … 6 = domingo (solo semanal).
  final List<int> weekdays;
  final int? everyN;
  final String? everyUnit;
  final DateTime? untilDate;
  final int? maxOccurrences;
  final String? linkType;
  final String? linkId;
  final List<ReminderLead> leads;

  factory Reminder.fromJson(Json json) => Reminder(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String?,
        scope: _scope(json['scope']),
        groupId: json['groupId'] as String?,
        date: parseDay(json['date']) ?? DateTime.now(),
        recurrence: _recurrence(json['recurrenceType']),
        weekdays: (json['weekdays'] as List?)?.whereType<num>().map((e) => e.toInt()).toList() ?? const [],
        everyN: json['everyN'] as int?,
        everyUnit: json['everyUnit'] as String?,
        untilDate: parseDay(json['untilDate']),
        maxOccurrences: json['maxOccurrences'] as int?,
        linkType: json['linkType'] as String?,
        linkId: json['linkId'] as String?,
        leads: parseList(json['leads'], ReminderLead.fromJson),
      );
}

/// Ocurrencia calculada en un rango (`occurrences` de `GET /api/reminders?from&to`).
class ReminderOccurrence {
  const ReminderOccurrence({required this.reminderId, required this.date, required this.title});

  final String reminderId;
  final DateTime date;
  final String title;

  factory ReminderOccurrence.fromJson(Json json) => ReminderOccurrence(
        reminderId: json['reminderId'] as String,
        date: parseDay(json['date']) ?? DateTime.now(),
        title: json['title'] as String? ?? '',
      );
}

/// Notificación disparada pendiente (`GET /api/reminders/deliveries`).
class ReminderDelivery {
  const ReminderDelivery({
    required this.id,
    required this.title,
    required this.occurrenceDate,
    required this.firedAt,
    this.description,
    this.linkType,
    this.linkPath,
    this.linkLabel,
    this.linkAvailable = false,
  });

  final String id;
  final String title;
  final String? description;
  final DateTime occurrenceDate;
  final DateTime firedAt;
  final String? linkType;

  /// Ruta web (ej. `/works/<id>`); la app la traduce a su propia ruta.
  final String? linkPath;
  final String? linkLabel;
  final bool linkAvailable;

  factory ReminderDelivery.fromJson(Json json) => ReminderDelivery(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String?,
        occurrenceDate: parseDay(json['occurrenceDate']) ?? DateTime.now(),
        firedAt: parseDate(json['firedAt']) ?? DateTime.now(),
        linkType: json['linkType'] as String?,
        linkPath: json['linkPath'] as String?,
        linkLabel: json['linkLabel'] as String?,
        linkAvailable: json['linkAvailable'] == true,
      );
}
