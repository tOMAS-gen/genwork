import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/util/format.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('es'));
  final now = DateTime(2026, 10, 28, 12);

  test('formatAgo dice el tiempo transcurrido corto', () {
    expect(formatAgo(now, now: now), 'recién');
    expect(
      formatAgo(now.subtract(const Duration(minutes: 5)), now: now),
      'hace 5 min',
    );
    expect(
      formatAgo(now.subtract(const Duration(hours: 2)), now: now),
      'hace 2 h',
    );
    expect(
      formatAgo(now.subtract(const Duration(days: 3)), now: now),
      'hace 3 d',
    );
    expect(formatAgo(DateTime(2026, 10, 12, 12), now: now), '12 oct');
  });
}
