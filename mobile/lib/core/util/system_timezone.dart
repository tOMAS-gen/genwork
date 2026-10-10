import 'package:timezone/data/latest_all.dart' as data;
import 'package:timezone/timezone.dart' as tz;

/// Fechas-día como medianoche UTC: representan un día calendario, no un instante.
class SystemTimezone {
  SystemTimezone(String name) : location = _location(name);

  final tz.Location location;
  String get name => location.name;
  static bool _initialized = false;

  static tz.Location _location(String name) {
    if (!_initialized) {
      data.initializeTimeZones();
      _initialized = true;
    }
    return tz.getLocation(name);
  }

  DateTime today(DateTime instant) {
    final local = tz.TZDateTime.from(instant, location);
    return DateTime.utc(local.year, local.month, local.day);
  }
}
