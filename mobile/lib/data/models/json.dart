/// Helpers de parseo para el JSON de la API (fechas ISO-8601 UTC, listas, nulos).
typedef Json = Map<String, dynamic>;

DateTime? parseDate(Object? value) =>
    value is String ? DateTime.tryParse(value)?.toLocal() : null;

/// Fechas-día de recordatorios: llegan como medianoche UTC y se leen como día
/// calendario, sin pasar a hora local (si no, en UTC-3 serían el día anterior).
DateTime? parseDay(Object? value) {
  if (value is! String) return null;
  final utc = DateTime.tryParse(value)?.toUtc();
  return utc == null ? null : DateTime(utc.year, utc.month, utc.day);
}

List<T> parseList<T>(Object? value, T Function(Json json) parse) =>
    value is List ? value.whereType<Map>().map((e) => parse(Json.from(e))).toList() : <T>[];

Json? asJson(Object? value) => value is Map ? Json.from(value) : null;

int asInt(Object? value, [int fallback = 0]) => value is num ? value.toInt() : fallback;
