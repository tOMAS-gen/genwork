import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// `#rrggbb` → [Color]. Color neutro si no parsea.
Color colorFromHex(String? hex, {Color fallback = const Color(0xFF94A3B8)}) {
  if (hex == null) return fallback;
  final value = hex.replaceFirst('#', '');
  if (value.length != 6) return fallback;
  final parsed = int.tryParse(value, radix: 16);
  return parsed == null ? fallback : Color(0xFF000000 | parsed);
}

/// "hoy", "mañana", "ayer" o "12 oct" (con año si no es el actual).
String formatDay(DateTime date, {DateTime? now}) {
  final reference = now ?? DateTime.now();
  final today = DateTime.utc(reference.year, reference.month, reference.day);
  final day = DateTime.utc(date.year, date.month, date.day);
  final diff = day.difference(today).inDays;
  if (diff == 0) return 'hoy';
  if (diff == 1) return 'mañana';
  if (diff == -1) return 'ayer';
  final pattern = day.year == today.year ? 'd MMM' : 'd MMM y';
  return DateFormat(pattern, 'es').format(day);
}

/// "1 proyecto", "3 proyectos".
String countLabel(int n, String singular, String plural) =>
    '$n ${n == 1 ? singular : plural}';

/// Minuto del día (0–1439) → "09:30".
String formatMinuteOfDay(int minute) =>
    '${(minute ~/ 60).toString().padLeft(2, '0')}:${(minute % 60).toString().padLeft(2, '0')}';

String formatDateTime(DateTime date) =>
    DateFormat('d MMM y · HH:mm', 'es').format(date.toLocal());
